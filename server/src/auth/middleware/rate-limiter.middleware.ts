import { Request, Response, NextFunction, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit.js';

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for certain paths or in development
    const skipPaths = ['/health', '/api/health'];
    return process.env.NODE_ENV === 'development' || 
           skipPaths.some(path => req.path.startsWith(path));
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests, please try again later.',
      status: 429
    });
  }
});

export const rateLimiterMiddleware: RequestHandler = (req, res, next) => {
  // Skip rate limiting for non-authentication endpoints
  if (!req.path.startsWith('/api/auth')) {
    return next();
  }
  
  // Apply rate limiting for auth endpoints
  return limiter(req, res, next);
};
