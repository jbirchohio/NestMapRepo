import { Router } from 'express';
import { requireAuth } from '../middleware/jwtAuth';
import { logger } from '../utils/logger';
import { storage } from '../storage';
import { db } from '../db-connection';
import { users, templatePurchases, templates } from '@shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
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

    const { template_id, start_date, end_date } = req.body;
    const userId = req.user!.id;

    console.log('Create payment intent - template_id from request:', template_id, 'type:', typeof template_id);
    console.log('User ID:', userId);
    console.log('Travel dates:', start_date, 'to', end_date);

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
    
    console.log(`User ${userId} has purchased these templates:`, userPurchases);
    console.log(`Currently trying to purchase template ${template_id}`);
    
    if (alreadyPurchased) {
      console.log(`User ${userId} already purchased template ${template_id}`);
      return res.status(400).json({ message: 'You have already purchased this template' });
    }
    console.log(`User ${userId} has not purchased template ${template_id} - proceeding with payment`);

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
router.post('/confirm-purchase', requireAuth, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ 
        message: 'Payment processing is not configured' 
      });
    }

    const { payment_intent_id, template_id, start_date, end_date } = req.body;
    const userId = req.user!.id;
    
    console.log('Confirm purchase - template_id:', template_id, 'payment_intent_id:', payment_intent_id, 'userId:', userId);
    console.log('Travel dates:', start_date, 'to', end_date);

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
      return res.json({
        message: 'Purchase already processed',
        purchaseId: existingPurchase[0].id,
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

    // Copy template to user's trips with the selected dates
    const { templateCopyService } = await import('../services/templateCopyService');
    const newTripId = await templateCopyService.copyTemplateToTrip(
      template_id, 
      userId,
      start_date ? new Date(start_date) : undefined,
      end_date ? new Date(end_date) : undefined
    );

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