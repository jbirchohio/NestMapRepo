import { Response, NextFunction, Request as ExpressRequest } from 'express';
import { db } from '../db';
import { customDomains } from '../db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { v4 as uuidv4, validate as validateUuid } from 'uuid';
import { AuthUser, UserRole } from '../src/types/auth-user';

// =============================================
// Type Definitions
// =============================================

/**
 * Custom properties we add to the Express Request object
 */
export interface CustomRequest extends ExpressRequest {
  // Custom properties
  user?: AuthUser;
  organizationId?: string;
  domainOrganizationId?: string;
  isWhiteLabelDomain?: boolean;
  organizationContext?: OrganizationContext;
  analyticsScope?: AnalyticsScope;
  organizationFilter?: (orgId: string | null) => boolean;
  
  // Standard Express properties we use
  path: string;
  ip: string;
  method: string;
  params: Record<string, string>;
  body: any;
  query: Record<string, any>;
  headers: Record<string, string | string[] | undefined>;
  get(name: string): string | undefined;
}

/**
 * Represents an authenticated request with required user and organization context
 */
export interface AuthenticatedRequest extends CustomRequest {
  user: AuthUser;
  organizationId: string;
  organizationFilter: (orgId: string | null) => boolean;
}

/**
 * Organization context attached to requests
 */
interface OrganizationContext {
  organizationId: string;
  isWhiteLabelDomain: boolean;
  domainOrganizationId?: string;
  canAccessOrganization: (orgId: string | null) => boolean;
  requireSameOrganization: (orgId: string | null) => boolean;
}

/**
 * Analytics scope for organization-based filtering
 */
interface AnalyticsScope {
  organizationId: string;
  startDate?: Date;
  endDate?: Date;
}

// =============================================
// Type Guards
// =============================================

/**
 * Type guard to check if a user is authenticated with valid organization context
 */
export function isAuthenticatedUser(user: unknown): user is AuthUser {
  return (
    user !== null &&
    typeof user === 'object' &&
    'id' in user &&
    'role' in user &&
    'organizationId' in user &&
    (user.organizationId === null || validateUuid(String(user.organizationId)))
  );
}

/**
 * Type guard to check if a request is authenticated with organization context
 */
export function isAuthenticatedRequest(req: CustomRequest): req is AuthenticatedRequest {
  return (
    isAuthenticatedUser(req.user) &&
    !!req.organizationId &&
    validateUuid(req.organizationId) &&
    typeof req.organizationFilter === 'function'
  );
}

// =============================================
// Middleware Functions
// =============================================

/**
 * Critical middleware for multi-tenant organization scoping
 * Automatically injects organization context into all requests
 * and enforces proper access controls
 */
export function injectOrganizationContext(
  req: CustomRequest,
  res: Response,
  next: NextFunction
) {
  // Type guard to ensure we have a valid authenticated request
  if (!isAuthenticatedRequest(req)) {
    return next(new Error('Authentication required'));
  }

  // Skip for public endpoints, frontend routes, and auth routes
  const publicPaths = ['/api/auth/', '/api/public/', '/api/health', '/api/share/', '/.well-known/'];
  const frontendPaths = ['/', '/trip/', '/share/', '/login', '/signup', '/demo'];
  const currentPath = req.path;
  
  // Skip authentication for public API endpoints
  if (publicPaths.some(path => currentPath.includes(path)) ||
      !currentPath.startsWith('/api') || 
      frontendPaths.some(path => currentPath.startsWith(path))) {
    return next();
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
        message: 'You cannot access this organization\'s data through this domain.'
      });
    }
    
    // Set organization context to the domain's organization for extra security
    req.organizationId = req.domainOrganizationId;
  } else {
    // For main domain, use user's organization
    if (!req.user.organizationId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'User is not associated with an organization.'
      });
    }
    req.organizationId = req.user.organizationId;
  }
  
  // Create organization filter function for queries
  req.organizationFilter = (orgId: string | null) => orgId === req.organizationId;

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
export function validateOrganizationAccess(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) {
  const requestedOrgId = req.params.organizationId || req.body.organizationId;
  
  if (requestedOrgId && requestedOrgId !== req.organizationId) {
    console.warn('SECURITY_VIOLATION: Cross-organization access attempt', {
      userId: req.user.id,
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
 * Domain-based organization resolution middleware
 * Resolves organization context from custom domains for white-label routing
 */
export async function resolveDomainOrganization(
  req: CustomRequest, 
  res: Response, 
  next: NextFunction
) {
  const host = req.headers.host;
  if (!host) {
    return next();
  }

  try {
    // Skip for localhost and main domain
    if (host.includes('localhost') || host === 'nestmap.com' || host === 'www.nestmap.com') {
      return next();
    }

    // Look up organization by custom domain
    const [domainConfig] = await db
      .select({
        organizationId: customDomains.organizationId,
        status: customDomains.status,
        domain: customDomains.domainName
      })
      .from(customDomains)
      .where(eq(customDomains.domainName, String(host)))
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
export function requireAnalyticsAccess(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) {
  // Check if user has analytics permissions for their organization
  const hasAnalyticsAccess = 
    req.user.role === UserRole.ADMIN || 
    req.user.role === UserRole.SUPER_ADMIN ||
    req.user.permissions?.includes('ACCESS_ANALYTICS') === true;

  if (!hasAnalyticsAccess) {
    console.warn('ANALYTICS_ACCESS_DENIED:', {
      userId: req.user.id,
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
 * Query helper to automatically add organization scoping
 */
export function addOrganizationScope<T extends { organizationId: any }>(
  baseQuery: any,
  req: AuthenticatedRequest,
  table: T
) {
  if (!req.organizationId) {
    throw new Error('Organization context required for scoped queries');
  }

  if (!validateUuid(req.organizationId)) {
    throw new Error('Invalid organization ID format');
  }

  // Add organization_id filter to the query
  return baseQuery.where(eq(table.organizationId, req.organizationId));
}

/**
 * Validation helper for organization-scoped inserts
 */
export function validateOrganizationData<T extends { organizationId?: string }>(
  data: T, 
  req: AuthenticatedRequest
): T {
  if (!req.organizationId) {
    throw new Error('Organization context required');
  }

  // Automatically inject organization ID into create operations
  return {
    ...data,
    organizationId: req.organizationId
  };
}
