import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { logger } from '../utils/logger';
import { db } from '../db-connection';
import { templatePurchases, templates, users, creatorBalances } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { storage } from '../storage';
import { webhookRateLimit } from '../middleware/rateLimiting';
import { auditService } from '../services/auditService';

const router = Router();

// Initialize Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeKey) {
  logger.error('STRIPE_SECRET_KEY is not configured');
}

if (!webhookSecret) {
  logger.warn('STRIPE_WEBHOOK_SECRET is not configured - webhooks will not be verified');
}

const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: '2023-10-16' })
  : null;

// Webhook endpoint - NOTE: This must NOT use JSON body parser middleware
router.post('/stripe', webhookRateLimit, async (req: Request, res: Response) => {
  if (!stripe) {
    logger.error('Stripe webhook received but Stripe not initialized');
    return res.status(503).send('Stripe not configured');
  }

  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    // ENFORCE webhook signature verification in production
    if (!webhookSecret && process.env.NODE_ENV === 'production') {
      logger.error('Webhook rejected - no webhook secret configured in production');
      return res.status(503).send('Webhook verification is required in production');
    }

    if (webhookSecret) {
      // Raw body is required for signature verification
      const rawBody = (req as any).rawBody || req.body;
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      // Only allow unsigned webhooks in development
      if (process.env.NODE_ENV !== 'development') {
        logger.error('Webhook signature verification bypassed in non-development environment');
        return res.status(403).send('Webhook signature verification required');
      }
      event = req.body as Stripe.Event;
      logger.warn('Processing webhook without signature verification - DEVELOPMENT ONLY');
    }
  } catch (err: any) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Log the event
  logger.info(`Stripe webhook received: ${event.type}`, {
    eventId: event.id,
    type: event.type
  });

  try {
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;

      default:
        logger.info(`Unhandled webhook event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error(`Error processing webhook ${event.type}:`, error);
    res.status(500).send('Webhook processing failed');
  }
});

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { metadata } = paymentIntent;

  if (!metadata.templateId || !metadata.buyerId || !metadata.sellerId) {
    logger.warn('Payment intent missing required metadata', { paymentIntentId: paymentIntent.id });
    return;
  }

  const templateId = parseInt(metadata.templateId);
  const buyerId = parseInt(metadata.buyerId);
  const sellerId = parseInt(metadata.sellerId);

  logger.info(`Processing successful payment for template ${templateId}`, {
    buyerId,
    sellerId,
    amount: paymentIntent.amount
  });

  // Check if purchase already exists
  const existingPurchase = await db.select()
    .from(templatePurchases)
    .where(
      and(
        eq(templatePurchases.stripe_payment_intent_id, paymentIntent.id),
        eq(templatePurchases.status, 'completed')
      )
    )
    .limit(1);

  if (existingPurchase.length > 0) {
    logger.info(`Purchase already processed for payment intent ${paymentIntent.id}`);
    return;
  }

  // Get template details
  const template = await storage.getTemplate(templateId);
  if (!template) {
    logger.error(`Template ${templateId} not found for payment intent ${paymentIntent.id}`);
    return;
  }

  // Calculate fees
  const grossPrice = paymentIntent.amount / 100; // Convert from cents
  const stripeFee = (grossPrice * 0.029) + 0.30;
  const netRevenue = grossPrice - stripeFee;
  const sellerEarnings = netRevenue * 0.70;
  const platformFee = netRevenue * 0.30;

  // Create purchase record
  const [purchase] = await db.insert(templatePurchases)
    .values({
      template_id: templateId,
      buyer_id: buyerId,
      seller_id: sellerId,
      price: grossPrice.toFixed(2),
      platform_fee: platformFee.toFixed(2),
      seller_earnings: sellerEarnings.toFixed(2),
      stripe_fee: stripeFee.toFixed(2),
      stripe_payment_intent_id: paymentIntent.id,
      stripe_payment_id: paymentIntent.id,
      status: 'completed',
      payout_status: 'pending',
    })
    .returning();

  // Update template sales count
  await db.update(templates)
    .set({
      sales_count: sql`COALESCE(sales_count, 0) + 1`,
      last_sale_at: new Date()
    })
    .where(eq(templates.id, templateId));

  // Update seller's total sales and balance
  await db.update(users)
    .set({
      total_template_sales: sql`COALESCE(total_template_sales, 0) + 1`,
      total_template_revenue: sql`COALESCE(total_template_revenue, 0) + ${sellerEarnings}`,
    })
    .where(eq(users.id, sellerId));

  // Update or create creator balance
  const [existingBalance] = await db.select()
    .from(creatorBalances)
    .where(eq(creatorBalances.user_id, sellerId))
    .limit(1);

  if (existingBalance) {
    await db.update(creatorBalances)
      .set({
        available_balance: sql`available_balance + ${sellerEarnings}`,
        total_earned: sql`total_earned + ${sellerEarnings}`,
        updated_at: new Date()
      })
      .where(eq(creatorBalances.user_id, sellerId));
  } else {
    await db.insert(creatorBalances)
      .values({
        user_id: sellerId,
        available_balance: sellerEarnings.toString(),
        pending_balance: '0',
        total_earned: sellerEarnings.toString(),
        total_withdrawn: '0',
        currency: 'USD'
      });
  }

  // Copy template to buyer's trips (without dates - user will set them)
  try {
    const { templateCopyService } = await import('../services/templateCopyService');
    const newTripId = await templateCopyService.copyTemplateToTrip(templateId, buyerId);

    logger.info(`Template ${templateId} copied to trip ${newTripId} for buyer ${buyerId}`);
  } catch (error) {
    logger.error(`Failed to copy template to trip for buyer ${buyerId}:`, error);
    // Don't fail the webhook - purchase is still valid
  }

  logger.info(`Purchase ${purchase.id} created successfully via webhook`);

  // Audit log the successful payment
  await auditService.logPaymentEvent('payment.completed', paymentIntent.id, buyerId, {
    templateId,
    sellerId,
    amount: grossPrice,
    purchaseId: purchase.id
  });
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { metadata } = paymentIntent;

  logger.warn(`Payment failed for template ${metadata.templateId}`, {
    buyerId: metadata.buyerId,
    error: paymentIntent.last_payment_error?.message
  });

  // Could send email notification to buyer about failed payment
  // For now, just log it
}

/**
 * Handle charge refund
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  if (!charge.payment_intent) {
    logger.warn('Refunded charge missing payment intent', { chargeId: charge.id });
    return;
  }

  const paymentIntentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent.id;

  // Find the purchase
  const [purchase] = await db.select()
    .from(templatePurchases)
    .where(eq(templatePurchases.stripe_payment_intent_id, paymentIntentId))
    .limit(1);

  if (!purchase) {
    logger.warn(`No purchase found for refunded payment intent ${paymentIntentId}`);
    return;
  }

  // Update purchase status
  await db.update(templatePurchases)
    .set({
      status: 'refunded',
      refunded_at: new Date(),
      refund_amount: (charge.amount_refunded / 100).toFixed(2)
    })
    .where(eq(templatePurchases.id, purchase.id));

  // Decrease template sales count
  await db.update(templates)
    .set({
      sales_count: sql`GREATEST(COALESCE(sales_count, 0) - 1, 0)`
    })
    .where(eq(templates.id, purchase.template_id));

  // REVOKE ACCESS: Delete or mark the trip created from this template
  try {
    // Find trips created from this purchase
    const { trips } = await import('@shared/schema');
    const tripsToRevoke = await db.select()
      .from(trips)
      .where(and(
        eq(trips.user_id, purchase.buyer_id),
        eq(trips.source_template_id, purchase.template_id),
        // Only delete trips created around the purchase time (within 1 hour)
        sql`created_at BETWEEN ${purchase.purchased_at} - INTERVAL '1 hour' AND ${purchase.purchased_at} + INTERVAL '1 hour'`
      ));

    if (tripsToRevoke.length > 0) {
      // Option 1: Soft delete (mark as revoked)
      await db.update(trips)
        .set({
          status: 'revoked',
          revoked_reason: 'Template purchase refunded',
          revoked_at: new Date()
        })
        .where(eq(trips.id, tripsToRevoke[0].id));

      logger.info(`Revoked access to trip ${tripsToRevoke[0].id} due to refund`);
    }
  } catch (error) {
    logger.error('Failed to revoke trip access after refund:', error);
  }

  // Adjust seller's balance
  const sellerEarnings = parseFloat(purchase.seller_earnings || '0');

  await db.update(creatorBalances)
    .set({
      available_balance: sql`GREATEST(available_balance - ${sellerEarnings}, 0)`,
      updated_at: new Date()
    })
    .where(eq(creatorBalances.user_id, purchase.seller_id));

  // Adjust seller's total sales
  await db.update(users)
    .set({
      total_template_sales: sql`GREATEST(COALESCE(total_template_sales, 0) - 1, 0)`,
      total_template_revenue: sql`GREATEST(COALESCE(total_template_revenue, 0) - ${sellerEarnings}, 0)`,
    })
    .where(eq(users.id, purchase.seller_id));

  logger.info(`Refund processed for purchase ${purchase.id}`);
}

/**
 * Handle dispute creation
 */
async function handleDisputeCreated(dispute: Stripe.Dispute) {
  const paymentIntentId = dispute.payment_intent as string;

  // Find the purchase
  const [purchase] = await db.select()
    .from(templatePurchases)
    .where(eq(templatePurchases.stripe_payment_intent_id, paymentIntentId))
    .limit(1);

  if (!purchase) {
    logger.warn(`No purchase found for disputed payment intent ${paymentIntentId}`);
    return;
  }

  // Update purchase status
  await db.update(templatePurchases)
    .set({
      status: 'disputed',
      disputed_at: new Date()
    })
    .where(eq(templatePurchases.id, purchase.id));

  // Put seller earnings on hold
  await db.update(creatorBalances)
    .set({
      pending_balance: sql`pending_balance + ${purchase.seller_earnings}`,
      available_balance: sql`GREATEST(available_balance - ${purchase.seller_earnings}, 0)`,
      updated_at: new Date()
    })
    .where(eq(creatorBalances.user_id, purchase.seller_id));

  // FREEZE ACCESS: Mark the trip as under review
  try {
    const { trips } = await import('@shared/schema');
    const tripsToFreeze = await db.select()
      .from(trips)
      .where(and(
        eq(trips.user_id, purchase.buyer_id),
        eq(trips.source_template_id, purchase.template_id),
        sql`created_at BETWEEN ${purchase.purchased_at} - INTERVAL '1 hour' AND ${purchase.purchased_at} + INTERVAL '1 hour'`
      ));

    if (tripsToFreeze.length > 0) {
      await db.update(trips)
        .set({
          status: 'frozen',
          frozen_reason: 'Template purchase disputed',
          frozen_at: new Date()
        })
        .where(eq(trips.id, tripsToFreeze[0].id));

      logger.info(`Froze access to trip ${tripsToFreeze[0].id} due to dispute`);
    }
  } catch (error) {
    logger.error('Failed to freeze trip access after dispute:', error);
  }

  logger.warn(`Dispute created for purchase ${purchase.id}`, {
    reason: dispute.reason,
    amount: dispute.amount
  });

  // TODO: Send notification to admin and seller about the dispute
}

export default router;