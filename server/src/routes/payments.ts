import { Router, type Request, type Response, type NextFunction } from 'express';
import type Stripe from 'stripe';
import { db } from '../db/db';
import { stripe } from '../stripe';
import { invoices } from '../db/invoiceSchema';
import { billingEvents } from '../db/superadminSchema';
import { eq } from 'drizzle-orm';
import nodemailer from 'nodemailer';
import { authenticate as authenticateJWT } from '../middleware/secureAuth';
import type { AuthenticatedRequest as AuthRequest } from '../src/types/auth-user';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext';
import { logger } from '../utils/logger.js';
import type { Invoice } from '../db/db';

const router = Router();

// Apply middleware to all routes
router.use(authenticateJWT);
router.use(injectOrganizationContext);
router.use(validateOrganizationAccess);

// Type definitions for payment session
type PaymentSession = Stripe.Checkout.Session & {
  payment_intent?: string | Stripe.PaymentIntent;
  customer_details?: {
    name?: string;
    email?: string;
  };
  invoice?: {
    invoice_pdf?: string;
  };
  client_reference_id?: string;
  payment_status?: string;
  amount_total?: number;
  currency?: string;
  payment_method_types?: string[];
};

interface PaymentDetails {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  created: number;
  receipt_url: string | null;
  billing_details: {
    name?: string;
    email?: string;
  };
  invoice_id: string;
  invoice_number: string;
}

// Get payment session details
router.get('/session/:sessionId', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'payment_intent.payment_method'],
    }) as unknown as PaymentSession;

    if (!session) {
      return res.status(404).json({ error: 'Payment session not found' });
    }

    // Find the invoice associated with this session
    const invoice = await db.query.invoices.findFirst({
      where: (invoices, { eq }) => eq(invoices.paymentUrl as any, sessionId)
    }) as Invoice | undefined;

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Format the payment details
    const paymentIntent = typeof session.payment_intent === 'string' 
      ? await stripe.paymentIntents.retrieve(session.payment_intent)
      : session.payment_intent;

    let receiptUrl = null;
    if (paymentIntent && 'charges' in paymentIntent && paymentIntent.charges?.data?.length) {
      receiptUrl = paymentIntent.charges.data[0].receipt_url || null;
    }

    // Update invoice with payment details if payment is successful
    if (paymentIntent?.status === 'succeeded') {
      await db.update(invoices)
        .set({ 
          status: 'paid',
          paidAt: new Date(),
          paymentIntentId: paymentIntent.id,
          updatedAt: new Date()
        } as any)
        .where(eq(invoices.id as any, invoice.id));
    }

    // Get the latest invoice data
    const updatedInvoice = await db.query.invoices.findFirst({
      where: (invoices, { eq }) => eq(invoices.id as any, invoice.id)
    }) as Invoice | undefined;

    if (!updatedInvoice) {
      return res.status(500).json({ error: 'Failed to fetch updated invoice' });
    }

    const paymentDetails: PaymentDetails = {
      id: paymentIntent?.id || session.id,
      amount: paymentIntent?.amount_received || paymentIntent?.amount || session.amount_total || 0,
      currency: paymentIntent?.currency?.toUpperCase() || session.currency?.toUpperCase() || 'USD',
      status: paymentIntent?.status || session.payment_status || 'unknown',
      payment_method: paymentIntent?.payment_method_types?.[0] || 'card',
      created: paymentIntent?.created || Math.floor(Date.now() / 1000),
      receipt_url: session.invoice?.invoice_pdf || receiptUrl || null,
      billing_details: {
        name: session.customer_details?.name || updatedInvoice.clientName,
        email: session.customer_details?.email || updatedInvoice.clientEmail,
      },
      invoice_id: updatedInvoice.id,
      invoice_number: `INV-${updatedInvoice.id.slice(0, 8).toUpperCase()}`,
    };

    res.json(paymentDetails);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Error fetching payment session:', { 
      error: errorMessage, 
      stack: errorStack 
    });
    
    const nodeEnv = process.env.NODE_ENV || 'development';
    res.status(500).json({ 
      error: 'Failed to retrieve payment details',
      details: nodeEnv === 'development' ? errorMessage : 'Internal server error'
    });
  }
});

// Stripe webhook handler
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.header('stripe-signature');
  
  if (!sig) {
    return res.status(400).send('No signature found');
  }
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      endpointSecret
    );
  } catch (err: any) {
    logger.error('Webhook signature verification failed:', { error: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Error handling webhook event:', { 
      type: event.type, 
      error: errorMessage,
      stack: errorStack
    });
    return res.status(400).json({ error: 'Failed to process webhook event' });
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
});

// Helper functions for webhook event handlers
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  if (!session.client_reference_id) {
    logger.warn('No client reference ID in checkout session', { sessionId: session.id });
    return;
  }

  try {
    const updateData: Record<string, any> = {
      status: session.payment_status === 'paid' ? 'paid' : 'sent',
      updatedAt: new Date(),
    };

    if (session.payment_status === 'paid') {
      updateData.paidAt = new Date();
      updateData.status = 'paid';
      
      if (session.payment_intent && typeof session.payment_intent === 'string') {
        updateData.paymentIntentId = session.payment_intent;
      }
    }

    await db.update(invoices)
      .set(updateData as any)
      .where(eq(invoices.id as any, session.client_reference_id));

    logger.info(`Updated invoice status to ${updateData.status}`, { 
      invoiceId: session.client_reference_id,
      sessionId: session.id 
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Error handling checkout.session.completed:', { 
      error: errorMessage,
      sessionId: session.id,
      stack: errorStack
    });
    throw error;
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const invoiceId = paymentIntent.metadata?.invoiceId;
  if (!invoiceId) {
    logger.warn('No invoice ID in payment intent metadata', { paymentIntentId: paymentIntent.id });
    return;
  }

  try {
    await db.update(invoices)
      .set({ 
        status: 'paid',
        paidAt: new Date(paymentIntent.created * 1000),
        paymentIntentId: paymentIntent.id,
        updatedAt: new Date(),
      } as any)
      .where(eq(invoices.id as any, invoiceId));

    logger.info('Updated invoice with successful payment', { 
      invoiceId,
      paymentIntentId: paymentIntent.id 
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Error handling payment_intent.succeeded:', { 
      error: errorMessage,
      paymentIntentId: paymentIntent.id,
      stack: errorStack
    });
    throw error;
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const invoiceId = paymentIntent.metadata?.invoiceId;
  if (!invoiceId) {
    logger.warn('No invoice ID in failed payment intent metadata', { 
      paymentIntentId: paymentIntent.id 
    });
    return;
  }

  try {
    await db.update(invoices)
      .set({ 
        status: 'overdue',
        updatedAt: new Date(),
      } as any)
      .where(eq(invoices.id as any, invoiceId));

    logger.warn('Payment failed for invoice', {
      invoiceId,
      paymentIntentId: paymentIntent.id,
      error: paymentIntent.last_payment_error
    });
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id as any, invoiceId));

    if (invoice) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '25'),
        secure: false,
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
          : undefined,
      });
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@example.com',
        to: invoice.clientEmail,
        subject: `Payment Failed for Invoice #${invoice.number}`,
        text: 'Your payment could not be processed. Please try again.',
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Error handling payment_intent.payment_failed:', { 
      error: errorMessage,
      paymentIntentId: paymentIntent.id,
      stack: errorStack
    });
    throw error;
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  try {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    
    if (!customerId) {
      logger.warn('No customer ID in invoice', { invoiceId: invoice.id });
      return;
    }

    // Update any related invoices or subscription records
    logger.info('Handled successful invoice payment', { 
      invoiceId: invoice.id,
      subscriptionId: subscription.id,
      customerId
    });
  } catch (error: any) {
    logger.error('Error handling invoice.payment_succeeded:', { 
      error: error.message,
      invoiceId: invoice.id,
      stack: error.stack 
    });
    throw error;
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  if (!charge.payment_intent) {
    logger.warn('No payment intent in refunded charge', { chargeId: charge.id });
    return;
  }

  const paymentIntentId = typeof charge.payment_intent === 'string' 
    ? charge.payment_intent 
    : charge.payment_intent.id;

  try {
    // Find the invoice that was refunded
    const invoice = await db.query.invoices.findFirst({
      where: (invoices, { eq }) => eq(invoices.paymentIntentId as any, paymentIntentId)
    }) as Invoice | undefined;

    if (!invoice) {
      logger.warn('No invoice found for refunded payment intent', { paymentIntentId });
      return;
    }

    const isFullRefund = charge.amount === charge.amount_refunded;
    
    await db.update(invoices)
      .set({
        status: isFullRefund ? 'refunded' : 'partially_refunded',
        refundedAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(invoices.id as any, invoice.id));

    logger.info(`Charge ${isFullRefund ? 'fully' : 'partially'} refunded`, {
      chargeId: charge.id,
      invoiceId: invoice.id,
      amount: charge.amount_refunded,
      currency: charge.currency
    });

    await db.insert(billingEvents).values({
      organizationId: invoice.organizationId as any,
      eventType: 'charge.refunded',
      stripeEventId: charge.id,
      amountCents: charge.amount_refunded,
      currency: charge.currency,
      metadata: { invoiceId: invoice.id },
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Error handling charge.refunded:', { 
      error: errorMessage,
      chargeId: charge.id,
      stack: errorStack
    });
    throw error;
  }
}

export default router;
