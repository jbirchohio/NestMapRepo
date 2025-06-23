import Stripe from 'stripe';
type StripeCustomer = Stripe.Customer;
type StripeSubscription = Stripe.Subscription;
type StripeRefund = Stripe.Refund;
type RefundCreateParams = Stripe.RefundCreateParams;
type InvoiceList = Stripe.ApiList<Stripe.Invoice>;
type StripeCardholder = Stripe.Issuing.Cardholder;
type StripeCard = Stripe.Issuing.Card;
type PaymentIntent = Stripe.PaymentIntent;
type CreateCardholderParams = Stripe.Issuing.CardholderCreateParams;
type CardType = Stripe.Issuing.Card.Type;
type CardSpendingControls = Stripe.Issuing.CardholderCreateParams.SpendingControls;
type CreateCardParams = Stripe.Issuing.CardCreateParams;
type CreateCardholderParamsWithoutType = Omit<CreateCardholderParams, 'type'>;
if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-05-28.basil',
    typescript: true
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
export async function createStripeCustomer(email: string, name: string): Promise<StripeCustomer> {
    return await stripe.customers.create({
        email,
        name,
    });
}
export async function createSubscription(customerId: string, priceId: string): Promise<StripeSubscription> {
    return await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
    });
}
export async function updateSubscription(subscriptionId: string, newPriceId: string): Promise<StripeSubscription> {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return await stripe.subscriptions.update(subscriptionId, {
        items: [{
                id: subscription.items.data[0].id,
                price: newPriceId,
            }],
        proration_behavior: 'create_prorations',
    });
}
export async function cancelSubscription(subscriptionId: string): Promise<StripeSubscription> {
    return await stripe.subscriptions.cancel(subscriptionId);
}
export async function createRefund(paymentIntentId: string, amount?: number, reason?: Stripe.RefundCreateParams.Reason): Promise<StripeRefund> {
    const refundData: RefundCreateParams = {
        payment_intent: paymentIntentId,
    };
    if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to cents
    }
    if (reason) {
        refundData.reason = reason;
    }
    return await stripe.refunds.create(refundData);
}
export async function getCustomerInvoices(customerId: string): Promise<InvoiceList> {
    return await stripe.invoices.list({
        customer: customerId,
        limit: 10,
    });
}
export async function getSubscriptionDetails(subscriptionId: string): Promise<StripeSubscription> {
    return await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice.payment_intent'],
    });
}
// Stripe Issuing API functions for corporate cards
export async function createCardholder(params: Omit<CreateCardholderParams, 'type'> & {
    name: string;
    email: string;
    billing: {
        address: {
            line1: string;
            city: string;
            state: string;
            postal_code: string;
            country: string;
        };
    };
}): Promise<StripeCardholder> {
    try {
        if (!params.name || !params.email || !params.billing?.address) {
            throw new Error('Missing required cardholder information');
        }
        const cardholderParams: CreateCardholderParams = {
            ...params,
            type: 'individual',
            // Ensure required billing address is provided with proper types
            billing: {
                address: {
                    line1: params.billing.address.line1,
                    city: params.billing.address.city,
                    state: params.billing.address.state,
                    postal_code: params.billing.address.postal_code,
                    country: params.billing.address.country || 'US'
                }
            }
        };
        return await stripe.issuing.cardholders.create(cardholderParams);
    }
    catch (error: any) {
        console.error('Stripe cardholder creation error:', error);
        throw error;
    }
}
export async function createCorporateCard(params: {
    cardholder: string;
    currency: string;
    type: CardType;
    spending_controls?: CardSpendingControls;
    metadata?: Record<string, string>;
}): Promise<StripeCard> {
    try {
        return await stripe.issuing.cards.create({
            cardholder: params.cardholder,
            currency: params.currency,
            type: params.type,
            spending_controls: params.spending_controls,
            metadata: params.metadata,
        });
    }
    catch (error: any) {
        console.error('Stripe card creation error:', error);
        throw error;
    }
}
export async function authorizeTransaction(params: {
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
}) {
    try {
        // Create a payment intent with manual capture to simulate an authorization
        return await stripe.paymentIntents.create({
            amount: params.amount,
            currency: params.currency,
            payment_method_types: ['card_present'],
            capture_method: 'manual',
            confirm: true,
            metadata: {
                merchant_name: params.merchant_data.name,
                merchant_category: params.merchant_data.category,
                is_authorization: 'true'
            },
            payment_method_options: {
                card: {
                    request_three_d_secure: 'any'
                }
            }
        });
    }
    catch (error: any) {
        console.error('Stripe authorization error:', error);
        throw new Error(`Failed to authorize transaction: ${error.message}`);
    }
}
export async function createTransaction(params: {
    amount: number;
    currency: string;
    card: string;
    merchant_data: {
        name: string;
        category: string;
        address?: {
            line1?: string;
            city?: string;
            state?: string;
            postal_code?: string;
            country?: string;
        };
    };
    metadata?: Record<string, string>;
}): Promise<PaymentIntent> {
    try {
        // First create a payment intent with manual capture
        const paymentIntent = await stripe.paymentIntents.create({
            amount: params.amount,
            currency: params.currency,
            payment_method_types: ['card_present'],
            capture_method: 'manual',
            metadata: {
                ...params.metadata,
                merchant_name: params.merchant_data.name,
                merchant_category: params.merchant_data.category,
            },
        });
        // In a real implementation, you would:
        // 1. Authorize the payment (happens when customer taps/inserts card)
        // 2. Potentially update the payment intent with additional data
        // 3. Capture the payment intent when the transaction is complete
        // For now, we'll just return the created payment intent
        return paymentIntent;
    }
    catch (error: any) {
        console.error('Stripe transaction error:', error);
        throw error;
    }
}
export interface CardBalance {
    card_id: string;
    available_balance: number;
    currency: string;
}
export async function getCardBalance(cardId: string): Promise<CardBalance> {
    try {
        const card = await stripe.issuing.cards.retrieve(cardId);
        return {
            card_id: cardId,
            available_balance: card.spending_controls?.spending_limits?.[0]?.amount || 0,
            currency: card.currency,
        };
    }
    catch (error: any) {
        console.error('Error retrieving card balance:', error);
        throw error;
    }
}
export async function addFundsToCard(cardId: string, amount: number): Promise<StripeCard> {
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
    }
    catch (error: any) {
        console.error('Error adding funds to card:', error);
        throw error;
    }
}
export async function freezeCard(cardId: string): Promise<StripeCard> {
    try {
        return await stripe.issuing.cards.update(cardId, {
            status: 'inactive',
        });
    }
    catch (error: any) {
        console.error('Error freezing card:', error);
        throw error;
    }
}
export async function unfreezeCard(cardId: string): Promise<StripeCard> {
    try {
        return await stripe.issuing.cards.update(cardId, {
            status: 'active',
        });
    }
    catch (error: any) {
        console.error('Error unfreezing card:', error);
        throw error;
    }
}
