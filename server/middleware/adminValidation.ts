import { z } from "zod";
import { Request, Response, NextFunction } from "express";

/**
 * Admin Input Validation Middleware
 * Provides strict validation for administrative endpoints in consumer app
 */

// User role update schema (for admin user management)
export const userRoleUpdateSchema = z.object({
  role: z.enum(['user', 'admin']),
  permissions: z.array(z.string()).optional()
}).strict();

// Creator status update schema
export const creatorStatusUpdateSchema = z.object({
  creator_status: z.enum(['none', 'pending', 'approved', 'verified', 'suspended']),
  creator_tier: z.enum(['new', 'trusted', 'verified', 'partner']).optional(),
  admin_notes: z.string().max(1000).optional()
}).strict();

// Template moderation schema
export const templateModerationSchema = z.object({
  status: z.enum(['draft', 'published', 'archived', 'removed']),
  featured: z.boolean().optional(),
  removal_reason: z.string().max(500).optional(),
  admin_notes: z.string().max(1000).optional()
}).strict();

// Platform settings schema
export const platformSettingsSchema = z.object({
  commission_rate: z.number().min(0).max(0.5).optional(), // 0-50% commission
  stripe_fee_model: z.enum(['platform_pays', 'seller_pays']).optional(),
  template_review_required: z.boolean().optional(),
  auto_approve_verified_creators: z.boolean().optional(),
  max_template_price: z.number().positive().optional(),
  min_template_price: z.number().min(0).optional()
}).strict();

/**
 * Validation middleware factory
 */
export function validateAdminInput(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
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
      next();
      
    } catch (error) {
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
  } catch {
    return [];
  }
}

/**
 * Middleware to validate admin access
 */
export function validateAdminAccess(req: Request, res: Response, next: NextFunction) {
  // Only admins can access admin endpoints
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      error: "Access denied",
      message: "Admin privileges required"
    });
  }
  
  next();
}

/**
 * Validate that only allowed operations are performed
 */
export function validateAdminOperation(allowedOperations: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const operation = req.method.toLowerCase();
    
    if (!allowedOperations.includes(operation)) {
      return res.status(405).json({
        error: "Method not allowed",
        message: `Operation ${operation.toUpperCase()} is not permitted on this endpoint`,
        allowedMethods: allowedOperations.map(op => op.toUpperCase())
      });
    }
    
    next();
  };
}

/**
 * Audit logging for admin operations
 */
export function auditAdminOperation(operationType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log successful admin operations
      if (res.statusCode < 400) {
        console.log('ADMIN_AUDIT:', {
          operation: operationType,
          userId: req.user?.id,
          userRole: req.user?.role,
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
    
    next();
  };
}