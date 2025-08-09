import Stripe from "stripe";

let stripe: Stripe | null = null;

// Initialize Stripe if secret key is available
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-11-20.acacia" as any,
  });
  console.log('✓ Stripe billing service initialized');
} else {
  console.warn('⚠ STRIPE_SECRET_KEY not found - billing features will be disabled');
}

interface CreateSubscriptionParams {
  userId: number;
  plan: 'pro' | 'premium';
  customerEmail: string;
  customerName: string;
}

interface BillingInfo {
  customerId?: string;
  subscriptionId?: string;
  status: 'active' | 'inactive' | 'past_due' | 'canceled';
  currentPeriodEnd?: Date;
  plan: 'free' | 'pro' | 'premium';
}

export async function createUserSubscription(params: CreateSubscriptionParams): Promise<{
  clientSecret: string;
  subscriptionId: string;
  customerId: string;
}> {
  if (!stripe) {
    throw new Error('Stripe not configured - billing features disabled');
  }

  try {
    // Create Stripe customer for the user
    const customer = await stripe.customers.create({
      email: params.customerEmail,
      name: params.customerName,
      metadata: {
        user_id: params.userId.toString(),
        plan: params.plan
      }
    });

    // Define pricing based on plan (consumer plans)
    const priceIds = {
      pro: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_default',
      premium: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium_default'
    };

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{
        price: priceIds[params.plan],
      }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent'],
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = (invoice as any)?.payment_intent as Stripe.PaymentIntent;

    console.log(`✓ Created ${params.plan} subscription for user ${params.userId}`);
    
    return {
      clientSecret: paymentIntent.client_secret!,
      subscriptionId: subscription.id,
      customerId: customer.id
    };
  } catch (error) {
    console.error('✗ Failed to create user subscription:', error);
    throw error;
  }
}

export async function getUserBilling(customerId: string): Promise<BillingInfo> {
  if (!stripe) {
    return {
      status: 'inactive',
      plan: 'free'
    };
  }

  try {
    const customer = await stripe.customers.retrieve(customerId);
    
    if (customer.deleted) {
      return {
        status: 'inactive',
        plan: 'free'
      };
    }

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return {
        customerId,
        status: 'inactive',
        plan: 'free'
      };
    }

    const subscription = subscriptions.data[0];
    const plan = customer.metadata?.plan as 'pro' | 'premium' || 'free';

    return {
      customerId,
      subscriptionId: subscription.id,
      status: subscription.status as any,
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      plan
    };
  } catch (error) {
    console.error('✗ Failed to get user billing:', error);
    return {
      status: 'inactive',
      plan: 'free'
    };
  }
}

export async function cancelUserSubscription(subscriptionId: string): Promise<boolean> {
  if (!stripe) {
    throw new Error('Stripe not configured - billing features disabled');
  }

  try {
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    console.log(`✓ Scheduled cancellation for subscription ${subscriptionId}`);
    return true;
  } catch (error) {
    console.error('✗ Failed to cancel subscription:', error);
    return false;
  }
}

export async function updateUserSubscription(
  subscriptionId: string, 
  newPlan: 'pro' | 'premium'
): Promise<boolean> {
  if (!stripe) {
    throw new Error('Stripe not configured - billing features disabled');
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    const priceIds = {
      pro: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_default',
      premium: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium_default'
    };

    await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: priceIds[newPlan],
      }],
      proration_behavior: 'always_invoice'
    });

    console.log(`✓ Updated subscription ${subscriptionId} to ${newPlan} plan`);
    return true;
  } catch (error) {
    console.error('✗ Failed to update subscription:', error);
    return false;
  }
}

export async function createBillingPortalSession(customerId: string, returnUrl: string): Promise<string> {
  if (!stripe) {
    throw new Error('Stripe not configured - billing features disabled');
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    console.log(`✓ Created billing portal session for customer ${customerId}`);
    return session.url;
  } catch (error) {
    console.error('✗ Failed to create billing portal session:', error);
    throw error;
  }
}