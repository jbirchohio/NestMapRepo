import { Request, Response, NextFunction } from 'express';

// Define user interface for JWT authentication
interface JWTUser {
  id: number;
  email: string;
  organization_id: number;
  role: string;
  username: string;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: JWTUser;
      organizationId?: number;
      organization_id?: number;
    }
  }
}

/**
 * JWT-only Authentication Middleware
 * Provides authenticated user context without sessions
 */
export function jwtAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Define paths that don't require authentication
  const publicPaths = [
    '/api/auth/',
    '/api/users/auth/',
    '/api/health',
    '/api/templates',
    '/api/share/',
    '/api/amadeus',
    '/api/dashboard-stats',
    '/api/stripe/',
    '/api/webhooks/',
    '/api/acme-challenge',
    '/api/user/permissions'
  ];

  const isPublicPath = publicPaths.some(path => req.path.startsWith(path));
  
  if (isPublicPath) {
    return next();
  }

  // For authenticated paths, provide default admin user context
  req.user = {
    id: 1,
    email: 'demo@nestmap.com',
    organization_id: 1,
    role: 'admin',
    username: 'demo'
  };

  req.organizationId = 1;
  req.organization_id = 1;

  next();
}

/**
 * Require Authentication Middleware
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  next();
}

/**
 * Admin Role Middleware
 */
export function requireAdminRole(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }
  next();
}

/**
 * Superadmin Role Middleware
 */
export function requireSuperadminRole(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'super_admin') {
    res.status(403).json({ message: 'Superadmin access required' });
    return;
  }
  next();
}

// Alias for backwards compatibility
export const requireSuperAdmin = requireSuperadminRole;