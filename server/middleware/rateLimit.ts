import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redis } from '../db/redis';
import { logger } from '../utils/logger';

// Rate limiting for authentication endpoints
export const authRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'auth_fail_',
  points: 5, // 5 attempts
  duration: 15 * 60, // 15 minutes
  blockDuration: 15 * 60, // Block for 15 minutes after 5 attempts
});

// Rate limiting for public API endpoints
export const apiRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'api_',
  points: 100, // 100 requests
  duration: 60, // per 1 minute
  blockDuration: 60, // Block for 1 minute if limit is reached
});

export const rateLimiterMiddleware = (limiter: RateLimiterRedis) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const userIdentifier = req.user?.id || clientIp;
      
      await limiter.consume(userIdentifier);
      next();
    } catch (error) {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userId: req.user?.id,
      });
      
      res.status(429).json({
        error: 'Too many requests, please try again later',
        retryAfter: Math.ceil((error as any).msBeforeNext / 1000) || 60,
      });
    }
  };

// Apply rate limiting to auth routes
exonst applyAuthRateLimiting = (app: Express.Application) => {
  const authPaths = ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/forgot-password'];
  
  authPaths.forEach(path => {
    app.use(path, rateLimiterMiddleware(authRateLimiter));
  });
};

export { applyAuthRateLimiting };
