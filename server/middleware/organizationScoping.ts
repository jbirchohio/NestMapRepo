import { Request, Response, NextFunction } from 'express';

// Extend Express Request interface to include domain organization context
declare global {
  namespace Express {
    interface Request {
      domainOrganizationId?: number;
      isWhiteLabelDomain?: boolean;
      organizationId?: number;
      organizationFilter?: (orgId: number | null) => boolean;
    }
  }
}

/**
 * Critical middleware for multi-tenant organization scoping
 * Automatically injects organization context into all requests
 * Prevents cross-organization data access and enforces domain-based isolation
 */
export function injectOrganizationContext(req: Request, res: Response, next: NextFunction) {
  // Skip for public endpoints, frontend routes, and auth routes
  const publicPaths = ['/api/auth/', '/api/public/', '/api/health', '/api/share/', '/.well-known/'];
  const frontendPaths = ['/', '/trip/', '/share/', '/login', '/signup', '/demo'];
  
  // Skip authentication for public API endpoints
  if (publicPaths.some(path => req.path.includes(path))) {
    return next();
  }
  
  // Skip authentication for frontend routes (non-API)
  if (!req.path.startsWith('/api') || frontendPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Ensure user is authenticated for organization-scoped API endpoints
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Ensure user has organization context
  if (!req.user?.organizationId) {
    return res.status(403).json({ 
      message: 'Organization context required. Please contact your administrator.' 
    });
  }

  // CRITICAL: Enforce domain-based organization isolation for white-label domains
  if (req.isWhiteLabelDomain && req.domainOrganizationId) {
    // For white-label domains, ensure user's organization matches the domain's organization
    if (req.user.organizationId !== req.domainOrganizationId) {
      console.warn('SECURITY_VIOLATION: Cross-organization access attempt via white-label domain', {
        userId: req.user.id,
        userOrgId: req.user.organizationId,
        domainOrgId: req.domainOrganizationId,
        domain: req.headers.host,
        endpoint: req.path,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You cannot access this organization\'s data through this domain. Please use the correct domain for your organization or contact your administrator.'
      });
    }
    
    // Set organization context to the domain's organization for extra security
    req.organizationId = req.domainOrganizationId;
  } else {
    // For main domain, use user's organization
    req.organizationId = req.user.organizationId;
  }
  
  // Create organization filter function for queries
  req.organizationFilter = (orgId: number | null) => {
    return orgId === req.organizationId;
  };

  // Log successful organization context injection for audit trail
  console.log('Organization context injected:', {
    userId: req.user.id,
    organizationId: req.organizationId,
    isWhiteLabel: req.isWhiteLabelDomain || false,
    domain: req.headers.host,
    endpoint: req.path
  });

  next();
}

/**
 * Middleware to validate organization access for specific resources
 * Used for routes that accept organization ID as parameter
 */
export function validateOrganizationAccess(req: Request, res: Response, next: NextFunction) {
  const requestedOrgId = parseInt(req.params.organizationId || req.body.organizationId);
  
  if (requestedOrgId && requestedOrgId !== req.user?.organizationId) {
    console.warn('SECURITY_VIOLATION: Cross-organization access attempt', {
      userId: req.user?.id,
      userOrgId: req.user?.organizationId,
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
      
      console.log('Domain organization resolved:', {
        domain: host,
        organizationId: domainConfig.organizationId,
        status: domainConfig.status
      });
    }

    next();
  } catch (error) {
    console.error('Domain organization resolution error:', error);
    // Don't fail the request, just proceed without domain context
    next();
  }
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
      userId: req.user.id,
      organizationId: req.user.organizationId,
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
    organizationId: req.user.organizationId
  };

  next();
}

/**
 * Query helper to automatically add organization scoping
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