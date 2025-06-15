import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { User } from '../types/user';
import { redisClient } from '../utils/redis';
import rateLimit from 'express-rate-limit';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { jwtService } from '../utils/jwtService';

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

// Using TokenPayload from jwtService.ts

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
      
      // Verify token using jwtService
      const tokenResult = await jwtService.verifyToken(token, 'access');
      
      if (!tokenResult) {
        return res.status(401).json({ 
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }
      
      if (tokenResult.expired) {
        return res.status(401).json({ 
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      const { payload } = tokenResult;

      // Rate limiting based on user
      const key = `rate_limit:${payload.userId}`;
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
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        organization_id: payload.organization_id,
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
