import { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { getDatabase } from '../db/connection.js';
import { eq } from '../utils/drizzle-shim';;
import { or } from '../utils/drizzle-shim';import { NodemailerEmailService } from '../email/services/nodemailer-email.service';
import { ConfigService } from '@nestjs/config';
import { invoices } from '../db/invoiceSchema';
import { organizations } from '../db/schema';
import { stripe } from '../stripe';

// Extend the Express Request type to include rawBody
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

// Type definitions for environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      STRIPE_SECRET_KEY: string;
      STRIPE_WEBHOOK_SECRET: string;
      SMTP_HOST?: string;
      SMTP_USER?: string;
      SMTP_PASSWORD?: string;
      FRONTEND_URL?: string;
      NODE_ENV?: 'development' | 'production' | 'test';
    }
  }
}

// Extend Express Request type to include rawBody
declare module 'express-serve-static-core' {
  interface Request {
    rawBody?: Buffer;
  }
}

const router = Router();

// Initialize email service if SMTP config is available
let emailService: NodemailerEmailService | null = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
  try {
    const configService = new ConfigService();
    emailService = new NodemailerEmailService(configService);
    console.log('Email service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize email service:', error);
  }
} else {
  console.warn('Email service not initialized - missing SMTP configuration');
}

// Middleware to verify Stripe webhook signature
const verifyStripeWebhook = (req: Request, res: Response, next: NextFunction): void => {
  const signature = req.header('stripe-signature');
  if (!signature) {
    res.status(400).json({ error: 'Missing Stripe signature' });
    return;
  }

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Missing Stripe webhook secret');
    }

    if (!req.rawBody) {
      throw new Error('Missing request raw body');
    }

    // Verify the webhook signature
    stripe.webhooks.constructEvent(
      req.rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    next();
  } catch (err) {
    const error = err as Error;
    console.error('Webhook signature verification failed:', error.message);
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }
};

// Apply the middleware to parse raw body for webhooks
router.use('/stripe-invoice', (req: Request, res: Response, next: NextFunction) => {
  if (req.originalUrl === '/webhooks/stripe-invoice') {
    req.rawBody = req.body;
    verifyStripeWebhook(req, res, next);
  } else {
    next();
  }
});

// Webhook endpoint for Stripe Checkout/Invoice payments
router.post('/stripe-invoice', async (req: Request & { rawBody?: Buffer }, res: Response) => {
  try {
    const signature = req.header('stripe-signature');
    if (!signature || !req.rawBody || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).json({ error: 'Invalid webhook configuration' });
    }

    const event = stripe.webhooks.constructEvent(
      req.rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Handle the event
    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log('PaymentIntent was successful!', paymentIntent.id);

          // Update the invoice status in the database
          if (paymentIntent.invoice) {
            const invoiceId = typeof paymentIntent.invoice === 'string'
              ? paymentIntent.invoice
              : paymentIntent.invoice.id;

            // Update invoice status in database
            const [invoice] = await db
              .select()
              .from(invoices)
              .where(eq(invoices.stripeInvoiceId, invoiceId))
              .limit(1);

            if (invoice) {
              // Update invoice status in database
              await db
                .update(invoices)
                .set({
                  status: 'paid',
                  paidAt: new Date(),
                  paymentIntentId: paymentIntent.id,
                  updatedAt: new Date(),
                  metadata: {
                    ...invoice.metadata,
                    stripeEvent: event.type,
                    stripeEventId: event.id,
                  },
                })
                .where(eq(invoices.id, invoice.id));

              // Send payment receipt email if email service is configured
              if (emailService) {
                try {
                  await emailService.sendPaymentReceiptEmail({
                    to: invoice.clientEmail,
                    clientName: invoice.clientName,
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency,
                    invoiceNumber: invoice.number,
                    paymentDate: new Date(),
                    metadata: {
                      stripeEvent: event.type,
                      stripeEventId: event.id,
                    },
                  });
                } catch (error) {
                  const err = error as Error;
                  console.error('Failed to send payment receipt email:', err.message);
                }
              }
            }
          }

          return res.json({ received: true });
        }
        default:
          return res.json({ received: true });
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Webhook endpoint for Stripe Connect account updates
router.post('/stripe-connect', async (req: Request & { rawBody?: Buffer }, res: Response) => {
  try {
    const signature = req.header('stripe-signature');
    if (!signature) {
      return res.status(400).json({ error: 'Missing Stripe signature' });
    }

    if (!req.rawBody) {
      return res.status(400).json({ error: 'Missing request body' });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );
    } catch (err) {
      const error = err as Error;
      console.error('Webhook signature verification failed:', error);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    console.log('Received Stripe Connect webhook:', event.type);

    try {
      switch (event.type) {
        case 'account.updated':
          await handleAccountUpdated(event.data.object as Stripe.Account);
          break;
        case 'account.external_account.created':
        case 'account.external_account.updated':
          await handleExternalAccountUpdated(event.data.object as Stripe.BankAccount | Stripe.Card);
          break;
        case 'payout.paid':
          await handlePayoutPaid(event.data.object as Stripe.Payout);
          break;
        case 'payout.failed':
          await handlePayoutFailed(event.data.object as Stripe.Payout);
          break;
        // Add more event types as needed
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return res.json({ received: true });
    } catch (error) {
      console.error('Error handling Stripe Connect webhook:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } catch (error) {
    console.error('Unexpected error in Stripe Connect webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper to get database instance
const getDB = () => {
  const db = getDatabase();
  if (!db) {
    throw new Error('Database connection not available');
  }
  return db;
};

async function handleAccountUpdated(account: Stripe.Account) {
  try {
    const db = getDB();
    // Update the organization's Stripe Connect account status
    await db.update(organizations)
      .set({
        stripeConnectAccountId: account.id,
      })
      .where(eq(organizations.stripe_connect_account_id, account.id));

    console.log(`Updated organization with Stripe Connect account: ${account.id}`);
  } catch (error) {
    console.error('Error updating organization from account webhook:', error);
    throw error;
  }
}

async function handlePersonUpdated(person: Stripe.Person) {
  console.log(`Person updated: ${person.id} for account: ${person.account}`);
  
  // Log person verification status for debugging
  if (person.verification?.status) {
    console.log(`Person ${person.id} verification status: ${person.verification.status}`);
  }

  if (person.verification?.details_code) {
    console.log(`Person ${person.id} verification details: ${person.verification.details_code}`);
  }
}

async function handleCapabilityUpdated(capability: Stripe.Capability) {
  console.log(`Capability updated: ${capability.id} for account: ${capability.account}`);
  console.log(`Capability ${capability.id} status: ${capability.status}`);

  try {
    // Find organization by Stripe account ID
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.stripe_connect_account_id, capability.account as string));

    if (!organization) {
      console.warn(`No organization found for Stripe account: ${capability.account}`);
      return;
    }

    // Update specific capability status
    const updateData: any = { updated_at: new Date() };

    switch (capability.id) {
      case 'card_issuing':
        updateData.stripe_issuing_enabled = capability.status === 'active';
        break;
      case 'card_payments':
        updateData.stripe_payments_enabled = capability.status === 'active';
        break;
      case 'transfers':
        updateData.stripe_transfers_enabled = capability.status === 'active';
        break;
    }

    await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, organization.id));

    console.log(`Updated organization ${organization.id} capability: ${capability.id} = ${capability.status}`);

  } catch (error) {
    console.error('Error updating organization from capability webhook:', error);
  }
}

async function handleExternalAccountUpdated(externalAccount: Stripe.BankAccount | Stripe.Card) {
  console.log(`External account updated: ${externalAccount.id} for account: ${externalAccount.account}`);
  
  try {
    // Find organization by Stripe account ID
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.stripe_connect_account_id, externalAccount.account as string));

    if (!organization) {
      console.warn(`No organization found for Stripe account: ${externalAccount.account}`);
      return;
    }

    // Update organization with Connect account info
    await db
      .update(organizations)
      .set({
        stripeConnectAccountId: externalAccount.id,
      })
      .where(eq(organizations.id, organization.id));

    console.log(`Updated organization ${organization.id} with external account: ${externalAccount.id}`);

  } catch (error) {
    console.error('Error updating organization from external account webhook:', error);
  }
}

async function handlePayoutPaid(payout: Stripe.Payout) {
  console.log(`Payout paid: ${payout.id} for account: ${payout.destination}`);
  
  try {
    // Find organization by Stripe account ID
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.stripe_connect_account_id, payout.destination as string));

    if (!organization) {
      console.warn(`No organization found for Stripe account: ${payout.destination}`);
      return;
    }

    // Update payout status
    await db
      .update(organizations)
      .set({ 
        stripe_payout_id: payout.id,
        updated_at: new Date()
      })
      .where(eq(organizations.id, organization.id));

    console.log(`Updated organization ${organization.id} with payout: ${payout.id}`);

  } catch (error) {
    console.error('Error updating organization from payout webhook:', error);
  }
}

async function handlePayoutFailed(payout: Stripe.Payout) {
  console.log(`Payout failed: ${payout.id} for account: ${payout.destination}`);
  
  try {
    // Find organization by Stripe account ID
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.stripe_connect_account_id, payout.destination as string));

    if (!organization) {
      console.warn(`No organization found for Stripe account: ${payout.destination}`);
      return;
    }

    // Update payout status
    await db
      .update(organizations)
      .set({ 
        stripe_payout_id: payout.id,
        updated_at: new Date()
      })
      .where(eq(organizations.id, organization.id));

    console.log(`Updated organization ${organization.id} with payout: ${payout.id}`);

  } catch (error) {
    console.error('Error updating organization from payout webhook:', error);
  }
}

// Export the router
export default router;



