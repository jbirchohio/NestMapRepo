import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
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
    price: 29.99,
    interval: 'month',
    features: ['Unlimited trips', 'Team collaboration', 'Priority support'],
    stripePriceId: process.env.STRIPE_PRICE_ID_TEAM,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99.99,
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