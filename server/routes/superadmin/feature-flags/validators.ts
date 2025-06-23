import { z } from 'zod';
// Common schemas
export const featureFlagIdSchema = z.object({
    id: z.string().uuid('Invalid feature flag ID'),
});
export const organizationIdSchema = z.object({
    organizationId: z.string().uuid('Invalid organization ID'),
});
export const flagNameSchema = z.object({
    flagName: z.string().min(1, 'Flag name is required'),
});
// Create feature flag schema
export const createFeatureFlagSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().optional(),
    defaultValue: z.boolean().default(false),
    isEnabled: z.boolean().default(false),
});
// Update feature flag schema
export const updateFeatureFlagSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100).optional(),
    description: z.string().optional(),
    defaultValue: z.boolean().optional(),
    isEnabled: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
});
// Set organization feature flag schema
export const setOrganizationFeatureFlagSchema = z.object({
    flagId: z.string().uuid('Invalid flag ID'),
    isEnabled: z.boolean(),
});
// Validator middleware
export const validateFeatureFlagId = (req: any, res: any, next: any) => {
    try {
        req.params = featureFlagIdSchema.parse(req.params);
        next();
    }
    catch (error) {
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
        req.params = organizationIdSchema.parse(req.params);
        next();
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.errors,
            });
        }
        next(error);
    }
};
export const validateFeatureFlagName = (req: any, res: any, next: any) => {
    try {
        req.params = flagNameSchema.parse(req.params);
        next();
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.errors,
            });
        }
        next(error);
    }
};
export const validateCreateFeatureFlag = (req: any, res: any, next: any) => {
    try {
        req.body = createFeatureFlagSchema.parse(req.body);
        next();
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.errors,
            });
        }
        next(error);
    }
};
export const validateUpdateFeatureFlag = (req: any, res: any, next: any) => {
    try {
        req.body = updateFeatureFlagSchema.parse(req.body);
        next();
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.errors,
            });
        }
        next(error);
    }
};
export const validateSetOrganizationFeatureFlag = (req: any, res: any, next: any) => {
    try {
        req.body = setOrganizationFeatureFlagSchema.parse(req.body);
        next();
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.errors,
            });
        }
        next(error);
    }
};
