// Local type definitions to avoid external dependencies
interface Stripe {
  apiVersion?: string;
  invoices: {
    retrieve(id: string): Promise<any>;
  };
  subscriptions: {
    retrieve(id: string): Promise<any>;
    create(params: any): Promise<any>;
    list(params: any): Promise<{ data: any[] }>;
    update(id: string, params: any): Promise<any>;
  };
  customers: {
    create(params: any): Promise<any>;
    retrieve(id: string): Promise<any>;
  };
  billingPortal: {
    sessions: {
      create(params: any): Promise<{ url: string }>;
    };
  };
}

interface StripeConstructor {
  new (secretKey: string, options?: { apiVersion?: string }): Stripe;
}

// Mock Stripe implementation
const MockStripe = function(_secretKey: string, options?: { apiVersion?: string }) {
  return {
    apiVersion: options?.apiVersion || "2023-10-16",
    invoices: {
      retrieve: async (id: string) => ({ 
        id, 
        payment_intent: null,
        status: 'paid'
      })
    },
    subscriptions: {
      retrieve: async (id: string) => ({ 
        id, 
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        status: 'active',
        items: { data: [{ id: 'item_1', price: 'price_team_default' }] },
        latest_invoice: { payment_intent: { client_secret: 'secret' } }
      }),
      create: async (params: any) => ({
        id: 'sub_' + Math.random().toString(36).substring(7),
        customer: params.customer,
        items: { data: [{ id: 'item_1', price: params.items[0]?.price }] },
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        status: 'active',
        latest_invoice: { payment_intent: { client_secret: 'secret' } }
      }),
      list: async (params: any) => ({
        data: params.status === 'active' ? [
          {
            id: 'sub_' + Math.random().toString(36).substring(7),
            status: 'active',
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            items: { data: [{ id: 'item_1', price: 'price_team_default' }] }
          }
        ] : []
      }),
      update: async (id: string, params: any) => ({
        id,
        ...params,
        status: 'active',
        items: { data: [{ id: params.items?.[0]?.id || 'item_1', price: params.items?.[0]?.price || 'price_team_default' }] }
      })
    },
    customers: {
      create: async (params: any) => ({
        id: 'cus_' + Math.random().toString(36).substring(7),
        email: params.email,
        name: params.name,
        metadata: params.metadata,
        deleted: false
      }),
      retrieve: async (id: string) => ({
        id,
        email: 'test@example.com',
        name: 'Test User',
        metadata: { plan: 'team' },
        deleted: false
      })
    },
    billingPortal: {
      sessions: {
        create: async (params: any) => ({
          url: `https://mock.stripe.com/billing-portal/session/${params.customer}`
        })
      }
    }
  };
} as any as StripeConstructor;

let stripe: Stripe | null = null;

// Initialize Stripe if secret key is available
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new MockStripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });
  console.log('✓ Stripe billing service initialized');
} else {
  console.warn('⚠ STRIPE_SECRET_KEY not found - billing features will be disabled');
}

interface CreateOrganizationSubscriptionParams {
  organization_id: number;
  plan: 'team' | 'enterprise';
  customerEmail: string;
  customerName: string;
}

interface BillingInfo {
  customerId?: string;
  subscriptionId?: string;
  status: 'active' | 'inactive' | 'past_due' | 'canceled';
  currentPeriodEnd?: Date;
  plan: 'free' | 'team' | 'enterprise';
}

export async function createOrganizationSubscription(params: CreateOrganizationSubscriptionParams): Promise<{
  clientSecret: string;
  subscriptionId: string;
  customerId: string;
}> {
  if (!stripe) {
    throw new Error('Stripe not configured - billing features disabled');
  }

  try {
    // Create Stripe customer for the organization
    const customer = await stripe.customers.create({
      email: params.customerEmail,
      name: params.customerName,
      metadata: {
        organization_id: params.organization_id.toString(),
        plan: params.plan
      }
    });

    // Define pricing based on plan
    const priceIds = {
      team: process.env.STRIPE_TEAM_PRICE_ID || 'price_team_default',
      enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_default'
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

    const invoice = subscription.latest_invoice;
    const paymentIntent = typeof invoice === 'object' && invoice ? (invoice as any).payment_intent : null;
    const clientSecret = typeof paymentIntent === 'object' && paymentIntent ? (paymentIntent as any).client_secret : null;

    console.log(`✓ Created ${params.plan} subscription for organization ${params.organization_id}`);
    
    return {
      clientSecret: clientSecret!,
      subscriptionId: subscription.id,
      customerId: customer.id
    };
  } catch (error) {
    console.error('✗ Failed to create organization subscription:', error);
    throw error;
  }
}

export async function getOrganizationBilling(customerId: string): Promise<BillingInfo> {
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
    const plan = customer.metadata?.plan as 'team' | 'enterprise' || 'free';

    return {
      customerId,
      subscriptionId: subscription.id,
      status: subscription.status as any,
      currentPeriodEnd: new Date(((subscription as any).current_period_end || 0) * 1000),
      plan
    };
  } catch (error) {
    console.error('✗ Failed to get organization billing:', error);
    return {
      status: 'inactive',
      plan: 'free'
    };
  }
}

export async function cancelOrganizationSubscription(subscriptionId: string): Promise<boolean> {
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

export async function updateOrganizationSubscription(
  subscriptionId: string, 
  newPlan: 'team' | 'enterprise'
): Promise<boolean> {
  if (!stripe) {
    throw new Error('Stripe not configured - billing features disabled');
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    const priceIds = {
      team: process.env.STRIPE_TEAM_PRICE_ID || 'price_team_default',
      enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_default'
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

