import { Request, Response, NextFunction } from 'express';
import { getUserById } from '../auth';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    authId: string;
    username: string;
    email: string;
    role: string;
    roleType: string;
    organizationId?: number;
  };
  isAuthenticated: () => boolean;
}

/**
 * Unified Authentication Middleware
 * Handles both JWT and session-based authentication
 */
export async function unifiedAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Try JWT authentication first
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token) {
      try {
        // Verify Supabase JWT token
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

        if (!error && supabaseUser) {
        // Get database user with organization data
        const [dbUser] = await db
          .select()
          .from(users)
          .where(eq(users.auth_id, supabaseUser.id))
          .limit(1);

        if (dbUser) {
          // Attach user data to request
          req.user = {
            id: dbUser.id,
            authId: dbUser.auth_id,
            username: dbUser.username,
            email: dbUser.email,
            role: dbUser.role || 'user',
            roleType: dbUser.role_type || 'corporate',
            organizationId: dbUser.organization_id || undefined
          };

          req.isAuthenticated = () => true;
          return next();
        }
      } catch (supabaseError) {
        console.warn('Supabase connection failed, falling back to session auth:', supabaseError.message);
      }
    }

    // Fallback to session authentication
    const sessionUserId = (req.session as any)?.user_id;
    if (sessionUserId) {
      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, sessionUserId))
        .limit(1);

      if (dbUser) {
        req.user = {
          id: dbUser.id,
          authId: dbUser.auth_id,
          username: dbUser.username,
          email: dbUser.email,
          role: dbUser.role || 'user',
          roleType: dbUser.role_type || 'corporate',
          organizationId: dbUser.organization_id || undefined
        };

        req.isAuthenticated = () => true;
        return next();
      }
    }

    // No valid authentication found
    req.isAuthenticated = () => false;
    next();
  } catch (error) {
    console.error('Unified Auth Middleware Error:', error);
    req.isAuthenticated = () => false;
    next();
  }
}

/**
 * Require Authentication Middleware
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated?.() || !req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  next();
}

/**
 * Admin Role Middleware
 */
export function requireAdminRole(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated?.() || !req.user) {
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
export function requireSuperadminRole(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated?.() || !req.user) {
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