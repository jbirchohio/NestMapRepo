import type { RequestHandler } from '../../express-augmentations';

declare module './controllers' {
  export const getBillingOverview: RequestHandler;
  export const getOrganizationBilling: RequestHandler;
  export const updateSubscriptionPlan: RequestHandler;
  export const applyCoupon: RequestHandler;
  export const getPaymentMethods: RequestHandler;
  export const addPaymentMethod: RequestHandler;
  export const setDefaultPaymentMethod: RequestHandler;
  export const getInvoices: RequestHandler;
  
  // Helper functions
  export function getPriceIdForPlan(plan: string): string;
}
