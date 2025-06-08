import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const unifiedAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    // Verify Supabase JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user from our database using Supabase auth ID
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.auth_id, user.id))
      .limit(1);

    if (!dbUser) {
      return res.status(401).json({ error: 'User not found in database' });
    }

    // Transform to camelCase for frontend with proper null handling
    req.user = {
      id: dbUser.id,
      authId: dbUser.auth_id ?? undefined,
      username: dbUser.username ?? undefined,
      email: dbUser.email,
      displayName: dbUser.display_name ?? undefined,
      avatarUrl: dbUser.avatar_url ?? undefined,
      role: dbUser.role,
      roleType: dbUser.role_type ?? undefined,
      organizationId: dbUser.organization_id ?? undefined,
      company: dbUser.company ?? undefined,
      jobTitle: dbUser.job_title ?? undefined,
      teamSize: dbUser.team_size ?? undefined,
      useCase: dbUser.use_case ?? undefined,
      lastLogin: dbUser.last_login ? new Date(dbUser.last_login) : undefined,
      createdAt: dbUser.created_at ? new Date(dbUser.created_at) : new Date(),
    } as const;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Require Authentication Middleware
 */
export function requireAuth(req: Request & { user?: any }, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  next();
}

/**
 * Admin Role Middleware
 */
export function requireAdminRole(req: Request & { user?: any }, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const adminRoles = ['admin', 'superadmin_owner', 'superadmin_staff', 'superadmin_auditor'];
  if (!req.user.role || !adminRoles.some(role => req.user!.role.includes(role))) {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }

  next();
}

/**
 * Superadmin Role Middleware
 */
export function requireSuperadminRole(req: Request & { user?: any }, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const superadminRoles = ['superadmin_owner', 'superadmin_staff', 'superadmin_auditor'];
  if (!req.user.role || !superadminRoles.includes(req.user.role)) {
    res.status(403).json({ message: 'Superadmin access required' });
    return;
  }

  next();
}