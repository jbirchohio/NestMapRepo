import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';

/**
 * Enhanced organization context middleware for enterprise-grade multi-tenant isolation
 * 
 * This middleware provides a standardized approach to organization scoping across
 * all routes and services. It ensures proper data isolation between organizations
 * and prevents cross-organization access attempts.
 */

// Extend Express Request interface for organization context
declare global {
  namespace Express {
    interface Request {
      // Organization context
      organizationId: number;
      organizationFilter: (orgId: number | null) => boolean;
      
      // White label context
      domainOrganizationId?: number;
      isWhiteLabelDomain?: boolean;
      
      // Analytics context
      analyticsScope?: {
        organizationId: number;
        startDate?: Date;
        endDate?: Date;
      };
    }
  }
}

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
  if (!req.user.organization_id) {
    return res.status(403).json({ 
      message: 'Organization context required. Please contact your administrator.' 
    });
  }

  // CRITICAL: Enforce domain-based organization isolation for white-label domains
  if (req.isWhiteLabelDomain && req.domainOrganizationId) {
    // For white-label domains, ensure user's organization matches the domain's organization
    if (req.user.organization_id !== req.domainOrganizationId) {
      console.warn('SECURITY_VIOLATION: Cross-organization access attempt via white-label domain', {
        user_id: req.user.id,
        userOrgId: req.user.organization_id,
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
    req.organizationId = req.user.organization_id;
  }
  
  // Create organization filter function for queries
  req.organizationFilter = (orgId: number | null) => {
    return orgId === req.organizationId;
  };

  next();
}

/**
 * Middleware to validate organization access for specific resources
 * Used for routes that accept organization ID as parameter
 */
export function validateOrganizationAccess(req: Request, res: Response, next: NextFunction) {
  const requestedOrgId = parseInt(req.params.organization_id || req.body.organization_id);
  
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
export function addOrganizationScope(baseQuery: any, req: Request, tableName: string) {
  if (!req.organizationId) {
    throw new Error('Organization context required for scoped queries');
  }

  // Add organization_id filter to all queries
  return baseQuery.where(eq(`${tableName}.organization_id`, req.organizationId));
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
    organization_id: req.organizationId
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

  // Check if user has analytics permissions for their organization
  const hasAnalyticsAccess = req.user.role === 'admin' || 
                            req.user.role === 'manager' ||
                            (req.user.permissions && req.user.permissions.includes('ACCESS_ANALYTICS'));

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
  const host = req.headers.host;
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
        organizationId: customDomains.organization_id,
        status: customDomains.status,
        domain: customDomains.domain
      })
      .from(customDomains)
      .where(eq(customDomains.domain, host))
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
