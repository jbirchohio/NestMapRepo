import type { Request as ExpressRequest, Response, NextFunction } from 'express';
import { db } from '../db/db.js';
import { customDomains } from '../db/schema.js';
import { and, eq, isNull } from 'drizzle-orm';
import type { Column } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { AuthUser } from '../src/types/auth-user.js';
import { UserRole } from '../src/types/auth-user.js';

// Use the imported UserRole enum directly

// =============================================
// Helper Functions
// =============================================

// UUID v4 validation function
const validateUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
// =============================================
// Type Definitions
// =============================================
/**
 * Analytics scope for organization-based filtering
 */
interface AnalyticsScope {
    organizationId: string;
    startDate?: Date;
    endDate?: Date;
}

/**
 * Our custom properties that we add to the request
 */
export interface RequestExtensions {
    user?: AuthUser;
    organizationId?: string;
    domainOrganizationId?: string;
    isWhiteLabelDomain?: boolean;
    organizationContext?: OrganizationContext;
    analyticsScope?: AnalyticsScope;
    organizationFilter?: (orgId: string | null) => boolean;
}

/**
 * Type for requests with our custom properties
 */
export type CustomRequest = Express.Request & RequestExtensions;

/**
 * Type for authenticated requests with required properties
 */
export type AuthenticatedRequest = Express.Request & {
    user: AuthUser;
    organizationId: string;
    organizationFilter: (orgId: string | null) => boolean;
} & RequestExtensions;

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
function isAuthenticatedUser(user: unknown): user is AuthUser {
    if (!user || typeof user !== 'object') return false;
    
    const u = user as Record<string, unknown>;
    return (
        typeof u.id === 'string' &&
        typeof u.email === 'string' &&
        typeof u.role === 'string' &&
        Object.values(UserRole).includes(u.role as UserRole) &&
        Array.isArray(u.permissions) &&
        (u.organizationId === null || typeof u.organizationId === 'string')
    );
}
/**
 * Type guard to check if a request is authenticated with organization context
 */
export function isAuthenticatedRequest(req: CustomRequest): req is AuthenticatedRequest {
    if (!isAuthenticatedUser(req.user)) {
        return false;
    }
    
    if (!req.organizationId || !validateUuid(req.organizationId)) {
        return false;
    }
    
    if (typeof req.organizationFilter !== 'function') {
        return false;
    }
    
    return true;
}
// =============================================
// Middleware Functions
// =============================================
/**
 * Critical middleware for multi-tenant organization scoping
 * Automatically injects organization context into all requests
 * and enforces proper access controls
 */
/**
 * Critical middleware for multi-tenant organization scoping
 * Automatically injects organization context into all requests
 * and enforces proper access controls
 */
export async function injectOrganizationContext(
    req: CustomRequest,
    res: Response,
    next: NextFunction
) {
    try {
        // Skip if already processed or not authenticated
        if (req.organizationId || !req.user) {
            return next();
        }

        // Type guard to ensure we have a valid authenticated request
        if (!isAuthenticatedRequest(req)) {
            return next(new Error('Authentication required'));
        }

        // Set up organization context based on domain
        if (req.isWhiteLabelDomain && req.domainOrganizationId) {
            // For white-label domains, use the domain's organization
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
        req.organizationFilter = (orgId: string | null) => {
            if (!orgId) return false;
            return orgId === req.organizationId;
        };

        // Set up organization context with additional helper methods
        req.organizationContext = {
            organizationId: req.organizationId!,
            isWhiteLabelDomain: !!req.isWhiteLabelDomain,
            domainOrganizationId: req.domainOrganizationId,
            canAccessOrganization: (orgId: string | null) => {
                if (!orgId) return false;
                return orgId === req.organizationId;
            },
            requireSameOrganization: (orgId: string | null) => {
                if (!orgId) {
                    throw new Error('Organization ID is required');
                }
                if (orgId !== req.organizationId) {
                    throw new Error('Access to the requested organization is forbidden');
                }
                return true;
            }
        };

        // Log successful organization context injection for audit trail
        console.log('Organization context injected:', {
            userId: req.user.id,
            organizationId: req.organizationId,
            isWhiteLabel: req.isWhiteLabelDomain || false,
            domain: req.headers.host,
            endpoint: req.path,
            timestamp: new Date().toISOString()
        });

        next();
    } catch (error) {
        console.error('Error in organization context injection:', error);
        next(error);
    }
}
/**
 * Middleware to validate organization access for specific resources
 * Used for routes that accept organization ID as parameter
 */
export function validateOrganizationAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
    return next();
}
/**
 * Domain-based organization resolution middleware
 * Resolves organization context from custom domains for white-label routing
 */
export async function resolveDomainOrganization(req: CustomRequest, res: Response, next: NextFunction) {
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
    }
    catch (error) {
        console.error('Domain organization resolution error:', error);
        // Don't fail the request, just proceed without domain context
        next();
    }
}
/**
 * Analytics access control middleware
 * Ensures only organization admins can access analytics
 */
export function requireAnalyticsAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    // Check if user has analytics permissions for their organization
    const hasAnalyticsAccess = req.user.role === UserRole.ADMIN ||
        req.user.role === UserRole.SUPER_ADMIN ||
        (Array.isArray(req.user.permissions) && req.user.permissions.includes('ACCESS_ANALYTICS'));
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
    return next();
}
/**
 * Query helper to automatically add organization scoping
 */
export function addOrganizationScope<T extends {
    organizationId: Column<any>;
}>(baseQuery: { where: (condition: unknown) => unknown }, req: AuthenticatedRequest, table: T) {
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
export function validateOrganizationData<T extends {
    organizationId?: string;
}>(data: T, req: AuthenticatedRequest): T {
    if (!req.organizationId) {
        throw new Error('Organization context required');
    }
    // Automatically inject organization ID into create operations
    return {
        ...data,
        organizationId: req.organizationId
    };
}
