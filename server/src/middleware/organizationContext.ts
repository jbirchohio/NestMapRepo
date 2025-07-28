import { eq } from '../utils/drizzle-shim';
import { Response, NextFunction, Request as ExpressRequest } from 'express';
import { logSecurityEvent } from '../security-event-logger';

// Define missing types inline
type UserRole = 'user' | 'admin' | 'super_admin' | 'SUPER_ADMIN' | 'ADMIN' | string;
interface AppUser {
  id: string;
  userId?: string;
  email: string;
  emailVerified?: boolean;
  name?: string;
  avatarUrl?: string | null;
  role: UserRole;
  organizationId: string;
  permissions?: string[];
  [key: string]: any;
}
// Use Express.Request everywhere for compatibility
type AuthenticatedRequest = Express.Request & {
  user: AppUser;
  organizationId: string;
  domainOrganizationId?: string;
  isWhiteLabelDomain?: boolean;
  organizationFilter?: (orgId: string | null) => boolean;
  analyticsScope?: {
    organizationId: string;
    startDate?: Date;
    endDate?: Date;
  };
};
// For addOrganizationScope generic
type Column<T> = { name: string; };

// Global type augmentation for Express
declare global {
  namespace Express {
    interface Request {
      // Use 'any' to avoid type conflicts with other global augmentations
  user?: unknown;
      organizationId?: string;
      domainOrganizationId?: string;
      isWhiteLabelDomain?: boolean;
      organizationFilter?: (orgId: string | null) => boolean;
      analyticsScope?: {
        organizationId: string;
        startDate?: Date;
        endDate?: Date;
      };
    }
  }
}

// Type guard to check if a request is authenticated
export function isAuthenticatedRequest(req: ExpressRequest): req is AuthenticatedRequest {
  return !!(req as AuthenticatedRequest).user?.id && 
         !!(req as AuthenticatedRequest).organizationId;
}

// No need to augment express-serve-static-core again, already handled above

/**
 * Type for our middleware functions that handle authenticated requests
 */
export type AuthenticatedMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void>;

/**
 * Enhanced organization context middleware for enterprise-grade multi-tenant isolation
 * 
 * This middleware provides a standardized approach to organization scoping across
 * all routes and services. It ensures proper data isolation between organizations
 * and prevents cross-organization access attempts.
 */

/**
 * Core organization context middleware
 * Automatically injects organization context into all requests
 * Prevents cross-organization data access
 */
  req: import('express').Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip for public endpoints and auth routes
  const publicPaths = ['/api/auth/', '/api/public/', '/api/health', '/api/share/', '/.well-known/'];
  const frontendPaths = ['/', '/trip/', '/share/', '/login', '/signup', '/demo'];
  
  // Skip for public API endpoints
  const reqAny = req as unknown as any;
  if (reqAny.path && publicPaths.some((p: string) => reqAny.path.includes(p))) {
    return next();
  }
  // Skip for frontend routes (non-API)
  if (!reqAny.path || !reqAny.path.startsWith('/api') || frontendPaths.some((p: string) => reqAny.path.startsWith(p))) {
    return next();
  }
  // Ensure user is authenticated for organization-scoped API endpoints
  if (!reqAny.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  // Ensure user has organization context
  if (!reqAny.user.organizationId) {
    res.status(403).json({ 
      message: 'Organization context required. Please contact your administrator.' 
    });
    return;
  }
  // CRITICAL: Enforce domain-based organization isolation for white-label domains
  if (reqAny.isWhiteLabelDomain && reqAny.domainOrganizationId) {
    // For white-label domains, ensure user's organization matches the domain's organization
    if (reqAny.user.organizationId !== reqAny.domainOrganizationId) {
  console.warn('SECURITY_VIOLATION: Cross-organization access attempt via white-label domain', {
        user_id: reqAny.user.id,
        userOrgId: reqAny.user.organizationId,
        domainOrgId: reqAny.domainOrganizationId,
  domain: req.headers && (req.headers as any).host ? (req.headers as any).host : 'unknown',
        endpoint: reqAny.path,
        ip: reqAny.ip,
        timestamp: new Date().toISOString()
      });
      res.status(403).json({ 
        error: 'Access denied',
        message: 'You cannot access this organization\'s data through this domain.'
      });
      return;
    }
    // Set organization context to the domain's organization for extra security
    reqAny.organizationId = reqAny.domainOrganizationId;
  } else {
    // Set organization context based on user's organization
    if (reqAny.user) {
      reqAny.organizationId = reqAny.user.organizationId;
      reqAny.organizationFilter = (orgId: string | null) => {
        // Super admins can access all organizations
        if (reqAny.user?.role === 'super_admin' || reqAny.user?.role === 'SUPER_ADMIN') return true;
        // Regular users can only access their own organization
        return orgId === reqAny.user?.organizationId;
      };
    }
  }
  next();
}

/**
 * Middleware to validate organization access for specific resources
 * Used for routes that accept organization ID as parameter
 */
export const validateOrganizationAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const requestedOrgId = (req.params?.organization_id || req.body?.organization_id) ?? undefined;
  
  if (requestedOrgId && requestedOrgId !== req.organizationId) {
    console.warn('SECURITY_VIOLATION: Cross-organization access attempt', {
      user_id: req.user?.id,
      userOrgId: req.organizationId,
      requestedOrgId,
      endpoint: req.path,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have access to this organization',
    });
    return;
  }

  next();
}

/**
 * Query helper to automatically add organization scoping to database queries
 * This ensures all database operations are properly scoped to the user's organization
 */
export const addOrganizationScope = <T extends { organizationId: Column<any> }>(
  baseQuery: any,
  req: AuthenticatedRequest,
  table: T
) => {
  if (!req.organizationId) {
    throw new Error('Organization context required for scoped queries');
  }
  // Add organization filter using the table's organizationId column
  return baseQuery.where(eq(table.organizationId, req.organizationId));
};

/**
 * Validation helper for organization-scoped inserts
 * Automatically injects organization ID into create operations
 */
export const validateOrganizationData = (data: any, req: AuthenticatedRequest) => {
  if (!req.organizationId) {
    throw new Error('Organization context required');
  }

  // Automatically inject organization ID into create operations
  return {
    ...data,
    organizationId: req.organizationId ?? ''
  };
}

/**
 * Analytics access control middleware
 * Ensures only organization admins can access analytics
 */
export const requireAnalyticsAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  // Type assertion for req.user to ensure it's treated as AuthUser
  const user = req.user;
  
  // Check if user has analytics permissions for their organization
  const hasAnalyticsAccess = user.role === 'admin' || 
                            user.role === 'super_admin' ||
                            user.role === 'ADMIN' ||
                            user.role === 'SUPER_ADMIN' ||
                            (user.permissions && Array.isArray(user.permissions) && user.permissions.includes('ACCESS_ANALYTICS'));

  if (!hasAnalyticsAccess) {
    await logSecurityEvent({
      event: 'unauthorized_analytics_access',
      user_id: req.user.id,
      organizationId: req.organizationId,
      role: req.user.role,
      endpoint: req.path,
      timestamp: new Date().toISOString()
    });

    res.status(403).json({ 
      message: 'Analytics access requires administrator privileges' 
    });
    return;
  }

  // Ensure analytics are scoped to user's organization only
  req.analyticsScope = {
    organizationId: req.organizationId ?? ''
  };

  next();
}

/**
 * Domain-based organization resolution middleware
 * Resolves organization context from custom domains for white-label routing
 */
export const resolveDomainOrganization = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const host = req.headers?.host as string | undefined;
  if (!host) {
    next();
    return;
  }

  // Skip for localhost and main domain
  if (host.includes('localhost') || host.includes('nestmap.com')) {
    next();
    return;
  }

  try {
    // Import database connection
    const { db } = await import('../db.js');
    const { customDomains } = await import('../db/schema');
    const { eq } = await import('../utils/drizzle-shim.js');

    // Look up organization by custom domain
    const [domainConfig] = await db
      .select({
        organizationId: customDomains.organizationId,
        status: customDomains.status,
        domain: customDomains.domainName
      })
      .from(customDomains)
      .where(eq(customDomains.domainName, host))
      .limit(1);

    if (domainConfig) {
      // Verify domain is active
      if (domainConfig.status !== 'active') {
        res.status(503).json({
          error: 'Domain not active',
          message: 'This domain is currently being configured. Please try again later.'
        });
        return;
      }

      // Set domain organization context for later validation
      req.domainOrganizationId = domainConfig.organizationId;
      req.isWhiteLabelDomain = true;
    }

    next();
  } catch (error) {
    console.error('Domain organization resolution error:', error);
    // Don't fail the request, just proceed without domain context
    next();
  }
}



