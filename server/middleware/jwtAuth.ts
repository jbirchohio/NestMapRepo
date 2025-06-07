import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

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

  // Require valid JWT token for all protected routes
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = authHeader.substring(7);
  
  try {
    // Verify JWT signature
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    // Verify signature
    const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback_dev_secret_change_in_production';
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    if (signatureB64 !== expectedSignature) {
      return res.status(401).json({ message: 'Invalid token signature' });
    }

    // Decode payload
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    
    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return res.status(401).json({ message: 'Token expired' });
    }

    // Set user context from validated JWT
    req.user = {
      id: payload.id,
      email: payload.email,
      organization_id: payload.organization_id,
      role: payload.role,
      username: payload.username
    };

    req.organizationId = payload.organization_id;
    req.organization_id = payload.organization_id;

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
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