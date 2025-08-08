import { Router } from 'express';
import { requireAuth } from '../middleware/jwtAuth';
import { logger } from '../utils/logger';
import { storage } from '../storage';
import Stripe from 'stripe';

const router = Router();

// Initialize Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  logger.error('STRIPE_SECRET_KEY is not configured in environment variables');
}
const stripe = stripeKey 
  ? new Stripe(stripeKey, { apiVersion: '2023-10-16' })
  : null;

// POST /api/checkout/create-payment-intent - Create a payment intent for template purchase
router.post('/create-payment-intent', requireAuth, async (req, res) => {
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

    const { template_id } = req.body;
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
    if (alreadyPurchased) {
      return res.status(400).json({ message: 'You have already purchased this template' });
    }

    // Get user details for receipt
    const [user] = await storage.db.select()
      .from(storage.users)
      .where(storage.eq(storage.users.id, userId));

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
router.post('/confirm-purchase', requireAuth, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ 
        message: 'Payment processing is not configured' 
      });
    }

    const { payment_intent_id, template_id } = req.body;
    const userId = req.user!.id;

    if (!payment_intent_id || !template_id) {
      return res.status(400).json({ message: 'Payment intent ID and template ID are required' });
    }

    // Verify payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment not completed' });
    }

    // Verify the payment is for this template and user
    if (paymentIntent.metadata.templateId !== template_id.toString() ||
        paymentIntent.metadata.buyerId !== userId.toString()) {
      return res.status(403).json({ message: 'Payment verification failed' });
    }

    // Get template details
    const template = await storage.getTemplate(template_id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Check if already processed
    const existingPurchase = await storage.db.select()
      .from(storage.templatePurchases)
      .where(
        storage.and(
          storage.eq(storage.templatePurchases.stripe_payment_intent_id, payment_intent_id),
          storage.eq(storage.templatePurchases.status, 'completed')
        )
      )
      .limit(1);

    if (existingPurchase.length > 0) {
      return res.json({
        message: 'Purchase already processed',
        purchaseId: existingPurchase[0].id,
      });
    }

    // Calculate fees
    const price = parseFloat(template.price || '0');
    const platformFee = price * 0.30; // 30% platform fee
    const sellerEarnings = price - platformFee;

    // Create purchase record
    const [purchase] = await storage.db.insert(storage.templatePurchases)
      .values({
        template_id: template_id,
        buyer_id: userId,
        seller_id: template.user_id,
        price: price.toFixed(2),
        platform_fee: platformFee.toFixed(2),
        seller_earnings: sellerEarnings.toFixed(2),
        stripe_payment_intent_id: payment_intent_id,
        stripe_payment_id: paymentIntent.id,
        status: 'completed',
        payout_status: 'pending',
      })
      .returning();

    // Update template sales count
    await storage.incrementTemplateSales(template_id);

    // Update creator's total sales
    await storage.db.update(storage.users)
      .set({
        total_template_sales: storage.sql`COALESCE(total_template_sales, 0) + 1`,
      })
      .where(storage.eq(storage.users.id, template.user_id));

    // Copy template to user's trips
    const { templateCopyService } = await import('../services/templateCopyService');
    const newTripId = await templateCopyService.copyTemplateToTrip(template_id, userId);

    logger.info(`Template ${template_id} purchased by user ${userId}, copied to trip ${newTripId}`);

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