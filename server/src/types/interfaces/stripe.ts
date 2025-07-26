// Stripe-related interface extensions to fix TS2339 errors

export interface StripeSubscription {
  id: string;
  current_period_end: number;
  status: string;
  customer: string;
  // Add other properties as needed
  [key: string]: any;
}

export interface StripeInvoice {
  id: string;
  payment_intent: string | StripePaymentIntent;
  amount_paid: number;
  status: string;
  // Add other properties as needed
  [key: string]: any;
}

export interface StripePaymentIntent {
  id: string;
  client_secret: string;
  status: string;
  amount: number;
  // Add other properties as needed
  [key: string]: any;
}

