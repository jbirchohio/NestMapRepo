import { Request, Response, NextFunction } from 'express';

/**
 * Critical middleware for multi-tenant organization scoping
 * Automatically injects organization context into all requests
 * Prevents cross-organization data access
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

  // Inject organization ID into request for automatic query scoping
  req.organizationId = req.user.organizationId;
  
  // Create organization filter function for queries
  req.organizationFilter = (orgId: number | null) => {
    return orgId === req.user?.organizationId;
  };

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
 * Resolves organization context from subdomain for white-label routing
 */
export async function resolveDomainOrganization(req: Request, res: Response, next: NextFunction) {
  const host = req.headers.host;
  if (!host) {
    return next();
  }

  // Extract subdomain (e.g., 'demo' from 'demo.nestmap.com')
  const subdomain = host.split('.')[0];
  
  // Skip for localhost and main domain
  if (host.includes('localhost') || subdomain === 'nestmap' || subdomain === 'www') {
    return next();
  }

  // For now, skip domain-based organization lookup to prevent circular dependency
  // This will be enabled once the database connection is stable
  next();
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