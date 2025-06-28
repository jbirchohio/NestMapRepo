// Stripe TypeScript definitions

declare module 'stripe' {
  // Base types
  export interface StripeSubscription {
    id: string;
    [key: string]: unknown;
  }

  export interface StripeCustomer {
    id: string;
    [key: string]: unknown;
  }

  export interface StripeRefund {
    id: string;
    amount: number;
    currency: string;
    status: string;
  }

  // Add other Stripe types as needed
  
  // Main Stripe class
  class Stripe {
    constructor(apiKey: string, config?: StripeConfig);
    subscriptions: SubscriptionsResource;
    customers: CustomersResource;
    refunds: RefundsResource;
    invoices: InvoicesResource;
    paymentIntents: PaymentIntentsResource;
    issuing: IssuingResource;
  }

  // Export the Stripe class as the default export
  export = Stripe;
}

// Export types for use in the application
export interface StripeConfig {
  apiVersion: string;
  typescript?: boolean;
}

// Add other exported types as needed
