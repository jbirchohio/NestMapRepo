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

  try {
    // Verify JWT token with Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return res.status(500).json({ message: "Server configuration error" });
    }

    // Verify the JWT token by making a request to Supabase
    const verifyResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey
      }
    });

    if (!verifyResponse.ok) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const userData = await verifyResponse.json();
    const authId = userData.id;

    if (!authId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // Look up user profile in Supabase database by auth ID
    const { data: dbUser, error: userError } = await fetch(`${supabaseUrl}/rest/v1/users?auth_id=eq.${authId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json'
      }
    }).then(res => res.json()).then(data => ({ data: data[0], error: null })).catch(error => ({ data: null, error }));

    if (userError || !dbUser) {
      return res.status(401).json({ message: "User profile not found" });
    }

    // Convert database user (snake_case) to request user (camelCase for frontend compatibility)
    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      organizationId: dbUser.organization_id, // Convert snake_case to camelCase
      displayName: dbUser.display_name, // Convert snake_case to camelCase
      authId: dbUser.auth_id,
      username: dbUser.username,
      avatarUrl: dbUser.avatar_url,
      roleType: dbUser.role_type,
      company: dbUser.company,
      jobTitle: dbUser.job_title,
      teamSize: dbUser.team_size,
      useCase: dbUser.use_case,
      lastLogin: dbUser.last_login,
      createdAt: dbUser.created_at
    };

    // Set organization context for tenant isolation (keep snake_case for backend)
    req.organizationId = dbUser.organization_id;
    req.organization_id = dbUser.organization_id;

    // Create organization context utilities
    req.organizationContext = {
      id: dbUser.organization_id,

      canAccessOrganization: (targetOrgId: number | null): boolean => {
        // Super admins can access any organization
        if (dbUser.role === 'superadmin' || dbUser.role === 'superadmin_owner' || dbUser.role === 'superadmin_staff' || dbUser.role === 'super_admin') {
          return true;
        }

        // Regular users can only access their own organization
        return dbUser.organization_id === targetOrgId;
      },

      enforceOrganizationAccess: (targetOrgId: number | null): void => {
        if (!req.organizationContext!.canAccessOrganization(targetOrgId)) {
          throw new Error('Access denied: Cannot access resources from other organizations');
        }
      }
    };

    next();
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