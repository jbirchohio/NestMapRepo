import { Router } from 'express';
import Stripe from 'stripe';
import { db } from '../db';
import { organizations } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

const router = Router();

// Make Stripe optional - only initialize if key is provided
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-11-20.acacia" as any,
    })
  : null;

// Return early if Stripe is not configured
if (!stripe) {
  router.post('/stripe-connect', (req, res) => {
    res.status(501).json({ message: 'Stripe webhooks not configured' });
  });
  router.post('/stripe', (req, res) => {
    res.status(501).json({ message: 'Stripe webhooks not configured' });
  });
}

// Webhook endpoint for Stripe Connect account updates
router.post('/stripe-connect', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;

  try {
    // Verify webhook signature
    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).send('Missing signature or webhook secret');
    }

    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    logger.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  logger.info('Received Stripe Connect webhook:', event.type);

  try {
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;
      
      case 'person.updated':
        await handlePersonUpdated(event.data.object as Stripe.Person);
        break;
      
      case 'capability.updated':
        await handleCapabilityUpdated(event.data.object as Stripe.Capability);
        break;
      
      case 'account.external_account.created':
      case 'account.external_account.updated':
        await handleExternalAccountUpdated(event.data.object as Stripe.ExternalAccount);
        break;
      
      default:
        logger.debug(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    logger.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handleAccountUpdated(account: Stripe.Account) {
  logger.info(`Account updated: ${account.id}`);
  
  try {
    // Find organization by Stripe account ID
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.stripe_connect_account_id, account.id));

    if (!organization) {
      logger.warn(`No organization found for Stripe account: ${account.id}`);
      return;
    }

    // Update organization with latest account status
    const updateData: any = {
      stripe_connect_onboarded: account.charges_enabled && account.payouts_enabled,
      stripe_issuing_enabled: account.capabilities?.card_issuing === 'active',
      stripe_payments_enabled: account.charges_enabled || false,
      stripe_transfers_enabled: account.payouts_enabled || false,
      updated_at: new Date()
    };

    // Check requirements status
    const requirements = account.requirements;
    if (requirements) {
      updateData.stripe_requirements_currently_due = requirements.currently_due || [];
      updateData.stripe_requirements_eventually_due = requirements.eventually_due || [];
      updateData.stripe_requirements_past_due = requirements.past_due || [];
      updateData.stripe_requirements_disabled_reason = requirements.disabled_reason;
      updateData.stripe_requirements_current_deadline = requirements.current_deadline 
        ? new Date(requirements.current_deadline * 1000) 
        : null;
    }

    await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, organization.id));

    logger.info(`Updated organization ${organization.id} with account status`);

    // Log verification errors for debugging
    if (requirements?.errors && requirements.errors.length > 0) {
      logger.warn('Account verification errors:', JSON.stringify(requirements.errors, null, 2));
    }

    // Check if account needs immediate attention
    if (requirements?.currently_due && requirements.currently_due.length > 0) {
      logger.warn(`Account ${account.id} has currently due requirements:`, requirements.currently_due);
    }

    if (requirements?.past_due && requirements.past_due.length > 0) {
      logger.error(`Account ${account.id} has past due requirements:`, requirements.past_due);
    }

  } catch (error) {
    logger.error('Error updating organization from account webhook:', error);
  }
}

async function handlePersonUpdated(person: Stripe.Person) {
  logger.info(`Person updated: ${person.id} for account: ${person.account}`);
  
  // Log person verification status for debugging
  if (person.verification?.status) {
    logger.info(`Person ${person.id} verification status: ${person.verification.status}`);
  }

  if (person.verification?.details_code) {
    logger.info(`Person ${person.id} verification details: ${person.verification.details_code}`);
  }
}

async function handleCapabilityUpdated(capability: Stripe.Capability) {
  logger.info(`Capability updated: ${capability.id} for account: ${capability.account}`);
  logger.info(`Capability ${capability.id} status: ${capability.status}`);

  try {
    // Find organization by Stripe account ID
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.stripe_connect_account_id, capability.account as string));

    if (!organization) {
      logger.warn(`No organization found for Stripe account: ${capability.account}`);
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

    logger.info(`Updated organization ${organization.id} capability: ${capability.id} = ${capability.status}`);

  } catch (error) {
    logger.error('Error updating organization from capability webhook:', error);
  }
}

async function handleExternalAccountUpdated(externalAccount: Stripe.ExternalAccount) {
  logger.info(`External account updated: ${externalAccount.id} for account: ${externalAccount.account}`);
  
  try {
    // Find organization by Stripe account ID
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.stripe_connect_account_id, externalAccount.account as string));

    if (!organization) {
      logger.warn(`No organization found for Stripe account: ${externalAccount.account}`);
      return;
    }

    // Update external account status
    await db
      .update(organizations)
      .set({ 
        stripe_external_account_id: externalAccount.id,
        updated_at: new Date()
      })
      .where(eq(organizations.id, organization.id));

    logger.info(`Updated organization ${organization.id} with external account: ${externalAccount.id}`);

  } catch (error) {
    logger.error('Error updating organization from external account webhook:', error);
  }
}

export default router;