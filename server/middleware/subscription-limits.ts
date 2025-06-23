import type { Request, Response, NextFunction } from 'express';
import { and, eq, count } from 'drizzle-orm';
import { db } from '../db.ts';
import { organizations, users, trips } from '../db/schema.js';
import { logger } from '../utils/logger.ts';
import type { User } from '../types/user.ts';
// Import JWTUser type from jwtAuth
interface JWTUser {
    id: string;
    email: string;
    organizationId: string;
    role: string;
    username: string;
}
// Import the AuthUser type from types
import type { AuthUser } from '../src/types/auth-user.js';
// JWT specific properties
interface JwtUser extends AuthUser {
    iat?: number;
    exp?: number;
}
// Subscription tier limits configuration
export const TIER_LIMITS = {
    free: {
        maxTrips: 3,
        maxUsers: 1,
        maxBookings: 0,
        whiteLabelAccess: false,
        analyticsAccess: false,
        apiAccess: false,
        maxOptimizations: 5,
    },
    pro: {
        maxTrips: 50,
        maxUsers: 10,
        maxBookings: 100,
        whiteLabelAccess: true,
        analyticsAccess: true,
        apiAccess: true,
        maxOptimizations: 100,
    },
    enterprise: {
        maxTrips: Infinity,
        maxUsers: Infinity,
        maxBookings: Infinity,
        whiteLabelAccess: true,
        analyticsAccess: true,
        apiAccess: true,
        maxOptimizations: Infinity,
    }
} as const;

type Tier = keyof typeof TIER_LIMITS;

// Extend the Express Request type with our authenticated user
interface AuthenticatedRequest extends Request {
    user?: JwtUser;
}

// Helper to get organization ID from user object, handling both camelCase and snake_case
function getOrganizationId(user: {
    organizationId?: string | number | null;
    organization_id?: string | number | null;
}): string | null {
    const orgId = user.organizationId ?? user.organization_id;
    if (orgId === null || orgId === undefined) {
        return null;
    }
    return String(orgId);
}

// Get organization tier and limits
export async function getOrganizationLimits(organizationId: string) {
    const [org] = await db
        .select({
            plan: organizations.plan
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

    const tier = (org?.plan as Tier) || 'free';
    return {
        tier,
        ...TIER_LIMITS[tier],
    };
}

// Check if organization can create more trips
export async function checkTripLimit(organizationId: string) {
    const { tier, maxTrips } = await getOrganizationLimits(organizationId);
    
    const tripCount = await db
        .select({ count: count() })
        .from(trips)
        .where(eq(trips.organizationId, organizationId));
    
    const currentTrips = Number(tripCount[0]?.count) || 0;
    
    return {
        allowed: currentTrips < maxTrips,
        current: currentTrips,
        limit: maxTrips,
        tier,
    };
}

// Check if organization can invite more users
export async function checkUserLimit(organizationId: string) {
    const { tier, maxUsers } = await getOrganizationLimits(organizationId);
    
    const userCount = await db
        .select({ count: count() })
        .from(users)
        .where(and(
            eq(users.organizationId, organizationId),
            eq(users.isActive, true)
        ));
    
    const currentUsers = Number(userCount[0]?.count) || 0;
    
    return {
        allowed: currentUsers < maxUsers,
        current: currentUsers,
        limit: maxUsers,
        tier,
    };
}

// Middleware to enforce trip creation limits
export function enforceTripLimit() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        
        try {
            const orgId = getOrganizationId(req.user);
            if (!orgId) {
                res.status(400).json({ error: 'User is not associated with an organization' });
                return;
            }
            
            const { allowed, current, limit, tier } = await checkTripLimit(orgId);
            
            if (!allowed) {
                res.status(403).json({
                    error: 'Trip limit exceeded',
                    current,
                    limit,
                    tier,
                    message: `Your current plan (${tier}) allows up to ${limit} trips. Please upgrade to create more.`
                });
                return;
            }
            
            next();
            return;
        } catch (error) {
            logger.error('Error enforcing trip limit:', error);
            next(error);
        }
    };
}

// Middleware to enforce user invitation limits
export function enforceUserLimit() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        
        try {
            const orgId = getOrganizationId(req.user);
            if (!orgId) {
                res.status(400).json({ error: 'User is not associated with an organization' });
                return;
            }
            
            const { allowed, current, limit, tier } = await checkUserLimit(orgId);
            
            if (!allowed) {
                res.status(403).json({
                    error: 'User limit exceeded',
                    current,
                    limit,
                    tier,
                    message: `Your current plan (${tier}) allows up to ${limit} users. Please upgrade to invite more users.`
                });
                return;
            }
            
            next();
            return;
        } catch (error) {
            logger.error('Error enforcing user limit:', error);
            next(error);
            return;
        }
    };
}

// Middleware to enforce white label access
export function enforceWhiteLabelAccess() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        
        try {
            const orgId = getOrganizationId(req.user);
            if (!orgId) {
                res.status(400).json({ error: 'User is not associated with an organization' });
                return;
            }
            
            const { whiteLabelAccess, tier } = await getOrganizationLimits(orgId);
            
            if (!whiteLabelAccess) {
                res.status(403).json({
                    error: 'White label access not available',
                    tier,
                    message: `White label features are not available on your current plan (${tier}). Please upgrade to access white label features.`
                });
                return;
            }
            
            next();
            return;
        } catch (error) {
            logger.error('Error enforcing white label access:', error);
            next(error);
            return;
        }
    };
}

// Middleware to enforce analytics access
export function enforceAnalyticsAccess() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        
        try {
            const orgId = getOrganizationId(req.user);
            if (!orgId) {
                res.status(400).json({ error: 'User is not associated with an organization' });
                return;
            }
            
            const { analyticsAccess, tier } = await getOrganizationLimits(orgId);
            
            if (!analyticsAccess) {
                res.status(403).json({
                    error: 'Analytics access not available',
                    tier,
                    message: `Analytics features are not available on your current plan (${tier}). Please upgrade to access analytics.`
                });
                return;
            }
            
            next();
            return;
        } catch (error) {
            logger.error('Error enforcing analytics access:', error);
            next(error);
            return;
        }
    };
}

// Get subscription status for organization
export async function getSubscriptionStatus(organizationId: string) {
    const { tier, ...limits } = await getOrganizationLimits(organizationId);
    
    const [tripCount, userCount] = await Promise.all([
        db.select({ count: count() })
            .from(trips)
            .where(eq(trips.organizationId, organizationId)),
        db.select({ count: count() })
            .from(users)
            .where(and(
                eq(users.organizationId, organizationId),
                eq(users.isActive, true)
            )),
    ]);
    
    return {
        tier,
        ...limits,
        currentTrips: Number(tripCount[0]?.count) || 0,
        currentUsers: Number(userCount[0]?.count) || 0,
    };
}
