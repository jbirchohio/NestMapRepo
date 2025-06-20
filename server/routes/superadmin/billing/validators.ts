import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Organization ID param schema
export const organizationIdParamSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
});

// Update plan schema
export const updatePlanSchema = z.object({
  plan: z.enum(['free', 'pro', 'enterprise']),
  prorate: z.boolean().optional().default(true),
  effectiveDate: z.string().datetime().optional(),
});

// Apply coupon schema
export const applyCouponSchema = z.object({
  couponCode: z.string().min(1, 'Coupon code is required'),
});

// Add payment method schema
export const addPaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1, 'Payment method ID is required'),
  isDefault: z.boolean().optional().default(false),
});

// Set default payment method schema
export const setDefaultPaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1, 'Payment method ID is required'),
});

// Get invoices query schema
export const getInvoicesQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
  starting_after: z.string().optional(),
});

// Middleware validators
export const validateOrganizationId = (req: Request, res: Response, next: NextFunction): void => {
  try {
    req.params = organizationIdParamSchema.parse(req.params);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    next(error);
  }
};

export const validateUpdatePlan = (req: Request, res: Response, next: NextFunction): void => {
  try {
    req.body = updatePlanSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    next(error);
  }
};

export const validateApplyCoupon = (req: Request, res: Response, next: NextFunction): void => {
  try {
    req.body = applyCouponSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    next(error);
  }
};

export const validateAddPaymentMethod = (req: Request, res: Response, next: NextFunction): void => {
  try {
    req.body = addPaymentMethodSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    next(error);
  }
};

export const validateSetDefaultPaymentMethod = (req: Request, res: Response, next: NextFunction): void => {
  try {
    req.body = setDefaultPaymentMethodSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    next(error);
  }
};

export const validateGetInvoices = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const result = getInvoicesQuerySchema.parse(req.query);
    // Convert back to strings for Express query params
    req.query = {
      ...req.query,
      limit: String(result.limit),
      starting_after: result.starting_after
    };
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    next(error);
  }
};

export const updatePlan = (req: any, res: any, next: any) => {
  try {
    req.body = updatePlanSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }
    next(error);
  }
};

export const applyCoupon = (req: any, res: any, next: any) => {
  try {
    req.body = applyCouponSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }
    next(error);
  }
};

export const addPaymentMethod = (req: any, res: any, next: any) => {
  try {
    req.body = addPaymentMethodSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }
    next(error);
  }
};

export const setDefaultPaymentMethod = (req: any, res: any, next: any) => {
  try {
    req.body = setDefaultPaymentMethodSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }
    next(error);
  }
};

export const validateInvoicesQuery = (req: any, res: any, next: any) => {
  try {
    req.query = getInvoicesQuerySchema.parse(req.query);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.errors,
      });
    }
    next(error);
  }
};
