declare module 'stripe' {
  // Export the main Stripe type
  export = Stripe;

  // Export interfaces for external use
  export interface StripeSubscription {
    id: string;
    [key: string]: any;
  }

  export interface StripeCustomer {
    id: string;
    [key: string]: any;
  }

  export interface StripeRefund {
    id: string;
    amount: number;
    currency: string;
    status: string;
    [key: string]: any;
  }

  export interface RefundCreateParams {
    payment_intent: string;
    amount?: number;
    reason?: 'requested_by_customer' | 'duplicate' | 'fraudulent' | 'expired_uncaptured_charge';
    [key: string]: any;
  }

  export interface RefundsResource {
    create(params: RefundCreateParams): Promise<StripeRefund>;
  }

  export interface InvoiceListParams {
    customer: string;
    limit?: number;
    [key: string]: any;
  }

  export interface StripeInvoice {
    id: string;
    [key: string]: any;
  }

  export interface InvoiceList {
    data: StripeInvoice[];
    has_more: boolean;
    [key: string]: any;
  }

  export interface InvoicesResource {
    list(params: InvoiceListParams): Promise<InvoiceList>;
  }

  // Stripe Issuing API types
  export interface Address {
    line1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  }

  export interface BillingAddress {
    address: Address;
  }

  export interface CardholderBilling {
    address: Address;
  }

  export interface BaseCreateCardholderParams {
    type: 'individual' | 'company';
    name: string;
    email: string;
    phone_number?: string;
    billing: CardholderBilling;
    [key: string]: any;
  }

  export type CreateCardholderParams = BaseCreateCardholderParams;
  
  export type CreateCardholderParamsWithoutType = Omit<BaseCreateCardholderParams, 'type'>;

  export interface StripeCardholder {
    id: string;
    name: string;
    email: string | null;
    phone_number: string | null;
    status: 'active' | 'inactive' | 'blocked';
    [key: string]: any;
  }

  // Issuing Card Types
  export type CardType = 'virtual' | 'physical';

  export interface CardSpendingControls {
    allowed_categories?: string[];
    blocked_categories?: string[];
    spending_limits?: Array<{
      amount: number;
      interval: 'per_authorization' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
    }>;
    [key: string]: any;
  }

  export interface CreateCardParams {
    cardholder: string;
    currency: string;
    type: CardType;
    spending_controls?: CardSpendingControls;
    metadata?: Record<string, string>;
    [key: string]: any;
  }

  export interface StripeCard {
    id: string;
    type: CardType;
    cardholder: StripeCardholder;
    currency: string;
    status: 'active' | 'inactive' | 'canceled' | 'stolen' | 'lost';
    [key: string]: any;
  }

  export interface UpdateCardParams {
    status?: 'active' | 'inactive' | 'canceled';
    spending_controls?: CardSpendingControls;
    metadata?: Record<string, string>;
    [key: string]: any;
  }

  export interface SpendingLimit {
    amount: number;
    interval: 'all_time' | 'daily' | 'monthly' | 'per_authorization' | 'weekly' | 'yearly';
  }

  export interface CardSpendingControls {
    allowed_categories?: string[];
    blocked_categories?: string[];
    spending_limits?: SpendingLimit[];
    [key: string]: any;
  }

  export interface StripeCard {
    id: string;
    type: CardType;
    cardholder: StripeCardholder;
    currency: string;
    status: 'active' | 'inactive' | 'canceled' | 'stolen' | 'lost';
    spending_controls?: {
      spending_limits?: SpendingLimit[];
      [key: string]: any;
    };
    [key: string]: any;
  }

  export interface IssuingCardsResource {
    create(params: CreateCardParams): Promise<StripeCard>;
    retrieve(id: string): Promise<StripeCard>;
    update(id: string, params: UpdateCardParams): Promise<StripeCard>;
  }

  // Payment Intents API types
  export interface PaymentIntent {
    id: string;
    amount: number;
    currency: string;
    status: string;
    metadata: Record<string, string>;
    [key: string]: any;
  }

  export interface PaymentIntentCreateParams {
    amount: number;
    currency: string;
    payment_method_types?: string[];
    capture_method?: 'automatic' | 'manual';
    metadata?: Record<string, string>;
    [key: string]: any;
  }

  export interface PaymentIntentsResource {
    create(params: PaymentIntentCreateParams): Promise<PaymentIntent>;
    capture(id: string): Promise<PaymentIntent>;
    retrieve(id: string): Promise<PaymentIntent>;
  }

  export interface IssuingResource {
    cardholders: IssuingCardholdersResource;
    cards: IssuingCardsResource;
  }

  export interface IssuingCardholdersResource {
    create(params: CreateCardholderParams): Promise<StripeCardholder>;
  }

  interface StripeConfig {
    apiVersion: string;
    typescript?: boolean;
  }

  interface CustomerCreateParams {
    email: string;
    name?: string;
    [key: string]: any;
  }


  interface SubscriptionCreateParams {
    customer: string;
    items: Array<{ price: string }>;
    payment_behavior?: string;
    expand?: string[];
    [key: string]: any;
  }


  interface SubscriptionUpdateParams {
    items: Array<{ id: string; price: string }>;
    proration_behavior?: 'create_prorations' | 'none' | 'always_invoice';
    [key: string]: any;
  }

  interface RetrieveSubscriptionParams {
    expand?: string[];
    [key: string]: any;
  }

  interface SubscriptionsResource {
    create(params: SubscriptionCreateParams): Promise<StripeSubscription>;
    retrieve(id: string, params?: RetrieveSubscriptionParams): Promise<StripeSubscription>;
    update(id: string, params: SubscriptionUpdateParams): Promise<StripeSubscription>;
    cancel(id: string): Promise<StripeSubscription>;
  }

  interface CustomersResource {
    create(params: CustomerCreateParams): Promise<StripeCustomer>;
    // Add other customer methods as needed
  }

  class Stripe {
    constructor(apiKey: string, config?: StripeConfig);
    subscriptions: SubscriptionsResource;
    customers: CustomersResource;
    refunds: RefundsResource;
    invoices: InvoicesResource;
    issuing: IssuingResource;
    paymentIntents: PaymentIntentsResource;
    // Add other Stripe resources as needed
  }
}

