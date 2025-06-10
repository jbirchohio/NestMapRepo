import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { config } from '../config';
import { User } from '../types/user';
import { redisClient } from '../utils/redis';
import rateLimit from 'express-rate-limit';
import { RateLimiterRedis } from 'rate-limiter-flexible';

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Redis-based rate limiter
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  points: 100, // Number of points
  duration: 15 * 60, // Per 15 minutes
  blockDuration: 60 * 60 // Block for 1 hour on rate limit
});

interface JwtPayload {
  id: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
  organization_id?: number;
}

export const validateJWT = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if JWT is required for this route
    if (!req.path.startsWith('/api/auth') && !req.path.startsWith('/api/public')) {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'No token provided',
          code: 'TOKEN_MISSING'
        });
      }

      const token = authHeader.split(' ')[1];
      
      // Check token blacklist
      const isBlacklisted = await redisClient.get(`blacklisted_token:${token}`);
      if (isBlacklisted) {
        return res.status(401).json({ 
          error: 'Token has been revoked',
          code: 'TOKEN_REVOKED'
        });
      }

      // Validate token
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
      
      // Check token expiration
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        return res.status(401).json({ 
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }

      // Validate required claims
      if (!decoded.id || !decoded.email || !decoded.role) {
        return res.status(401).json({ 
          error: 'Invalid token claims',
          code: 'INVALID_CLAIMS'
        });
      }

      // Rate limiting based on user
      const key = `rate_limit:${decoded.id}`;
      const rateLimitResult = await rateLimiter.consume(key);
      if (!rateLimitResult.consumed) {
        return res.status(429).json({
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(rateLimitResult.msBeforeNext / 1000)
        });
      }

      // Add user info to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        organization_id: decoded.organization_id,
      } as User;

      // Log successful authentication
      logger.info(`User ${decoded.email} authenticated successfully`, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      // Add security headers
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      
      next();
    } else {
      next(); // Public routes don't require auth
    }
  } catch (error) {
    logger.error('JWT validation error:', error);
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Rate limiting for auth endpoints
export const rateLimitAuth = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.headers['x-forwarded-for'];
  const now = Date.now();
  const key = `auth_attempts:${ip}`;

  // Check redis for existing attempts
  // This assumes you have redis configured
  // In production, this should use a distributed rate limiter
  
  // For simplicity, we'll use a simple in-memory cache
  const attempts = req.app.get(key) || 0;
  
  if (attempts > 5) {
    const resetTime = req.app.get(`${key}:reset`) || now;
    if (now < resetTime) {
      const remainingTime = Math.ceil((resetTime - now) / 1000);
      return res.status(429).json({
        error: 'Too many authentication attempts',
        retryAfter: remainingTime
      });
    }
    // Reset counter if time has passed
    req.app.set(key, 1);
    req.app.set(`${key}:reset`, now + 900000); // 15 minutes
  } else {
    req.app.set(key, (attempts + 1));
    req.app.set(`${key}:reset`, now + 900000);
  }

  next();
};

// Security audit logging
export const auditLogAuth = (req: Request, res: Response, next: NextFunction) => {
  const auditLog = {
    timestamp: new Date().toISOString(),
    ip: req.ip || req.headers['x-forwarded-for'],
    method: req.method,
    path: req.path,
    user: req.user ? {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    } : null,
    userAgent: req.headers['user-agent']
  };

  logger.audit('AUTH_ATTEMPT', auditLog);
  next();
};
