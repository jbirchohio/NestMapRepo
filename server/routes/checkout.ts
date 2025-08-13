import { Router } from 'express';
import { requireAuth } from '../middleware/jwtAuth';
import { logger } from '../utils/logger';
import { storage } from '../storage';
import { db } from '../db-connection';
import { users, templatePurchases, templates, promoCodes, promoCodeUses } from '@shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import Stripe from 'stripe';
import { paymentRateLimit } from '../middleware/rateLimiting';
import { auditService } from '../services/auditService';
import { paymentIdempotency } from '../middleware/idempotency';

const router = Router();

// Initialize Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  logger.error('STRIPE_SECRET_KEY is not configured in environment variables');
}
const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' as any })
  : null;

// POST /api/checkout/create-payment-intent - Create a payment intent for template purchase
router.post('/create-payment-intent', requireAuth, paymentRateLimit, paymentIdempotency, async (req, res) => {
  try {
    logger.info('Payment intent creation requested', {
      hasStripe: !!stripe,
      hasKey: !!process.env.STRIPE_SECRET_KEY
    });

    if (!stripe) {
      logger.error('Stripe not initialized - missing STRIPE_SECRET_KEY');
      return res.status(503).json({
        message: 'Payment processing is not configured. Please contact support.'
      });
    }

    const { template_id, start_date, end_date } = req.body;
    const userId = req.user!.id;

    if (!template_id) {
      return res.status(400).json({ message: 'Template ID is required' });
    }

    // Get template details
    const template = await storage.getTemplate(template_id);
    if (!template || template.status !== 'published') {
      return res.status(404).json({ message: 'Template not found or not available' });
    }

    // Check if already purchased
    const alreadyPurchased = await storage.hasUserPurchasedTemplate(userId, template_id);

    // Also check what templates this user has purchased
    const userPurchases = await db.select({
      template_id: templatePurchases.template_id,
      status: templatePurchases.status
    })
    .from(templatePurchases)
    .where(eq(templatePurchases.buyer_id, userId));

    if (alreadyPurchased) {
      return res.status(400).json({ message: 'You have already purchased this template' });
    }
    // Get user details for receipt
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId));

    // Create payment intent
    const amount = Math.round(parseFloat(template.price || '0') * 100); // Convert to cents

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: template.currency?.toLowerCase() || 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        templateId: template_id.toString(),
        templateTitle: template.title,
        buyerId: userId.toString(),
        buyerEmail: user.email,
        sellerId: template.user_id.toString(),
      },
      description: `Purchase of template: ${template.title}`,
    });

    logger.info(`Payment intent created for template ${template_id} by user ${userId}`);

    res.json({
      clientSecret: paymentIntent.client_secret,
      amount,
      currency: template.currency || 'USD',
      templateTitle: template.title,
    });
  } catch (error) {
    logger.error('Error creating payment intent:', error);
    res.status(500).json({ message: 'Failed to create payment intent' });
  }
});

// POST /api/checkout/confirm-purchase - Confirm the purchase after payment
router.post('/confirm-purchase', requireAuth, paymentRateLimit, paymentIdempotency, async (req, res) => {
  try {
    const { payment_intent_id, template_id, start_date, end_date, is_free_purchase, promo_code_id, discount_amount } = req.body;
    const userId = req.user!.id;

    if (!template_id) {
      return res.status(400).json({ message: 'Template ID is required' });
    }

    // Handle free purchases (100% discount)
    if (is_free_purchase) {
      // Get template details
      const template = await storage.getTemplate(template_id);
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }

      // Create purchase record with $0
      const [purchase] = await db.insert(templatePurchases)
        .values({
          template_id: template_id,
          buyer_id: userId,
          seller_id: template.user_id,
          price: '0.00',
          platform_fee: '0.00',
          seller_earnings: '0.00',
          stripe_fee: '0.00',
          stripe_payment_intent_id: null,
          stripe_payment_id: null,
          status: 'completed',
          payout_status: 'not_applicable',
        })
        .returning();

      // Record promo code usage if applicable
      if (promo_code_id) {
        await db.insert(promoCodeUses).values({
          promo_code_id,
          user_id: userId,
          template_purchase_id: purchase.id,
          discount_applied: discount_amount?.toString() || template.price,
        });

        // Increment promo code usage count
        await db.update(promoCodes)
          .set({ used_count: sql`${promoCodes.used_count} + 1` })
          .where(eq(promoCodes.id, promo_code_id));
      }

      // Update template sales count
      await db.update(templates)
        .set({ 
          sales_count: sql`COALESCE(${templates.sales_count}, 0) + 1`
        })
        .where(eq(templates.id, template_id));

      // Create trip from template
      const { templateCopyService } = await import('../services/templateCopyService');
      const tripId = await templateCopyService.copyTemplateToTrip(
        template_id,
        userId,
        start_date ? new Date(start_date) : undefined,
        end_date ? new Date(end_date) : undefined
      );

      // Update purchase with trip ID
      await db.update(templatePurchases)
        .set({ trip_id: tripId })
        .where(eq(templatePurchases.id, purchase.id));

      logger.info(`Free purchase completed for template ${template_id} by user ${userId}`);

      return res.json({
        message: 'Free template acquired successfully',
        purchaseId: purchase.id,
        tripId
      });
    }

    // Regular paid purchase flow
    if (!stripe) {
      return res.status(503).json({
        message: 'Payment processing is not configured'
      });
    }

    if (!payment_intent_id) {
      return res.status(400).json({ message: 'Payment intent ID is required for paid purchases' });
    }

    // Verify payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment not completed' });
    }

    // Verify the payment is for this template and user
    if (paymentIntent.metadata.templateId !== template_id.toString() ||
        paymentIntent.metadata.buyerId !== userId.toString()) {
      logger.warn('Payment metadata mismatch', {
        expected: { templateId: template_id.toString(), buyerId: userId.toString() },
        received: { templateId: paymentIntent.metadata.templateId, buyerId: paymentIntent.metadata.buyerId }
      });
      return res.status(403).json({ message: 'Payment verification failed' });
    }

    // Get template details
    const template = await storage.getTemplate(template_id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Check if already processed
    const existingPurchase = await db.select()
      .from(templatePurchases)
      .where(
        and(
          eq(templatePurchases.stripe_payment_intent_id, payment_intent_id),
          eq(templatePurchases.status, 'completed')
        )
      )
      .limit(1);

    if (existingPurchase.length > 0) {
      logger.info(`Purchase already exists for payment intent ${payment_intent_id}`);

      // If trip wasn't created yet, try to create it now
      const { templateCopyService } = await import('../services/templateCopyService');
      let tripId = existingPurchase[0].trip_id;

      if (!tripId) {
        try {
          tripId = await templateCopyService.copyTemplateToTrip(
            template_id,
            userId,
            start_date ? new Date(start_date) : undefined,
            end_date ? new Date(end_date) : undefined
          );
          logger.info(`Created missing trip ${tripId} for existing purchase ${existingPurchase[0].id}`);
        } catch (error) {
          logger.error('Failed to create trip for existing purchase:', error);
        }
      }

      return res.json({
        message: 'Purchase already processed',
        purchaseId: existingPurchase[0].id,
        tripId
      });
    }

    // Calculate fees - Industry standard: deduct Stripe fees first
    const grossPrice = parseFloat(template.price || '0');
    // Stripe fees: 2.9% + $0.30 per transaction
    const stripeFee = (grossPrice * 0.029) + 0.30;
    const netRevenue = grossPrice - stripeFee;

    // Split net revenue: 70% to creator, 30% to platform
    const sellerEarnings = netRevenue * 0.70;
    const platformFee = netRevenue * 0.30;

    // Create purchase record
    const [purchase] = await db.insert(templatePurchases)
      .values({
        template_id: template_id,
        buyer_id: userId,
        seller_id: template.user_id,
        price: grossPrice.toFixed(2),
        platform_fee: platformFee.toFixed(2),
        seller_earnings: sellerEarnings.toFixed(2),
        stripe_fee: stripeFee.toFixed(2),
        stripe_payment_intent_id: payment_intent_id,
        stripe_payment_id: paymentIntent.id,
        status: 'completed',
        payout_status: 'pending',
      })
      .returning();

    // Update template sales count
    await db.update(templates)
      .set({ sales_count: sql`COALESCE(sales_count, 0) + 1` })
      .where(eq(templates.id, template_id));

    // Update creator's total sales
    await db.update(users)
      .set({
        total_template_sales: sql`COALESCE(total_template_sales, 0) + 1`,
      })
      .where(eq(users.id, template.user_id));

    // Copy template to user's trips with the selected dates (using transactional version)
    const { templateCopyServiceV2 } = await import('../services/templateCopyServiceV2');
    const newTripId = await templateCopyServiceV2.copyTemplateToTrip(
      template_id,
      userId,
      start_date ? new Date(start_date) : undefined,
      end_date ? new Date(end_date) : undefined
    );

    logger.info(`Template ${template_id} purchased by user ${userId}, copied to trip ${newTripId}`);

    // Audit log the purchase
    await auditService.logTemplateEvent('template.purchased', template_id, userId, {
      price: grossPrice,
      sellerId: template.user_id,
      purchaseId: purchase.id,
      tripId: newTripId
    });

    res.json({
      message: 'Purchase completed successfully',
      purchaseId: purchase.id,
      tripId: newTripId,
    });
  } catch (error) {
    logger.error('Error confirming purchase:', error);
    res.status(500).json({ message: 'Failed to confirm purchase' });
  }
});

export default router;