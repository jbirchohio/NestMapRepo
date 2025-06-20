import { Request, Response, NextFunction } from 'express';
import { eq, SQL, Column } from 'drizzle-orm';
import { AuthUser, UserRole } from '../src/types/auth-user';

interface Headers {
  [key: string]: string | string[] | undefined;
}

// Extend Express types
declare global {
  namespace Express {
    // Define the User interface that will be available on the Request object
    interface User extends AuthUser {}
    
    // Extend the Request interface
    interface Request {
      user?: User;
      organizationId: string;
      organizationFilter: (orgId: string | null) => boolean;
      domainOrganizationId?: string;
      isWhiteLabelDomain?: boolean;
      analyticsScope?: {
        organizationId: string;
        startDate?: Date;
        endDate?: Date;
      };
    }
  }
}

type AuthenticatedRequest = Request & {
  user: Express.User;  // Using the extended Express User type
  organizationId: string;
  organizationFilter: (orgId: string | null) => boolean;
  domainOrganizationId?: string;
  isWhiteLabelDomain?: boolean;
  analyticsScope?: {
    organizationId: string;
    startDate?: Date;
    endDate?: Date;
  };
};

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
export function injectOrganizationContext(req: Request, res: Response, next: NextFunction) {
  // Skip for public endpoints and auth routes
  const publicPaths = ['/api/auth/', '/api/public/', '/api/health', '/api/share/', '/.well-known/'];
  const frontendPaths = ['/', '/trip/', '/share/', '/login', '/signup', '/demo'];
  
  // Skip for public API endpoints
  if (publicPaths.some(path => req.path.includes(path))) {
    return next();
  }
  
  // Skip for frontend routes (non-API)
  if (!req.path.startsWith('/api') || frontendPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Ensure user is authenticated for organization-scoped API endpoints
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Ensure user has organization context
  if (!req.user.organizationId) {
    return res.status(403).json({ 
      message: 'Organization context required. Please contact your administrator.' 
    });
  }

  // CRITICAL: Enforce domain-based organization isolation for white-label domains
  if (req.isWhiteLabelDomain && req.domainOrganizationId) {
    // For white-label domains, ensure user's organization matches the domain's organization
    if (req.user.organizationId !== req.domainOrganizationId) {
      console.warn('SECURITY_VIOLATION: Cross-organization access attempt via white-label domain', {
        user_id: req.user.id,
        userOrgId: req.user.organizationId,
        domainOrgId: req.domainOrganizationId,
        domain: req.headers.host,
        endpoint: req.path,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You cannot access this organization\'s data through this domain.'
      });
    }
    
    // Set organization context to the domain's organization for extra security
    req.organizationId = req.domainOrganizationId;
  } else {
    // For main domain, use user's organization
    req.organizationId = req.user.organizationId;
  }
  
  // Create organization filter function for queries
  req.organizationFilter = (orgId: string | null) => {
    return orgId === req.organizationId;
  };

  next();
}

/**
 * Middleware to validate organization access for specific resources
 * Used for routes that accept organization ID as parameter
 */
export function validateOrganizationAccess(req: Request, res: Response, next: NextFunction) {
  const requestedOrgId = req.params.organization_id || req.body.organization_id;
  
  if (requestedOrgId && requestedOrgId !== req.organizationId) {
    console.warn('SECURITY_VIOLATION: Cross-organization access attempt', {
      user_id: req.user?.id,
      userOrgId: req.organizationId,
      requestedOrgId,
      endpoint: req.path,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).json({ 
      message: 'Access denied: Insufficient organization permissions' 
    });
  }

  next();
}

/**
 * Query helper to automatically add organization scoping to database queries
 * This ensures all database operations are properly scoped to the user's organization
 */
export function addOrganizationScope<T extends { organizationId: Column<any> }>(
  baseQuery: any,
  req: Request,
  table: T
) {
  if (!req.organizationId) {
    throw new Error('Organization context required for scoped queries');
  }

  // Add organization filter using the table's organizationId column
  return baseQuery.where(eq(table.organizationId, req.organizationId));
}

/**
 * Validation helper for organization-scoped inserts
 * Automatically injects organization ID into create operations
 */
export function validateOrganizationData(data: any, req: Request) {
  if (!req.organizationId) {
    throw new Error('Organization context required');
  }

  // Automatically inject organization ID into create operations
  return {
    ...data,
    organizationId: req.organizationId
  };
}

/**
 * Analytics access control middleware
 * Ensures only organization admins can access analytics
 */
export function requireAnalyticsAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Type assertion for req.user to ensure it's treated as AuthUser
  const user = req.user as AuthUser;
  
  // Check if user has analytics permissions for their organization
  const hasAnalyticsAccess = user.role === UserRole.ADMIN || 
                            user.role === UserRole.SUPER_ADMIN ||
                            (user.permissions && Array.isArray(user.permissions) && user.permissions.includes('ACCESS_ANALYTICS'));

  if (!hasAnalyticsAccess) {
    console.warn('ANALYTICS_ACCESS_DENIED:', {
      user_id: req.user.id,
      organizationId: req.organizationId,
      role: req.user.role,
      endpoint: req.path,
      timestamp: new Date().toISOString()
    });

    return res.status(403).json({ 
      message: 'Analytics access requires administrator privileges' 
    });
  }

  // Ensure analytics are scoped to user's organization only
  req.analyticsScope = {
    organizationId: req.organizationId
  };

  next();
}

/**
 * Domain-based organization resolution middleware
 * Resolves organization context from custom domains for white-label routing
 */
export async function resolveDomainOrganization(req: Request, res: Response, next: NextFunction) {
  const host = req.headers.host as string | undefined;
  if (!host) {
    return next();
  }

  try {
    // Skip for localhost and main domain
    if (host.includes('localhost') || host === 'nestmap.com' || host === 'www.nestmap.com') {
      return next();
    }

    // Import database connection
    const { db } = await import('../db');
    const { customDomains } = await import('../../shared/schema');
    const { eq } = await import('drizzle-orm');

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
        return res.status(503).json({
          error: 'Domain not active',
          message: 'This domain is currently being configured. Please try again later.'
        });
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
