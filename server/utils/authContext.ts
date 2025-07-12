import { Request } from 'express.js';

// Types for our auth context
export interface AuthUser {
  id: string | number;
  email: string;
  role?: string;
  [key: string]: any;
}

export interface JWTUser {
  id: string | number;
  email: string;
  [key: string]: any;
}

export interface AuthContext {
  user?: JWTUser | AuthUser;
  organizationId?: string;
  userId?: string | number;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
}

/**
 * Gets the authentication context from an Express request
 * This is a type-safe way to access auth-related properties
 * that are added by our auth middleware
 */
export function getAuthContext(req: Request): AuthContext {
  const user = (req as any).user as JWTUser | AuthUser | undefined;
  const organizationId = (req as any).organizationId as string | undefined;
  
  return {
    user,
    organizationId,
    userId: user?.id,
    isAuthenticated: !!user,
    hasRole: (role: string) => {
      if (!user) return false;
      return (user as any).role === role;
    }
  };
}

/**
 * Asserts that the request is authenticated
 * Throws an error if the user is not authenticated
 */
export function requireAuth(req: Request): AuthContext & { user: JWTUser | AuthUser } {
  const ctx = getAuthContext(req);
  if (!ctx.isAuthenticated) {
    throw new Error('Authentication required');
  }
  return ctx as AuthContext & { user: JWTUser | AuthUser };
}

/**
 * Asserts that the request has a specific role
 * Throws an error if the user doesn't have the required role
 */
export function requireRole(role: string) {
  return (req: Request) => {
    const ctx = requireAuth(req);
    if (!ctx.hasRole(role)) {
      throw new Error(`Role ${role} is required`);
    }
    return ctx;
  };
}
