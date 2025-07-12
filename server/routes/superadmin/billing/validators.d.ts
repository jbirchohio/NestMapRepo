import type { RequestHandler } from 'express';
import type { z } from 'zod';

export const organizationIdParamSchema: z.ZodObject<{
  organizationId: z.ZodString;
}>;

export const updatePlanSchema: z.ZodObject<{
  plan: z.ZodEnum<['free', 'pro', 'enterprise']>;
  prorate: z.ZodOptional<z.ZodBoolean>;
  effectiveDate: z.ZodOptional<z.ZodString>;
}>;

export const applyCouponSchema: z.ZodObject<{
  couponCode: z.ZodString;
}>;

export const addPaymentMethodSchema: z.ZodObject<{
  paymentMethodId: z.ZodString;
  isDefault: z.ZodOptional<z.ZodBoolean>;
}>;

export const setDefaultPaymentMethodSchema: z.ZodObject<{
  paymentMethodId: z.ZodString;
}>;

export const getInvoicesQuerySchema: z.ZodObject<{
  limit: z.ZodString;
  starting_after: z.ZodOptional<z.ZodString>;
}>;

export const validateOrganizationId: RequestHandler;
export const validateUpdatePlan: RequestHandler;
export const validateApplyCoupon: RequestHandler;
export const validateAddPaymentMethod: RequestHandler;
export const validateSetDefaultPaymentMethod: RequestHandler;
export const validateGetInvoices: RequestHandler;
