import type { Request, Response, NextFunction } from './express-augmentations.ts';
import { storage } from './storage.ts';

// Define a base interface for the User that can be extended
export interface BaseUser {
  id: string;
  organizationId: string | null;
  role: string;
  permissions: string[];
  [key: string]: any; // Allow for additional properties
}

// Extend Express types to include our custom properties
declare global {
  namespace Express {
    // Define the User interface that extends BaseUser
    interface User extends BaseUser {}
    
    // Extend the Request interface with our custom properties
    interface Request {
      user?: User;
      organizationId?: string | null;
      organizationContext?: {
        id: string | null;
        canAccessOrganization: (orgId: string | null) => boolean;
        enforceOrganizationAccess: (orgId: string | null) => void;
      };
      organizationFilter?: (orgId: string | null | undefined) => boolean;
      isWhiteLabelDomain?: boolean;
      domainOrganizationId?: string | null;
      analyticsScope?: {
        organizationId: string;
        startDate?: Date;
        endDate?: Date;
      };
    }
  }
}

// Export the extended Request type for use in other files
export type OrganizationRequest = Express.Request;

/**
 * Middleware to establish organization context for authenticated users
 * This is critical for multi-tenant security isolation
 */
export function organizationContextMiddleware(req: Request, res: Response, next: NextFunction) {
    // Skip for public endpoints that don't require organization context
    const publicPaths = ['/api/auth', '/api/health', '/api/amadeus', '/.well-known'];
    const isPublicPath = publicPaths.some(path => req.path.startsWith(path));
    if (isPublicPath) {
        return next();
    }
    // For authenticated routes, establish organization context
    if (req.user) {
        const userOrgId = req.user.organization_id;
        // Set organization context on request
        req.organization_id = userOrgId;
        req.organizationContext = {
            id: userOrgId || null,
            /**
             * Check if user can access data from a specific organization
             */
            canAccessOrganization: (targetOrgId: number | null): boolean => {
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
            enforceOrganizationAccess: (targetOrgId: number | null): void => {
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
export function withOrganizationFilter<T extends Record<string, any>>(req: Request, baseWhere: T = {} as T): T & {
    organizationId?: number | null;
} {
    const orgId = req.organization_id;
    // For super admins, don't add organization filter unless specifically requested
    if (req.user?.role === 'super_admin' && !req.query.organization_id) {
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
export function setOrganizationId<T extends Record<string, any>>(req: Request, data: T): T & {
    organizationId: number | null;
} {
    const orgId = req.organization_id;
    // Ensure organization ID is set correctly
    if (data.organization_id && data.organization_id !== orgId) {
        // User is trying to set different org ID than their own
        if (req.user?.role !== 'super_admin') {
            throw new Error('Cannot create resources for different organization');
        }
    }
    return {
        ...data,
        organizationId: data.organization_id || orgId
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
            req.organizationContext.enforceOrganizationAccess(trip.organization_id);
        }
        next();
    }
    catch (error) {
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
        console.log(`[ORG_ACCESS] User ${req.user?.id} (org: ${req.organization_id}) ${action} ${resourceType}${resourceId ? ` ${resourceId}` : ''}`);
    }
}
