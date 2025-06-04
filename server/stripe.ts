import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
});

// Subscription plan configurations
export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    features: ['Basic trip planning', '5 trips per month'],
    stripePriceId: null,
  },
  team: {
    id: 'team',
    name: 'Team',
    price: 199,
    interval: 'month',
    features: ['Unlimited trips', 'Team collaboration', 'Priority support'],
    stripePriceId: process.env.STRIPE_PRICE_ID_TEAM,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 499,
    interval: 'month',
    features: ['Everything in Team', 'Custom branding', 'API access', 'Dedicated support'],
    stripePriceId: process.env.STRIPE_PRICE_ID_ENTERPRISE,
  },
};

export async function createStripeCustomer(email: string, name: string) {
  return await stripe.customers.create({
    email,
    name,
  });
}

export async function createSubscription(customerId: string, priceId: string) {
  return await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });
}

export async function updateSubscription(subscriptionId: string, newPriceId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  return await stripe.subscriptions.update(subscriptionId, {
    items: [{
      id: subscription.items.data[0].id,
      price: newPriceId,
    }],
    proration_behavior: 'create_prorations',
  });
}

export async function cancelSubscription(subscriptionId: string) {
  return await stripe.subscriptions.cancel(subscriptionId);
}

export async function createRefund(paymentIntentId: string, amount?: number, reason?: string) {
  const refundData: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
  };
  
  if (amount) {
    refundData.amount = Math.round(amount * 100); // Convert to cents
  }
  
  if (reason) {
    refundData.reason = reason as Stripe.RefundCreateParams.Reason;
  }
  
  return await stripe.refunds.create(refundData);
}

export async function getCustomerInvoices(customerId: string) {
  return await stripe.invoices.list({
    customer: customerId,
    limit: 10,
  });
}

export async function getSubscriptionDetails(subscriptionId: string) {
  return await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['latest_invoice.payment_intent'],
  });
}

// Stripe Issuing API functions for corporate cards
export async function createCardholder(params: {
  name: string;
  email: string;
  phone_number?: string;
  billing: {
    address: {
      line1: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
}) {
  try {
    return await stripe.issuing.cardholders.create({
      type: 'individual',
      name: params.name,
      email: params.email,
      phone_number: params.phone_number,
      billing: params.billing,
    });
  } catch (error: any) {
    console.error('Stripe cardholder creation error:', error);
    throw new Error(`Failed to create cardholder: ${error.message}`);
  }
}

export async function createCorporateCard(params: {
  cardholder: string;
  currency: string;
  type: 'virtual' | 'physical';
  spending_controls?: {
    spending_limits: Array<{
      amount: number;
      interval: 'per_authorization' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
    }>;
    allowed_categories?: string[];
    blocked_categories?: string[];
  };
  metadata?: Record<string, string>;
}) {
  try {
    return await stripe.issuing.cards.create({
      cardholder: params.cardholder,
      currency: params.currency,
      type: params.type,
      spending_controls: params.spending_controls,
      metadata: params.metadata,
    });
  } catch (error: any) {
    console.error('Stripe card creation error:', error);
    throw new Error(`Failed to create card: ${error.message}`);
  }
}

export async function authorizeTransaction(params: {
  amount: number;
  currency: string;
  card: string;
  merchant_data?: {
    category: string;
    name: string;
    city?: string;
    state?: string;
    country?: string;
  };
}) {
  try {
    return await stripe.issuing.authorizations.create({
      amount: params.amount,
      currency: params.currency,
      card: params.card,
      merchant_data: params.merchant_data,
    });
  } catch (error: any) {
    console.error('Stripe authorization error:', error);
    throw new Error(`Failed to authorize transaction: ${error.message}`);
  }
}

export async function createTransaction(params: {
  amount: number;
  currency: string;
  card: string;
  merchant_data: {
    category: string;
    name: string;
    city?: string;
    state?: string;
    country?: string;
  };
  metadata?: Record<string, string>;
}) {
  try {
    // Create the transaction directly
    return await stripe.issuing.transactions.create({
      amount: params.amount,
      currency: params.currency,
      card: params.card,
      merchant_data: params.merchant_data,
      metadata: params.metadata,
    });
  } catch (error: any) {
    console.error('Stripe transaction creation error:', error);
    throw new Error(`Failed to create transaction: ${error.message}`);
  }
}

export async function getCardBalance(cardId: string) {
  try {
    const card = await stripe.issuing.cards.retrieve(cardId);
    return {
      card_id: cardId,
      available_balance: card.spending_controls?.spending_limits?.[0]?.amount || 0,
      currency: card.currency,
    };
  } catch (error: any) {
    console.error('Error retrieving card balance:', error);
    throw new Error(`Failed to get card balance: ${error.message}`);
  }
}

export async function addFundsToCard(cardId: string, amount: number) {
  try {
    // Update card spending limits to add funds
    const card = await stripe.issuing.cards.retrieve(cardId);
    const currentLimit = card.spending_controls?.spending_limits?.[0]?.amount || 0;
    const newLimit = currentLimit + amount;

    return await stripe.issuing.cards.update(cardId, {
      spending_controls: {
        spending_limits: [
          {
            amount: newLimit,
            interval: 'all_time',
          },
        ],
      },
    });
  } catch (error: any) {
    console.error('Error adding funds to card:', error);
    throw new Error(`Failed to add funds to card: ${error.message}`);
  }
}

export async function freezeCard(cardId: string) {
  try {
    return await stripe.issuing.cards.update(cardId, {
      status: 'inactive',
    });
  } catch (error: any) {
    console.error('Error freezing card:', error);
    throw new Error(`Failed to freeze card: ${error.message}`);
  }
}

export async function unfreezeCard(cardId: string) {
  try {
    return await stripe.issuing.cards.update(cardId, {
      status: 'active',
    });
  } catch (error: any) {
    console.error('Error unfreezing card:', error);
    throw new Error(`Failed to unfreeze card: ${error.message}`);
  }
}