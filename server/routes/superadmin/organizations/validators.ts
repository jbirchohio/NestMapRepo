import { z } from 'zod.js';

// Common organization schema
export const organizationBaseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  plan: z.enum(['free', 'pro', 'enterprise']).default('free'),
  settings: z.object({
    whiteLabel: z.object({
      enabled: z.boolean().default(false)
    }).optional()
  }).optional()
});

// Create organization schema
export const createOrganizationSchema = organizationBaseSchema.pick({
  name: true,
  plan: true
});

// Update organization schema
export const updateOrganizationSchema = organizationBaseSchema.partial();

// Organization ID param schema
export const organizationIdParamSchema = z.object({
  id: z.string().uuid('Invalid organization ID'),
});

// Middleware validators
export const createOrganization = (req: any, res: any, next: any) => {
  try {
    req.body = createOrganizationSchema.parse(req.body);
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

export const updateOrganization = (req: any, res: any, next: any) => {
  try {
    req.body = updateOrganizationSchema.parse(req.body);
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

export const validateOrganizationId = (req: any, res: any, next: any) => {
  try {
    req.params = organizationIdParamSchema.parse(req.params);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid organization ID',
        details: error.errors,
      });
    }
    next(error);
  }
};
