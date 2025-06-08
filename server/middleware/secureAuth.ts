import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload, TokenType } from '../../utils/secureJwt';
import { redis } from '../db/redis';
import { logger } from '../utils/logger';

// Extend Express Request type to include user information
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      token?: string;
    }
  }
}

// Token extraction from various sources
const extractToken = (req: Request): string | null => {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  // Check cookies
  if (req.cookies?.token) {
    return req.cookies.token;
  }

  // Check query parameters
  if (req.query?.token && typeof req.query.token === 'string') {
    return req.query.token;
  }

  return null;
};

// Middleware to verify access token
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      logger.warn('No authentication token provided');
      res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const result = await verifyToken(token, 'access');
    
    if (!result) {
      logger.warn('Invalid or expired token');
      res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    // Attach user and token to the request object
    req.user = result.payload;
    req.token = token;
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

// Middleware to verify refresh token
export const verifyRefreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      logger.warn('No refresh token provided');
      res.status(401).json({ 
        success: false, 
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
      return;
    }

    const result = await verifyToken(token, 'refresh');
    
    if (!result) {
      logger.warn('Invalid or expired refresh token');
      res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
      return;
    }

    // Attach user and token to the request object
    req.user = result.payload;
    req.token = token;
    
    next();
  } catch (error) {
    logger.error('Refresh token verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Refresh token verification failed',
      code: 'REFRESH_FAILED'
    });
  }
};

// Role-based access control middleware
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      logger.warn('Role check failed: No user in request');
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRoles = Array.isArray(req.user.role) 
      ? req.user.role 
      : [req.user.role];
    
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    const hasRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      logger.warn(`User ${req.user.userId} attempted to access restricted route`);
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }
    
    next();
  };
};

// Rate limiting middleware for authentication endpoints
export const rateLimitAuth = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.connection.remoteAddress || '';
  const key = `auth:${ip}`;
  
  // Allow 5 failed attempts per 15 minutes
  redis.incr(key)
    .then((count) => {
      if (count === 1) {
        // Set expiration on first attempt
        redis.expire(key, 900); // 15 minutes
      }
      
      if (count > 5) {
        logger.warn(`Rate limit exceeded for IP: ${ip}`);
        return res.status(429).json({
          success: false,
          error: 'Too many attempts. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 900
        });
      }
      
      next();
    })
    .catch((error) => {
      logger.error('Rate limit check failed:', error);
      next(); // Fail open in case of Redis issues
    });
};

// Middleware to reset rate limit on successful authentication
export const resetAuthRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.connection.remoteAddress || '';
  const key = `auth:${ip}`;
  
  // Delete the rate limit key on successful authentication
  redis.del(key)
    .catch((error) => {
      logger.error('Failed to reset rate limit:', error);
    });
    
  next();
};

export default {
  authenticate,
  verifyRefreshToken,
  requireRole,
  rateLimitAuth,
  resetAuthRateLimit,
};
