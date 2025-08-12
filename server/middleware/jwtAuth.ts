import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';

// Define user interface for JWT authentication
interface JWTUser {
  id: number;
  email: string;
  role: string;
  username: string;
  organization_id?: number; // Optional for consumer app
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
  // Get the path relative to the /api mount point
  const relativePath = req.path;
  const fullPath = req.originalUrl;

  // Define paths that don't require authentication (relative to /api mount point)
  const publicPaths = [
    '/auth',
    '/users/auth',
    '/health',
    '/share',
    '/templates/share',  // Add this as a public path
    '/amadeus',
    '/stripe',
    '/webhooks',
    '/acme-challenge',
    '/demo'
  ];

  // Templates need special handling - GET is public, but POST/PUT need auth
  // Template share links are always public (check this first)
  const isTemplateShare = relativePath.startsWith('/templates/share/') && req.method === 'GET';
  // Regular template reads are also public for GET
  const isTemplateRead = relativePath.match(/^\/templates($|\/\d+$|\/[^\/]+$)/) && req.method === 'GET' && !isTemplateShare;

  // Debug logging for template share requests
  if (relativePath.includes('/templates/share/') || fullPath.includes('/templates/share/')) {
    logger.info('Template share path detected:', {
      relativePath,
      fullPath,
      originalUrl: req.originalUrl,
      method: req.method,
      isTemplateShare,
      isTemplateRead
    });
  }

  if (isTemplateRead || isTemplateShare) {
    return next();
  }

  // Destinations content is public (for SEO)
  const isDestinationContent = relativePath.match(/^\/destinations\/[^\/]+\/content$/) && req.method === 'GET';
  const isPopularDestinations = relativePath === '/destinations/popular' && req.method === 'GET';
  const isDestinationSearch = relativePath === '/destinations/search' && req.method === 'GET';
  if (isDestinationContent || isPopularDestinations || isDestinationSearch) {
    return next();
  }

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

  if (isPublicPath || isTemplateShare) {
    return next();
  }

  // Check for JWT token in cookie first, then header as fallback
  let token = (req as any).cookies?.auth_token;
  
  // Fallback to authorization header for API clients and mobile apps
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

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

/**
 * Optional Authentication Middleware
 * Allows both authenticated and anonymous access
 * Sets req.user if token is present and valid, otherwise continues without user
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  // Check for JWT token in cookie first, then header as fallback
  let token = (req as any).cookies?.auth_token;
  
  // Fallback to authorization header for API clients and mobile apps
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }
  
  // If no token, continue without user context
  if (!token) {
    return next();
  }

  try {
    // Verify JWT signature
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) {
      // Invalid token format, continue without user
      return next();
    }

    // Verify signature
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // No secret configured, continue without user
      return next();
    }
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    if (signatureB64 !== expectedSignature) {
      // Invalid signature, continue without user
      return next();
    }

    // Decode payload
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      // Token expired, continue without user
      return next();
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
    // Any error in token processing, continue without user
    next();
  }
}