import { eq, and, sql } from 'drizzle-orm';
import { Response, NextFunction, Request as ExpressRequest } from 'express';
import { db } from '../db';
import { organizations, users, type User, type UserRole as DbUserRole } from '../db/schema';
import { logSecurityEvent, createSecurityEvent } from '../security-event-logger';
import { SecurityEvent } from '../types/security-events';

// Base request type that doesn't extend Express Request
interface BaseRequest {
  user?: any;
  organizationId?: string;
  domainOrganizationId?: string;
  isWhiteLabelDomain?: boolean;
  organizationFilter?: (orgId: string | null) => boolean;
  analyticsScope?: {
    organizationId: string;
    startDate?: Date;
    endDate?: Date;
  };
  [key: string]: any;
}

// Custom Express Request type with our properties
export interface AuthenticatedRequest extends BaseRequest, ExpressRequest {
  user: {
    id: string;
    userId: string;
    email: string;
    emailVerified: boolean;
    name?: string;
    avatarUrl?: string | null;
    role: DbUserRole;
    organizationId: string;  // Required for authenticated requests
    [key: string]: any;
  };
  organizationId: string;  // Required for authenticated requests
}

// Global type augmentation for Express
declare global {
  namespace Express {
    interface Request extends BaseRequest {}
  }
}

// Type guard to check if a request is authenticated
export function isAuthenticatedRequest(req: ExpressRequest): req is AuthenticatedRequest {
  return !!(req as AuthenticatedRequest).user?.id && 
         !!(req as AuthenticatedRequest).organizationId;
}

// Augment the Express Request type to include our custom properties
declare module 'express-serve-static-core' {
  interface Request {
    user?: AppUser;
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
export async function injectOrganizationContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip for public endpoints and auth routes
  const publicPaths = ['/api/auth/', '/api/public/', '/api/health', '/api/share/', '/.well-known/'];
  const frontendPaths = ['/', '/trip/', '/share/', '/login', '/signup', '/demo'];
  
  // Skip for public API endpoints
  if (req.path && publicPaths.some(path => req.path!.includes(path))) {
    return next();
  }
  
  // Skip for frontend routes (non-API)
  if (!req.path || !req.path.startsWith('/api') || frontendPaths.some(path => req.path!.startsWith(path))) {
    return next();
  }

  // Ensure user is authenticated for organization-scoped API endpoints
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  // Ensure user has organization context
  if (!req.user.organizationId) {
    res.status(403).json({ 
      message: 'Organization context required. Please contact your administrator.' 
    });
    return;
  }

  // CRITICAL: Enforce domain-based organization isolation for white-label domains
  if (req.isWhiteLabelDomain && req.domainOrganizationId) {
    // For white-label domains, ensure user's organization matches the domain's organization
    if (req.user.organizationId !== req.domainOrganizationId) {
      console.warn('SECURITY_VIOLATION: Cross-organization access attempt via white-label domain', {
        user_id: req.user.id,
        userOrgId: req.user.organizationId,
        domainOrgId: req.domainOrganizationId,
        domain: req.headers?.host ?? 'unknown',
        endpoint: req.path,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      
      res.status(403).json({ 
        error: 'Access denied',
        message: 'You cannot access this organization\'s data through this domain.'
      });
      return;
    }
    
    // Set organization context to the domain's organization for extra security
    req.organizationId = req.domainOrganizationId;
  } else {
    // Set organization context based on user's organization
    if (req.user) {
      req.organizationId = req.user.organizationId;
      req.organizationFilter = (orgId: string | null) => {
        // Super admins can access all organizations
        if (req.user?.role === 'super_admin') return true;
        // Regular users can only access their own organization
        return orgId === req.user?.organizationId;
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
}

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
  const user = req.user as AuthUser;
  
  // Check if user has analytics permissions for their organization
  const hasAnalyticsAccess = user.role === UserRole.ADMIN || 
                            user.role === UserRole.SUPER_ADMIN ||
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
