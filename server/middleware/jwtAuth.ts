import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { db } from '../db-connection';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client if needed
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null;

// Define user interface for JWT authentication
export interface JWTUser {
  id: number;
  email: string;
  organization_id: number;
  role: string;
  username: string;
  authId?: string;
  roleType?: string;
  iat?: number;
  exp?: number;
}

// Extend Express Request interface
declare module 'express-serve-static-core' {
  interface Request {
    user?: JWTUser;
    organizationId?: number;
    organization_id?: number;
    token?: string;
    isAuthenticated?: () => boolean;
  }
}

// Global declaration for backward compatibility
declare global {
  namespace Express {
    // Empty interface to avoid duplicate property errors
    // The actual extension is handled by the module declaration above
    interface Request {}
  }
}

// Type for our auth response body - used for type safety in response construction
interface AuthResponseBody {
  error: string;
  code: string;
  details?: string;
}

// Type guard for error with name property
interface ErrorWithName extends Error {
  name: string;
}

function isErrorWithName(error: unknown): error is ErrorWithName {
  return error instanceof Error && 'name' in error;
}

// This interface is used for routes that require authentication
export interface AuthenticatedRequest extends Omit<Request, 'user'> {
  user: JWTUser;
  organizationId: number;
  organization_id: number;
  token: string;
  isAuthenticated: () => boolean;
}

// This type guard can be used to check if a request is authenticated
export function isAuthenticatedRequest(req: Request): req is AuthenticatedRequest {
  return !!(req as AuthenticatedRequest).user;
}

// List of paths that don't require authentication
const PUBLIC_PATHS = [
  '/api/auth/',
  '/api/auth/refresh-token',
  '/api/health',
  '/api/templates',
  '/api/share/',
  '/api/amadeus',
  '/api/dashboard-stats',
  '/api/stripe/',
  '/api/webhooks/',
  '/api/acme-challenge',
  '/api/user/permissions',
  '/api/white-label/config',
  '/api/notifications'
];

/**
 * Extract token from request headers, cookies, or query params
 */
function extractToken(req: Request): string | null {
  return (
    req.headers.authorization?.split(' ')[1] ||
    req.cookies?.token ||
    req.query.token as string ||
    null
  );
}

/**
 * JWT Authentication Middleware with Supabase and JWT support
 */
export const jwtAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Skip auth for public paths
  if (PUBLIC_PATHS.some(path => req.path.startsWith(path))) {
    return next();
  }

  const token = extractToken(req);
  if (!token) {
    return sendUnauthorized(res, 'Authentication required', 'MISSING_TOKEN');
  }

  try {
    // Try to authenticate with local JWT first
    const localAuthSuccess = await authenticateWithLocalJWT(token, req, res, next);
    if (localAuthSuccess) return;
    
    // Fallback to Supabase auth if enabled
    if (supabase) {
      const supabaseAuthSuccess = await authenticateWithSupabase(token, req, res, next);
      if (supabaseAuthSuccess) return;
    }
    
    // If we get here, both auth methods failed
    sendUnauthorized(res, 'Invalid or expired token', 'INVALID_TOKEN');
    return;
  } catch (error: unknown) {
    console.error('Authentication error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendUnauthorized(
      res,
      'Authentication failed',
      'AUTH_ERROR',
      process.env.NODE_ENV === 'development' ? errorMessage : undefined
    );
    return;
  }
}

/**
 * Authenticate using local JWT tokens
 */
async function authenticateWithLocalJWT(
  token: string,
  req: Request,
  _res: Response, // Prefix with underscore to indicate it's intentionally unused
  next: NextFunction
): Promise<boolean | void> {
  try {
    const decoded = verifyAccessToken(token) as { id?: number; userId?: number };
    const userId = decoded?.userId || decoded?.id;
    if (!userId) return false;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return false;

    attachUserToRequest(req as AuthenticatedRequest, {
      id: user.id,
      email: user.email || '',
      organization_id: user.organization_id || 0,
      role: user.role || 'user',
      username: user.username || '',
      authId: user.auth_id || undefined,
      roleType: user.role_type || undefined
    }, token);

    next();
    return true;
  } catch (error) {
    if (isErrorWithName(error) && error.name === 'TokenExpiredError') {
      // Don't send response here, just return false to try next auth method
      console.log('Token expired, trying next auth method');
      return false;
    }
    return false;
  }
}

/**
 * Authenticate using Supabase
 */
async function authenticateWithSupabase(
  token: string,
  req: Request,
  _res: Response, // Prefix with underscore to indicate it's intentionally unused
  next: NextFunction
): Promise<boolean | void> {
  if (!supabase) return false;

  try {
    try {
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
      
      if (error || !supabaseUser) {
        return false;
      }
      
      // Look up user in database by auth ID
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.auth_id, supabaseUser.id))
        .limit(1);
        
      if (!user) return false;
      
      attachUserToRequest(req as AuthenticatedRequest, {
        id: user.id,
        email: user.email || '',
        organization_id: user.organization_id || 0,
        role: user.role || 'user',
        username: user.username || '',
        authId: user.auth_id || undefined,
        roleType: user.role_type || undefined
      }, token);
      
      next();
      return true;
    } catch (error) {
      console.error('Supabase authentication error:', error);
      return false;
    }
  } catch (error) {
    console.error('Supabase auth error:', error);
    return false;
  }
}

/**
 * Attach user to request object
 */
function attachUserToRequest(
  req: AuthenticatedRequest,
  user: JWTUser,
  token: string
): void {
  req.user = user;
  req.organizationId = user.organization_id;
  req.organization_id = user.organization_id;
  req.token = token;
  req.isAuthenticated = () => true;
}

/**
 * Send unauthorized response
 */
function sendUnauthorized(
  res: Response,
  message: string,
  code: string,
  details?: string
): void {
  const response: AuthResponseBody = {
    error: message,
    code,
    ...(details && { details })
  };
  res.status(401).json(response);
}

/**
 * Require Authentication Middleware
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!(req as AuthenticatedRequest).isAuthenticated?.() || !(req as AuthenticatedRequest).user) {
    return sendUnauthorized(res, 'Authentication required', 'UNAUTHORIZED');
  }
  next();
}

/**
 * Admin middleware that checks if user is an admin
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'admin') {
    sendUnauthorized(
      res,
      'Admin access required',
      'ADMIN_ACCESS_REQUIRED'
    );
    return;
  }
  next();
};

/**
 * Superadmin Role Middleware
 */
export function requireSuperadminRole(req: Request, res: Response, next: NextFunction): void {
  const user = (req as AuthenticatedRequest).user;
  if (!user || user.role !== 'superadmin') {
    return res.status(403).json({
      error: 'Superadmin access required',
      code: 'FORBIDDEN'
    });
  }
  next();
}

// Alias for backwards compatibility
export const requireSuperAdmin = requireSuperadminRole;

/**
 * Role-based access control middleware
 */
export const requireRole = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== requiredRole) {
      sendUnauthorized(
        res,
        'Insufficient permissions',
        'INSUFFICIENT_PERMISSIONS'
      );
      return;
    }
    next();
  };
};

/**
 * Organization access control middleware
 */
export const requireOrganizationAccess = (req: Request, res: Response, next: NextFunction): void => {
  const requestedOrgId = parseInt(req.params.organizationId, 10) || req.organizationId;
  
  if (!requestedOrgId || !req.user || req.user.organization_id !== requestedOrgId) {
    sendUnauthorized(
      res,
      'Access to this organization is forbidden',
      'FORBIDDEN'
    );
    return;
  }
  next();
};

/**
 * Role and organization access control middleware
 */
export const requireRoleAndOrgAccess = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestedOrgId = parseInt(req.params.organizationId, 10) || req.organizationId;
    
    if (!requestedOrgId || !req.user || 
        req.user.organization_id !== requestedOrgId || 
        req.user.role !== requiredRole) {
      sendUnauthorized(
        res,
        'Access forbidden',
        'FORBIDDEN'
      );
      return;
    }
    next();
  };
};
  next();
}