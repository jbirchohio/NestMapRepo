import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

interface AuthenticatedRequest extends Request {
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
 * JWT Authentication Middleware
 * Validates JWT tokens from Supabase and attaches user data to request
 */
export async function jwtAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      req.isAuthenticated = () => false;
      return next();
    }

    // Verify Supabase JWT token
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
    
    if (error || !supabaseUser) {
      req.isAuthenticated = () => false;
      return next();
    }

    // Get database user with organization data
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.auth_id, supabaseUser.id))
      .limit(1);

    if (!dbUser) {
      req.isAuthenticated = () => false;
      return next();
    }

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
    next();
  } catch (error) {
    console.error('JWT Auth Middleware Error:', error);
    req.isAuthenticated = () => false;
    next();
  }
}

/**
 * Require Authentication Middleware
 * Returns 401 if user is not authenticated
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated?.() || !req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  next();
}

/**
 * Role-based Authorization Middleware
 */
export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.isAuthenticated?.() || !req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

/**
 * Organization Access Middleware
 * Ensures users can only access their organization's data
 */
export function requireOrganizationAccess(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated?.() || !req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const orgIdFromParams = req.params.organizationId || req.body.organization_id;
  
  // Superadmin users can access all organizations
  if (req.user.role === 'superadmin_owner' || req.user.role === 'superadmin_staff') {
    return next();
  }

  // Regular users must have organization ID and it must match
  if (!req.user.organizationId) {
    res.status(403).json({ message: 'No organization access' });
    return;
  }

  if (orgIdFromParams && parseInt(orgIdFromParams) !== req.user.organizationId) {
    res.status(403).json({ message: 'Organization access denied' });
    return;
  }

  next();
}

export type { AuthenticatedRequest };