import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
type CustomRequest = Request & {
    user?: {
        id: string | number;
        role: string;
        organization_id?: number;
    };
    [key: string]: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */;
};
/**
 * Admin Input Validation Middleware
 * Provides strict validation for administrative endpoints
 */
// Organization update validation schema
export const organizationUpdateSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    plan: z.enum(['free', 'pro', 'enterprise']).optional(),
    subscription_status: z.enum(['active', 'inactive', 'suspended', 'cancelled']).optional(),
    white_label_enabled: z.boolean().optional(),
    custom_domain: z.string().url().nullable().optional(),
    branding_config: z.object({
        companyName: z.string().min(1).max(100).optional(),
        companyLogo: z.string().url().nullable().optional(),
        primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
        secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
        accentColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
        supportEmail: z.string().email().optional(),
        helpUrl: z.string().url().nullable().optional(),
        footerText: z.string().max(500).nullable().optional()
    }).optional(),
    settings: z.object({
        max_users: z.number().int().min(1).max(10000).optional(),
        max_trips: z.number().int().min(1).max(100000).optional(),
        features_enabled: z.array(z.string()).optional(),
        api_rate_limit: z.number().int().min(100).max(10000).optional()
    }).optional()
}).strict(); // Reject any additional fields
// White label request validation schema
export const whiteLabelRequestSchema = z.object({
    organization_id: z.number().int().positive(),
    business_name: z.string().min(1).max(100),
    business_type: z.string().min(1).max(50),
    website_url: z.string().url().nullable().optional(),
    contact_email: z.string().email(),
    contact_name: z.string().min(1).max(100),
    use_case: z.string().min(10).max(1000),
    expected_users: z.number().int().min(1).max(100000),
    custom_domain: z.string().min(1).max(100).nullable().optional(),
    additional_requirements: z.string().max(2000).nullable().optional()
}).strict();
// White label request review schema
export const whiteLabelReviewSchema = z.object({
    status: z.enum(['approved', 'rejected']),
    admin_notes: z.string().min(1).max(1000).optional(),
    approved_features: z.array(z.string()).optional(),
    rejection_reason: z.string().min(1).max(500).optional()
}).strict();
// Custom domain validation schema
export const customDomainSchema = z.object({
    domain: z.string().min(1).max(100).regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
    subdomain: z.string().min(1).max(50).regex(/^[a-zA-Z0-9-]+$/).optional(),
    organization_id: z.number().int().positive()
}).strict();
// Domain verification schema
export const domainVerificationSchema = z.object({
    verification_method: z.enum(['dns', 'file']).optional(),
    force_recheck: z.boolean().optional()
}).strict();
// User role update schema (for admin user management)
export const userRoleUpdateSchema = z.object({
    role: z.enum(['user', 'admin']),
    role_type: z.enum(['member', 'manager', 'admin']).optional(),
    permissions: z.array(z.string()).optional()
}).strict();
/**
 * Validation middleware factory
 */
export function validateAdminInput(schema: z.ZodSchema) {
    return (req: CustomRequest, res: Response, next: NextFunction): void | Response => {
        try {
            const validation = schema.safeParse(req.body);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code
                }));
                return res.status(400).json({
                    error: "Validation failed",
                    message: "Request body contains invalid or disallowed fields",
                    details: errors,
                    allowedFields: getSchemaFields(schema)
                });
            }
            // Replace req.body with validated data (this removes any extra fields)
            req.body = validation.data;
            return next();
        }
        catch (error) {
            console.error("Admin validation error:", error);
            return res.status(400).json({
                error: "Validation error",
                message: "Failed to validate request data"
            });
        }
    };
}
/**
 * Extract allowed fields from schema for error reporting
 */
function getSchemaFields(schema: z.ZodSchema): string[] {
    try {
        if (schema instanceof z.ZodObject) {
            return Object.keys(schema.shape);
        }
        return [];
    }
    catch {
        return [];
    }
}
/**
 * Middleware to validate organization access
 */
export function validateOrganizationAccess(req: CustomRequest, res: Response, next: NextFunction): Response | void {
    const orgId = parseInt(req.params.id);
    if (isNaN(orgId)) {
        return res.status(400).json({
            error: "Invalid organization ID",
            message: "Organization ID must be a valid number"
        });
    }
    // Super admins can access any organization
    if (req.user?.role === 'super_admin') {
        return next();
    }
    // Regular admins can only access their own organization
    if (req.user?.role === 'admin' && req.user.organization_id === orgId) {
        return next();
    }
    return res.status(403).json({
        error: "Access denied",
        message: "Insufficient permissions to access this organization"
    });
}
/**
 * Validate that only allowed operations are performed
 */
export function validateAdminOperation(allowedOperations: string[]) {
    return (req: CustomRequest, res: Response, next: NextFunction): Response | void => {
        const operation = req.method.toLowerCase();
        if (!allowedOperations.includes(operation)) {
            return res.status(405).json({
                error: "Method not allowed",
                message: `Operation ${operation.toUpperCase()} is not permitted on this endpoint`,
                allowedMethods: allowedOperations.map(op => op.toUpperCase())
            });
        }
        return next();
    };
}
/**
 * Audit logging for admin operations
 */
export function auditAdminOperation(operationType: string) {
    return (req: CustomRequest, res: Response, next: NextFunction): Response | void => {
        const originalSend = res.send;
        res.send = function (data: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */) {
            // Log successful admin operations
            if (res.statusCode < 400) {
                console.log('ADMIN_AUDIT:', {
                    operation: operationType,
                    userId: req.user?.id,
                    userRole: req.user?.role,
                    organizationId: req.user?.organization_id,
                    targetResource: req.params.id || 'N/A',
                    method: req.method,
                    ip: req.ip,
                    userAgent: req.get('user-agent'),
                    timestamp: new Date().toISOString(),
                    success: true
                });
            }
            return originalSend.call(this, data);
        };
        return next();
    };
}
