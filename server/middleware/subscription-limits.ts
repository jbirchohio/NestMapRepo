import { Request, Response, NextFunction } from 'express';
import { and, eq, count } from 'drizzle-orm';
import { db } from '../db';
import { organizations, users, trips } from '../db/schema';
import { logger } from '../utils/logger';
import type { User } from '../types/user';

// Import JWTUser type from jwtAuth
interface JWTUser {
  id: string;
  email: string;
  organizationId: string;
  role: string;
  username: string;
}

// Import the AuthUser type from auth middleware
import type { AuthUser } from './auth';

// Extend the AuthUser interface with additional JWT properties
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
  basic: {
    maxTrips: 20,
    maxUsers: 3,
    maxBookings: 10,
    whiteLabelAccess: false,
    analyticsAccess: false,
    apiAccess: false,
    maxOptimizations: 50,
  },
  pro: {
    maxTrips: 100,
    maxUsers: 10,
    maxBookings: 100,
    whiteLabelAccess: true,
    analyticsAccess: true,
    apiAccess: false,
    maxOptimizations: 500,
  },
  business: {
    maxTrips: 500,
    maxUsers: 50,
    maxBookings: 1000,
    whiteLabelAccess: true,
    analyticsAccess: true,
    apiAccess: true,
    maxOptimizations: 2000,
  },
  enterprise: {
    maxTrips: -1, // Unlimited
    maxUsers: -1, // Unlimited
    maxBookings: -1, // Unlimited
    whiteLabelAccess: true,
    analyticsAccess: true,
    apiAccess: true,
    maxOptimizations: -1, // Unlimited
  },
};

// Extend the Express Request type with our authenticated user
interface AuthenticatedRequest extends Request {
  user?: JwtUser;
}

// Helper to get organization ID from user object, handling both camelCase and snake_case
function getOrganizationId(user: { organizationId?: string | number; organization_id?: string | number }): string {
  const orgId = user.organizationId ?? user.organization_id;
  if (!orgId) {
    throw new Error('Organization ID is required');
  }
  return String(orgId);
}

// Get organization tier and limits
export async function getOrganizationLimits(organizationId: string) {
  const [org] = await db
    .select({ plan: organizations.plan })
    .from(organizations)
    .where(eq(organizations.id, organizationId));

  const tier = org?.plan || 'free';
  return {
    tier,
    limits: TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free,
  };
}

// Check if organization can create more trips
export async function checkTripLimit(organizationId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  tier: string;
}> {
  const { tier, limits } = await getOrganizationLimits(organizationId);
  
  if (limits.maxTrips === -1) {
    return { allowed: true, current: 0, limit: -1, tier };
  }

  const [result] = await db
    .select({ count: count() })
    .from(trips)
    .where(eq(trips.organizationId, organizationId));

  const currentTrips = result.count;
  const allowed = currentTrips < limits.maxTrips;

  return {
    allowed,
    current: currentTrips,
    limit: limits.maxTrips,
    tier,
  };
}

// Check if organization can invite more users
export async function checkUserLimit(organizationId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  tier: string;
}> {
  const { tier, limits } = await getOrganizationLimits(organizationId);
  
  if (limits.maxUsers === -1) {
    return { allowed: true, current: 0, limit: -1, tier };
  }

  const [result] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.organizationId, organizationId));

  const currentUsers = result.count;
  const allowed = currentUsers < limits.maxUsers;

  return {
    allowed,
    current: currentUsers,
    limit: limits.maxUsers,
    tier,
  };
}

// Middleware to enforce trip creation limits
export function enforceTripLimit() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(400).json({ error: 'User not authenticated' });
    }

    try {
      const orgId = getOrganizationId(req.user);
      const limitCheck = await checkTripLimit(orgId);
      
      if (!limitCheck.allowed) {
        return res.status(403).json({
          error: 'Trip limit exceeded',
          message: `Your ${limitCheck.tier} plan allows ${limitCheck.limit} trips. You have ${limitCheck.current}/${limitCheck.limit}. Upgrade to create more trips.`,
          current: limitCheck.current,
          limit: limitCheck.limit,
          tier: limitCheck.tier,
          upgradeRequired: true,
        });
      }

      next();
    } catch (error) {
      console.error('Error checking trip limit:', error);
      next();
    }
  };
}

// Middleware to enforce user invitation limits
export function enforceUserLimit() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(400).json({ error: 'User not authenticated' });
    }

    try {
      const orgId = getOrganizationId(req.user);
      const limitCheck = await checkUserLimit(orgId);
      
      if (!limitCheck.allowed) {
        return res.status(403).json({
          error: 'User limit exceeded',
          message: `Your ${limitCheck.tier} plan allows ${limitCheck.limit} users. You have ${limitCheck.current}/${limitCheck.limit}. Upgrade to invite more users.`,
          current: limitCheck.current,
          limit: limitCheck.limit,
          tier: limitCheck.tier,
          upgradeRequired: true,
        });
      }

      next();
    } catch (error) {
      console.error('Error checking user limit:', error);
      next();
    }
  };
}

// Middleware to enforce white label access
export function enforceWhiteLabelAccess() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(400).json({ error: 'User not authenticated' });
    }

    try {
      const orgId = getOrganizationId(req.user);
      const { tier, limits } = await getOrganizationLimits(orgId);
      
      if (!limits.whiteLabelAccess) {
        return res.status(403).json({
          error: 'White label access not available',
          message: `White label branding requires Pro plan ($99/month) or higher. Your current plan: ${tier}`,
          tier,
          upgradeRequired: true,
        });
      }

      next();
    } catch (error) {
      console.error('Error checking white label access:', error);
      res.status(500).json({ error: 'Failed to check permissions' });
    }
  };
}

// Middleware to enforce analytics access
export function enforceAnalyticsAccess() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(400).json({ error: 'User not authenticated' });
    }

    try {
      const orgId = getOrganizationId(req.user);
      const { tier, limits } = await getOrganizationLimits(orgId);
      
      if (!limits.analyticsAccess) {
        return res.status(403).json({
          error: 'Analytics access not available',
          message: `Advanced analytics requires Pro plan ($99/month) or higher. Your current plan: ${tier}`,
          tier,
          upgradeRequired: true,
        });
      }

      next();
    } catch (error) {
      console.error('Error checking analytics access:', error);
      res.status(500).json({ error: 'Failed to check permissions' });
    }
  };
}

// Get subscription status for organization
export async function getSubscriptionStatus(organizationId: string) {
  const { tier, limits } = await getOrganizationLimits(organizationId);
  
  const [tripCount] = await db
    .select({ count: count() })
    .from(trips)
    .where(eq(trips.organizationId, organizationId));

  const [userCount] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.organizationId, organizationId));

  // Define the tiers that should be recommended for upgrade
  const upgradeRecommendedTiers = ['free', 'basic'] as const;
  
  return {
    tier,
    limits,
    usage: {
      trips: tripCount.count,
      users: userCount.count,
    },
    // Recommend upgrade for free and basic tiers, but not for pro/enterprise
    upgradeRecommended: upgradeRecommendedTiers.includes(tier as typeof upgradeRecommendedTiers[number]),
  };
}