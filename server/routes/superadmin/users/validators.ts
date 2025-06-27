import { z } from 'zod';
// Create the role enum type
export const RoleEnum = z.enum([
    'super_admin',
    'admin',
    'manager',
    'member',
    'guest'
]);
type Role = z.infer<typeof RoleEnum>;
// Common user schemas
export const userBaseSchema = z.object({
    email: z.string().email('Invalid email address').toLowerCase(),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    displayName: z.string().min(1, 'Display name is required'),
    role: RoleEnum,
    organizationId: z.string().uuid('Invalid organization ID').optional(),
    avatarUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
});
// Create user schema
export const createUserSchema = userBaseSchema.extend({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});
// Update user schema
export const updateUserSchema = userBaseSchema.partial().extend({
    role: RoleEnum.optional(),
    organizationId: z.string().uuid('Invalid organization ID').optional(),
    isActive: z.boolean().optional(),
});
// User ID param schema
export const userIdParamSchema = z.object({
    id: z.string().uuid('Invalid user ID'),
});
// Middleware validators
export const validateUserId = (req: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */, res: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */, next: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */) => {
    try {
        req.params = userIdParamSchema.parse(req.params);
        next();
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid user ID',
                details: error.errors,
            });
        }
        next(error);
    }
};
export const createUser = (req: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */, res: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */, next: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */) => {
    try {
        req.body = createUserSchema.parse(req.body);
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
export const updateUser = (req: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */, res: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */, next: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */) => {
    try {
        req.body = updateUserSchema.parse(req.body);
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
// Query params schema for list endpoint
export const userListQuerySchema = z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
    search: z.string().optional(),
    role: RoleEnum.optional(),
    organizationId: z.string().uuid('Invalid organization ID').optional(),
    status: z.enum(['active', 'deleted', 'all'] as const).default('active'),
});
export const validateUserListQuery = (req: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */, res: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */, next: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */) => {
    try {
        req.query = userListQuerySchema.parse(req.query);
        next();
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid query parameters',
                details: error.errors,
            });
        }
        next(error);
    }
};
