import { Request, Response, NextFunction } from 'express';
import { getUserById } from '../auth';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Extend Express Request interface for unified authorization
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        organization_id?: number | null;
        role?: string;
        displayName?: string;
        [key: string]: any;
      };
      organizationId?: number | null;
      organization_id?: number | null;
      organizationContext?: {
        id: number | null;
        canAccessOrganization: (orgId: number | null) => boolean;
        enforceOrganizationAccess: (orgId: number | null) => void;
      };
    }
  }
}

/**
 * Unified Authorization Middleware
 * Consolidates all authentication, organization context, and tenant isolation logic
 * Replaces: organizationContextMiddleware, injectOrganizationContext, enforceOrganizationSecurity
 */
export async function unifiedAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Define paths that don't require authentication
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/register', 
    '/api/auth/logout',
    '/api/auth/session',
    '/api/users', // Allow user creation for signup flow
    '/api/users/auth/', // Allow user lookup by auth ID for Supabase integration
    '/api/health',
    '/api/templates',
    '/api/share/',
    '/.well-known/',
    '/api/amadeus',
    '/api/user/permissions',
    '/api/dashboard-stats'
  ];

  // Skip authentication for public paths and non-API routes
  if (!req.path.startsWith('/api') || publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // JWT authentication check (Supabase)
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const token = authHeader.substring(7);
  let userId: number | null = null;

  try {
    // Proper JWT verification with Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return res.status(500).json({ message: "Server configuration error" });
    }

    // Verify the JWT token with Supabase auth service
    const verifyResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json'
      }
    });

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      console.error('Supabase JWT verification failed:', {
        status: verifyResponse.status,
        statusText: verifyResponse.statusText,
        error: errorText
      });
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const userData = await verifyResponse.json();
    const authId = userData.id;

    if (!authId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // Look up database user by Supabase auth ID
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.auth_id, authId))
      .limit(1);

    if (!dbUser) {
      return res.status(401).json({ message: "User not found in database" });
    }

    userId = dbUser.id;
  } catch (error) {
    console.error('CRITICAL JWT AUTHENTICATION FAILURE:', error);
    // Log detailed error for security audit
    console.error('JWT Error Details:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      token: token ? 'Token present' : 'No token',
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    return res.status(401).json({ message: "Authentication failed" });
  }

  getUserById(userId!)
    .then(user => {
      if (!user) {
        // Clear invalid session
        delete (req.session as any).user_id;
        return res.status(401).json({ message: "Invalid session" });
      }

      // Populate unified user context (getUserById returns organizationId in camelCase)
      req.user = {
        id: user.id,
        email: user.email,
        organization_id: user.organizationId ?? undefined,
        role: user.role ?? undefined,
        displayName: user.displayName ?? undefined
      };

      // Set organization context for tenant isolation  
      (req as any).organization_id = user.organizationId ?? undefined;

      // Create organization context utilities
      req.organizationContext = {
        id: user.organizationId,

        canAccessOrganization: (targetOrgId: number | null): boolean => {
          // Super admins can access any organization
          if (user.role === 'super_admin') {
            return true;
          }

          // Regular users can only access their own organization
          return user.organizationId === targetOrgId;
        },

        enforceOrganizationAccess: (targetOrgId: number | null): void => {
          if (!req.organizationContext!.canAccessOrganization(targetOrgId)) {
            throw new Error('Access denied: Cannot access resources from other organizations');
          }
        }
      };

      next();
    })
    .catch(error => {
      console.error('Authentication error:', error);
      res.status(500).json({ message: "Authentication failed" });
    });
}

/**
 * Organization-scoped database query helper
 * Automatically adds organization filtering to queries
 */
export function withOrganizationScope<T extends Record<string, any>>(
  req: Request,
  baseWhere: T = {} as T
): T & { organization_id?: number | null } {
  // Super admins bypass organization filtering unless explicitly requested
  if (req.user?.role === 'super_admin' && !req.query.organization_id) {
    return baseWhere;
  }

  // Add organization filter for all other users
  return {
    ...baseWhere,
    organization_id: (req as any).organization_id
  };
}

/**
 * Validate organization access for specific resource
 */
export function validateOrganizationAccess(req: Request, resourceOrgId: number | null): boolean {
  if (!req.organizationContext) {
    return false;
  }

  return req.organizationContext.canAccessOrganization(resourceOrgId);
}

/**
 * Middleware to require organization context (for routes that need it)
 */
export function requireOrganizationContext(req: Request, res: Response, next: NextFunction) {
  if (!req.organizationContext) {
    return res.status(401).json({ 
      error: 'Organization context required',
      message: 'This endpoint requires authenticated user with organization context'
    });
  }

  next();
}

/**
 * Admin role validation middleware
 */
export function requireAdminRole(req: Request, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    return res.status(403).json({ 
      message: "Access denied: Admin role required" 
    });
  }

  next();
}

/**
 * Super admin role validation middleware
 */
export function requireSuperAdminRole(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ 
      message: "Access denied: Super admin role required" 
    });
  }

  next();
}