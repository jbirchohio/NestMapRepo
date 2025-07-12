import { Request, Response, NextFunction } from 'express.js';
import { z } from 'zod.js';
import { UnauthorizedError } from '../src/common/errors.js.js';

// Schema for organization access validation
const organizationAccessSchema = z.object({
  organizationId: z.string().uuid().optional(),
  headers: z.object({
    'x-organization-id': z.string().uuid().optional()
  }).passthrough()
});

/**
 * Middleware to validate organization access
 * Ensures the user has access to the specified organization
 */
export const validateOrganizationAccess = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get organization ID from request params, body, or headers
      const { organizationId } = req.params;
      const orgIdFromBody = req.body?.organizationId;
      const orgIdFromHeader = req.headers['x-organization-id'];
      
      // Use the first available organization ID in order of precedence
      const targetOrgId = organizationId || orgIdFromBody || orgIdFromHeader;
      
      if (!targetOrgId) {
        return next(); // No organization ID to validate
      }
      
      // If user is not authenticated, deny access
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      
      // If user is a super admin, allow access to any organization
      if (req.user.role === 'superadmin') {
        return next();
      }
      
      // For non-superadmin users, ensure they belong to the requested organization
      if (req.user.organizationId !== targetOrgId) {
        throw new UnauthorizedError('Access to the requested organization is denied');
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to ensure the request includes an organization context
 * Should be used after authentication middleware
 */
export const requireOrganizationContext = (req: Request, res: Response, next: NextFunction) => {
  const { organizationId } = req.params;
  const orgIdFromBody = req.body?.organizationId;
  const orgIdFromHeader = req.headers['x-organization-id'];
  
  // Check if organization ID is provided in any of the expected locations
  if (!organizationId && !orgIdFromBody && !orgIdFromHeader) {
    return res.status(400).json({
      success: false,
      error: 'Organization context is required. Please provide an organization ID in the URL, request body, or x-organization-id header.'
    });
  }
  
  // Attach the organization ID to the request object for easy access
  req.organizationId = organizationId || orgIdFromBody || orgIdFromHeader;
  next();
};

// Extend Express Request type to include organizationId
declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
    }
  }
}
