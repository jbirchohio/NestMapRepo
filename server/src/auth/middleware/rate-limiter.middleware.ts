import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Define the type for our request handler function
interface RequestHandler {
  (req: Request, res: Response, next: NextFunction): void;
}

/**
 * Real rate limiting implementation using express-rate-limit
 */
const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skip?: (req: Request) => boolean;
  handler?: (req: Request, res: Response) => void;
  keyGenerator?: (req: Request) => string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: options.standardHeaders ?? true,
    legacyHeaders: options.legacyHeaders ?? false,
    skip: options.skip || (() => false),
    handler: options.handler || ((_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000),
        timestamp: new Date().toISOString()
      });
    }),
    keyGenerator: options.keyGenerator || ((req: Request) => {
      return req.ip || 'unknown';
    })
  });
};

// General API rate limiter
const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  skip: (req: Request) => {
    // Skip rate limiting for certain paths or in development
    const skipPaths = ['/health', '/api/health', '/api/public'];
    return process.env.NODE_ENV === 'development' || 
           skipPaths.some(path => req.path?.startsWith(path));
  }
});

// Authentication endpoints rate limiter (more restrictive)
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs for auth endpoints
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: 900, // 15 minutes
      timestamp: new Date().toISOString()
    });
  }
});

// Password reset rate limiter (very restrictive)
const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many password reset attempts, please try again later.',
      retryAfter: 3600, // 1 hour
      timestamp: new Date().toISOString()
    });
  }
});

// API key rate limiter (for API access)
const apiKeyLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each API key to 100 requests per minute
  keyGenerator: (req: Request) => {
    // Use API key from Authorization header or query param
    const apiKey = req.headers.authorization?.replace('Bearer ', '') || 
                   req.query.api_key as string ||
                   req.ip || 'unknown';
    return `api_${apiKey}`;
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'API rate limit exceeded. Please upgrade your plan for higher limits.',
      retryAfter: 60,
      timestamp: new Date().toISOString()
    });
  }
});

// Upload rate limiter (for file uploads)
const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 uploads per hour
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Upload rate limit exceeded, please try again later.',
      retryAfter: 3600,
      timestamp: new Date().toISOString()
    });
  }
});

// Main rate limiter middleware for auth endpoints
export const rateLimiterMiddleware: RequestHandler = (req, res, next) => {
  // Apply different rate limits based on endpoint
  if (req.path?.includes('/api/auth/login') || req.path?.includes('/api/auth/register')) {
    return authLimiter(req, res, next);
  }
  
  if (req.path?.includes('/api/auth/reset-password')) {
    return passwordResetLimiter(req, res, next);
  }
  
  if (req.path?.includes('/api/upload')) {
    return uploadLimiter(req, res, next);
  }
  
  // Check if this is an API endpoint with API key
  if (req.headers.authorization?.startsWith('Bearer ') || req.query.api_key) {
    return apiKeyLimiter(req, res, next);
  }
  
  // Apply general rate limiting for other endpoints
  if (req.path?.startsWith('/api/')) {
    return generalLimiter(req, res, next);
  }
  
  // Skip rate limiting for non-API endpoints
  return next();
};

// Export individual limiters for specific use cases
export const authRateLimiter = authLimiter;
export const passwordResetRateLimiter = passwordResetLimiter;
export const uploadRateLimiter = uploadLimiter;
export const apiKeyRateLimiter = apiKeyLimiter;
export const generalRateLimiter = generalLimiter;
