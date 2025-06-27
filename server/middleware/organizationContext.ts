import type { Request as ExpressRequest, Response, NextFunction, RequestHandler } from 'express';
import type { SQL, Column } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import type { AuthUser, UserRole } from '../src/types/auth-user.js';

// Define custom request interface to extend Express Request
export interface CustomRequest extends ExpressRequest {
  user?: AuthUser & {
    id: string;
    organizationId: string;
    role?: UserRole;
    permissions?: string[];
  };
  organizationId?: string;
  organizationFilter: (orgId: string | null) => boolean;
  domainOrganizationId?: string | null;
  isWhiteLabelDomain?: boolean;
  analyticsScope?: {
    organizationId: string;
    startDate?: Date;
    endDate?: Date;
  };
}

// Base authenticated request type
export type BaseAuthenticatedRequest = CustomRequest;

// Authenticated request type with required user
// Extend the base types
export type AuthenticatedRequest = CustomRequest & {
  user: NonNullable<CustomRequest['user']>;
  organizationId: string;
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
export function injectOrganizationContext(req: CustomRequest, res: Response, next: NextFunction) {
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
    
    // Initialize organizationId from user
    req.organizationId = req.user.organizationId;
    
    // CRITICAL: Enforce domain-based organization isolation for white-label domains
    if (req.isWhiteLabelDomain) {
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
        if (!req.domainOrganizationId) {
          console.warn('Domain organization ID is missing');
          return res.status(400).json({ message: 'Domain organization context is missing' });
        }
        req.organizationId = req.domainOrganizationId;
    }
    else {
        // For main domain, use user's organization
        if (!req.user?.organizationId) {
          console.warn('User is missing organizationId');
          return res.status(400).json({ message: 'User organization context is missing' });
        }
        req.organizationId = req.user.organizationId;
    }
        // Create organization filter function for queries
    if (!req.organizationId) {
        console.warn('Organization ID is not set in organizationFilter', {
            path: req.path,
            method: req.method,
            userId: req.user?.id,
            isWhiteLabelDomain: req.isWhiteLabelDomain,
            domain: req.headers.host
        });
        return res.status(400).json({ 
            error: 'OrganizationContextError',
            message: 'Organization context is missing',
            code: 'MISSING_ORGANIZATION_CONTEXT'
        });
    }
    
    // Create a scoped organization filter function
    const currentOrgId = req.organizationId;
    req.organizationFilter = (orgIdToCheck: string | null): boolean => {
        if (orgIdToCheck === null) return false;
        return orgIdToCheck === currentOrgId;
    };
    
    // Add organization context to response locals for logging/monitoring
    res.locals.organizationContext = {
        organizationId: currentOrgId,
        isWhiteLabelDomain: req.isWhiteLabelDomain || false,
        timestamp: new Date().toISOString()
    };
    
    return next();
}
/**
 * Middleware to validate organization access for specific resources
 * Used for routes that accept organization ID as parameter
 */
export function validateOrganizationAccess(req: ExpressRequest, res: Response, next: NextFunction) {
    const requestedOrgId = req.params.organization_id || req.body.organization_id;
    
    // If no organization ID is requested, proceed
    if (!requestedOrgId) {
        return next();
    }
    
    // Check if the requested org ID matches the user's organization
    if (String(requestedOrgId) !== String(req.organizationId)) {
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
export function addOrganizationScope<T extends {
    organizationId: Column<any>;
}>(baseQuery: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */, req: ExpressRequest, table: T) {
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
export function validateOrganizationData(data: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */, req: ExpressRequest) {
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
export function requireAnalyticsAccess(req: ExpressRequest, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    // Type assertion for req.user to ensure it's treated as AuthUser
    const user = req.user as AuthUser & { role?: UserRole; permissions?: string[] };
    // Ensure organizationId is set
    if (!req.organizationId) {
      return res.status(400).json({ message: 'Organization context is missing' });
    }
    
    // Check if user has analytics permissions for their organization
    const hasAnalyticsAccess = 
      (user.role && ['ADMIN', 'SUPER_ADMIN'].includes(user.role)) ||
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
    if (!req.organizationId) {
      return res.status(400).json({ message: 'Organization context is missing' });
    }
    
    req.analyticsScope = {
        organizationId: String(req.organizationId) // Ensure organizationId is always a string
    };
    return next();
}

interface CustomDomainConfig {
    organizationId: string;
    status: 'active' | 'pending' | 'suspended' | 'deleted';
    domainName: string;
    verifiedAt?: Date | null;
    sslStatus?: string;
}

interface DomainResolutionResult {
    success: boolean;
    organizationId?: string;
    error?: {
        code: string;
        message: string;
        statusCode: number;
    };
}

/**
 * Resolves organization context from custom domains for white-label routing
 * @param req Express request object
 * @param res Express response object
 * @param next Next middleware function
 */
export async function resolveDomainOrganization(
    req: CustomRequest,
    _res: Response,
    next: NextFunction
): Promise<void> {
    const host = req.headers.host as string | undefined;
    
    // Skip if no host header or already processed
    if (!host) {
        return next();
    }

    // Skip for localhost and main domain
    const mainDomains = ['localhost', 'nestmap.com', 'www.nestmap.com'];
    if (mainDomains.some(domain => host.includes(domain))) {
        return next();
    }

    try {
        const { db } = await import('../db.js');
        const { eq } = await import('drizzle-orm');
        
        // Dynamic schema import with better error handling
        let customDomains: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */;
        try {
            const schema = await import('../db/schema.js');
            if (!schema?.customDomains) {
                console.warn('Custom domains schema not found');
                return next();
            }
            customDomains = schema.customDomains;
        } catch (error) {
            console.error('Failed to load custom domains schema:', error);
            return next();
        }

        // Look up organization by custom domain
        let domainConfig: CustomDomainConfig | undefined;
        try {
            const result = await db
                .select({
                    organizationId: customDomains.organizationId,
                    status: customDomains.status,
                    domainName: customDomains.domainName,
                    verifiedAt: customDomains.verifiedAt,
                    sslStatus: customDomains.sslStatus
                })
                .from(customDomains)
                .where(eq(customDomains.domainName, host))
                .limit(1);

            domainConfig = result[0] as CustomDomainConfig | undefined;
        } catch (error) {
            console.error('Database error while querying custom domains:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                host,
                timestamp: new Date().toISOString()
            });
            return next();
        }

        if (!domainConfig) {
            return next();
            req.isWhiteLabelDomain = true;
        }
        next();
    }
    catch (error) {
        console.error('Domain organization resolution error:', error);
        // Don't fail the request, just proceed without domain context
        next();
    }
}
