import { Request, Response, NextFunction } from 'express';

// Extend Express Request interface for authentication
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
 * Simplified Authentication Middleware
 * Provides authenticated user context for development without external dependencies
 */
export async function simpleAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Define paths that don't require authentication
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/register', 
    '/api/auth/logout',
    '/api/auth/session',
    '/api/users', 
    '/api/users/auth/',
    '/api/health',
    '/api/templates',
    '/api/share/',
    '/.well-known/',
    '/api/amadeus',
    '/api/dashboard-stats',
    '/api/stripe/oauth/callback',
    '/api/webhooks/stripe',
    '/api/superadmin/switch-org',
    '/api/webhooks',
    '/api/acme-challenge',
    '/api/user/permissions'
  ];

  const isPublicPath = publicPaths.some(path => req.path.startsWith(path));
  
  if (isPublicPath) {
    return next();
  }

  // Provide authenticated user context
  req.user = {
    id: 1,
    email: 'demo@nestmap.com',
    organization_id: 1,
    role: 'admin',
    displayName: 'Demo User'
  };

  // Set organization context
  req.organizationId = 1;
  req.organization_id = 1;
  req.organizationContext = {
    id: 1,
    canAccessOrganization: () => true,
    enforceOrganizationAccess: () => {}
  };

  next();
}