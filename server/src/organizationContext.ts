import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

// Extend Express Request interface to include organization context
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        organizationId?: string;
        role?: string;
        email?: string;
      };
      organizationId?: string | undefined;
      organizationContext?: {
        id: string | number | null;
        canAccessOrganization: (orgId: string | number | null) => boolean;
        enforceOrganizationAccess: (orgId: string | number | null) => void;
      };
    }
  }
}

/**
 * Middleware to establish organization context for authenticated users
 * This is critical for multi-tenant security isolation
 */
export function organizationContextMiddleware(req: Request, _res: Response, next: NextFunction) {
  // Skip for public endpoints that don't require organization context
  const publicPaths = ['/api/auth', '/api/health', '/api/amadeus', '/.well-known'];
  const isPublicPath = publicPaths.some(path => (req.path ?? '').startsWith(path));
  
  if (isPublicPath) {
    return next();
  }

  // For authenticated routes, establish organization context
  if (req.user) {
    const userOrgId = req.user.organizationId ?? null;
    // Set organization context on request
    req.organizationId = userOrgId ?? undefined;
    req.organizationContext = {
      id: userOrgId,
      /**
       * Check if user can access data from a specific organization
       */
      canAccessOrganization: (targetOrgId: string | number | null): boolean => {
        // Super admins can access any organization
        if (req.user?.role === 'super_admin') {
          return true;
        }
        // Users can only access their own organization's data
        // Handle null organization (personal accounts)
        if (userOrgId === null && targetOrgId === null) {
          return true;
        }
        return userOrgId === targetOrgId;
      },
      /**
       * Throw error if user cannot access organization data
       */
      enforceOrganizationAccess: (targetOrgId: string | number | null): void => {
        if (!req.organizationContext!.canAccessOrganization(targetOrgId)) {
          throw new Error(`Access denied: Cannot access organization ${targetOrgId} from organization ${userOrgId}`);
        }
      }
    };
  }
  
  next();
}

/**
 * Utility function to add organization filtering to database queries
 */
export function withOrganizationFilter<T extends Record<string, any>>(
  req: Request,
  baseWhere: T = {} as T
): T & { organizationId?: string | number | null } {
  const orgId = req.organizationId;
  // For super admins, don't add organization filter unless specifically requested
  if (req.user?.role === 'super_admin' && !req.query.organizationId) {
    return baseWhere;
  }
  // Add organization filter for regular users
  return {
    ...baseWhere,
    organizationId: orgId
  };
}

/**
 * Middleware to enforce organization context on specific routes
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
 * Utility to validate and set organization ID on create operations
 */
export function setOrganizationId<T extends Record<string, any>>(
  req: Request,
  data: T
): T & { organizationId: string | number | null } {
  const orgId = req.organizationId;
  // Ensure organization ID is set correctly
  if (data.organizationId && data.organizationId !== orgId) {
    // User is trying to set different org ID than their own
    if (req.user?.role !== 'super_admin') {
      throw new Error('Cannot create resources for different organization');
    }
  }
  return {
    ...data,
    organizationId: data.organizationId || orgId
  };
}

/**
 * Route-specific middleware for trip operations
 */
export async function validateTripAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const tripId = parseInt(req.params.trip_id || req.params.id);
    if (!tripId) {
      return next();
    }
    
    const trip = await storage.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    
    // Check organization access
    if (req.organizationContext) {
      req.organizationContext.enforceOrganizationAccess(trip.organizationId);
    }
    
    next();
  } catch (error) {
    res.status(403).json({ 
      error: 'Access denied',
      message: error instanceof Error ? error.message : 'Organization access violation'
    });
  }
}

/**
 * Utility function to log organization access for audit purposes
 */
export function logOrganizationAccess(req: Request, action: string, resourceType: string, resourceId?: number) {
  if (process.env.NODE_ENV === 'production') {
    console.log(`[ORG_ACCESS] User ${req.user?.id} (org: ${req.organizationId}) ${action} ${resourceType}${resourceId ? ` ${resourceId}` : ''}`);
  }
}

