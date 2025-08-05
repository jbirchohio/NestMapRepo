import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';

// Define user interface for JWT authentication
interface JWTUser {
  id: number;
  email: string;
  role: string;
  username: string;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: JWTUser;
    }
  }
}

/**
 * JWT-only Authentication Middleware
 * Provides authenticated user context without sessions
 */
export function jwtAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Define paths that don't require authentication (relative to /api mount point)
  const publicPaths = [
    '/auth',
    '/users/auth',
    '/health',
    '/templates',
    '/share',
    '/amadeus',
    '/stripe',
    '/webhooks',
    '/acme-challenge',
    '/demo'
  ];

  // Get the path relative to the /api mount point
  const relativePath = req.path;
  const fullPath = req.originalUrl;
  
  // In test environment, log the paths for debugging
  if (process.env.NODE_ENV === 'test' && relativePath.includes('auth')) {
    logger.info('JWT middleware checking path:', { relativePath, fullPath, originalUrl: req.originalUrl });
  }
  
  // Check both req.path and req.originalUrl for public paths
  const isPublicPath = publicPaths.some(path => {
    return relativePath.startsWith(path) || 
           fullPath.startsWith(`/api${path}`) ||
           fullPath.includes(`/api${path}`);
  });
  
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

    // Verify signature - require JWT_SECRET in production
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET environment variable is not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }
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
      role: payload.role,
      username: payload.username
    };

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
 * Admin Role Middleware - for app administrators only
 */
export function requireAdminRole(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }
  next();
}