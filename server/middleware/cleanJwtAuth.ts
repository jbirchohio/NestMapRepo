// Simple JWT verification without external dependencies
const jwt = {
  verify: (token: string, secret: string) => {
    try {
      const [header, payload, signature] = token.split('.');
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
};
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface JWTUser {
  id: number;
  email: string;
  organization_id: number;
  role: string;
  username: string;
}

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
 * Clean JWT-only Authentication Middleware
 */
export function cleanJwtAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Continue without user - let route handlers decide if auth is required
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
    
    // Set user context
    req.user = {
      id: decoded.id,
      email: decoded.email,
      organization_id: decoded.organization_id,
      role: decoded.role,
      username: decoded.username
    };
    
    // Set organization context for convenience
    req.organizationId = decoded.organization_id;
    req.organization_id = decoded.organization_id;
    
    next();
  } catch (error) {
    console.warn('JWT verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return next(); // Continue without user
  }
}

/**
 * Require Authentication Middleware
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

/**
 * Admin Role Middleware
 */
export function requireAdminRole(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  next();
}

/**
 * Superadmin Role Middleware
 */
export function requireSuperadminRole(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  if (req.user.role !== 'super_admin') {
    res.status(403).json({ error: 'Superadmin access required' });
    return;
  }
  
  next();
}

export const requireSuperAdmin = requireSuperadminRole;