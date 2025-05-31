import { Request, Response, NextFunction } from 'express';
import { getUserById } from '../auth';

// Extend Express Request interface for unified authorization
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        organization_id?: number | null;
        role?: string;
        displayName?: string;
        [key: string]: any;
      };
      organizationId?: number | null;
      organizationContext?: {
        id: number | null;
        canAccessOrganization: (orgId: number | null) => boolean;
        enforceOrganizationAccess: (orgId: number | null) => void;
      };
    }
  }
}

/**
 * Unified Authorization Middleware
 * Consolidates all authentication, organization context, and tenant isolation logic
 * Replaces: organizationContextMiddleware, injectOrganizationContext, enforceOrganizationSecurity
 */
export function unifiedAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Define paths that don't require authentication
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/register', 
    '/api/auth/logout',
    '/api/health',
    '/api/templates',
    '/api/share/',
    '/.well-known/',
    '/api/amadeus'
  ];

  // Skip authentication for public paths and non-API routes
  if (!req.path.startsWith('/api') || publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Session-based authentication check
  if (!req.session || !(req.session as any).userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Get user data and establish organization context
  const userId = (req.session as any).userId;
  
  getUserById(userId)
    .then(user => {
      if (!user) {
        // Clear invalid session
        delete (req.session as any).userId;
        return res.status(401).json({ message: "Invalid session" });
      }

      // Populate unified user context
      req.user = {
        id: user.id,
        email: user.email,
        organization_id: user.organizationId,
        role: user.role,
        displayName: user.displayName
      };

      // Set organization context for tenant isolation
      req.organizationId = user.organizationId;

      // Create organization context utilities
      req.organizationContext = {
        id: user.organizationId,
        
        canAccessOrganization: (targetOrgId: number | null): boolean => {
          // Super admins can access any organization
          if (user.role === 'super_admin') {
            return true;
          }
          
          // Regular users can only access their own organization
          return user.organizationId === targetOrgId;
        },
        
        enforceOrganizationAccess: (targetOrgId: number | null): void => {
          if (!req.organizationContext!.canAccessOrganization(targetOrgId)) {
            throw new Error('Access denied: Cannot access resources from other organizations');
          }
        }
      };

      next();
    })
    .catch(error => {
      console.error('Authentication error:', error);
      res.status(500).json({ message: "Authentication failed" });
    });
}

/**
 * Organization-scoped database query helper
 * Automatically adds organization filtering to queries
 */
export function withOrganizationScope<T extends Record<string, any>>(
  req: Request,
  baseWhere: T = {} as T
): T & { organization_id?: number | null } {
  // Super admins bypass organization filtering unless explicitly requested
  if (req.user?.role === 'super_admin' && !req.query.organizationId) {
    return baseWhere;
  }
  
  // Add organization filter for all other users
  return {
    ...baseWhere,
    organization_id: req.organizationId
  };
}

/**
 * Validate organization access for specific resource
 */
export function validateOrganizationAccess(req: Request, resourceOrgId: number | null): boolean {
  if (!req.organizationContext) {
    return false;
  }
  
  return req.organizationContext.canAccessOrganization(resourceOrgId);
}

/**
 * Middleware to require organization context (for routes that need it)
 */
export function requireOrganizationContext(req: Request, res: Response, next: NextFunction) {
  if (!req.organizationContext) {
    return res.status(401).json({ 
      error: 'Organization context required',
      message: 'This endpoint requires authenticated user with organization context'
    });
  }
  
  next();
}

/**
 * Admin role validation middleware
 */
export function requireAdminRole(req: Request, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    return res.status(403).json({ 
      message: "Access denied: Admin role required" 
    });
  }
  
  next();
}

/**
 * Super admin role validation middleware
 */
export function requireSuperAdminRole(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ 
      message: "Access denied: Super admin role required" 
    });
  }
  
  next();
}