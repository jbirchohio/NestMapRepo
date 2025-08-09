import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';
import { Request, Response } from 'express';

// Type declaration for rate limit info
declare module 'express' {
  interface Request {
    rateLimit?: {
      limit: number;
      current: number;
      remaining: number;
      resetTime: Date;
    };
  }
}

// General API rate limit - 500 requests per 15 minutes (more generous)
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 100
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again in a few minutes.',
      retryAfter: req.rateLimit?.resetTime
    });
  }
});

// Strict rate limit for auth endpoints - 10 attempts per 15 minutes (reasonable for forgot password)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10, // Increased from 5
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true, // Don't count successful logins
  handler: (req: Request, res: Response) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}, endpoint: ${req.path}`);
    res.status(429).json({
      error: 'Too many attempts',
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
      retryAfter: req.rateLimit?.resetTime
    });
  }
});

// Payment endpoints - 20 requests per hour (allows retries)
export const paymentRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Increased to allow retries
  message: 'Too many payment attempts, please try again later',
  handler: (req: Request, res: Response) => {
    logger.warn(`Payment rate limit exceeded for IP: ${req.ip}, user: ${(req as any).user?.id}`);
    res.status(429).json({
      error: 'Too many payment attempts',
      message: 'Too many payment attempts. Please try again in an hour.',
      retryAfter: req.rateLimit?.resetTime
    });
  }
});

// AI endpoints - 100 requests per hour per user (generous for planning)
export const aiRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Increased significantly
  message: 'Too many AI requests, please try again later',
  keyGenerator: (req: Request, res: Response) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    // Use res.locals.ip for IPv6 compatibility
    return (req as any).user?.id?.toString() || res.locals.ip || req.ip || 'unknown';
  },
  skip: (req: Request, res: Response) => {
    // Store IP for keyGenerator IPv6 compatibility
    res.locals.ip = req.ip;
    return false;
  },
  handler: (req: Request, res: Response) => {
    logger.warn(`AI rate limit exceeded for IP: ${req.ip}, user: ${(req as any).user?.id}`);
    res.status(429).json({
      error: 'Too many AI requests',
      message: 'AI request limit reached. Please try again in an hour.',
      retryAfter: req.rateLimit?.resetTime
    });
  }
});

// Template creation - 25 per day (allows active creators)
export const templateCreationRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 25, // Increased for active creators
  message: 'Template creation limit reached for today',
  keyGenerator: (req: Request, res: Response) => {
    // Rate limit by user ID
    return (req as any).user?.id?.toString() || 'anonymous';
  },
  handler: (req: Request, res: Response) => {
    logger.warn(`Template creation limit exceeded for user: ${(req as any).user?.id}`);
    res.status(429).json({
      error: 'Daily limit reached',
      message: 'You can only create 10 templates per day. Please try again tomorrow.',
      retryAfter: req.rateLimit?.resetTime
    });
  }
});

// Search endpoints - 60 requests per minute
export const searchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: 'Too many search requests, please slow down',
  handler: (req: Request, res: Response) => {
    logger.warn(`Search rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many searches',
      message: 'Please slow down your search requests.',
      retryAfter: req.rateLimit?.resetTime
    });
  }
});

// Webhook endpoints - no rate limit but log attempts
export const webhookRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Very high limit - webhooks need to work
  skip: (req: Request) => {
    // Skip rate limiting if it's from Stripe's IP ranges
    const stripeIPs = ['54.187.174.169', '54.187.205.235', '54.187.216.72'];
    return stripeIPs.includes(req.ip || '');
  },
  handler: (req: Request, res: Response) => {
    logger.error(`Webhook rate limit exceeded - potential abuse from IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many webhook attempts',
      message: 'Webhook rate limit exceeded.',
    });
  }
});

export default {
  generalRateLimit,
  authRateLimit,
  paymentRateLimit,
  aiRateLimit,
  templateCreationRateLimit,
  searchRateLimit,
  webhookRateLimit
};