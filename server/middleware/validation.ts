import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Validation middleware factory for API endpoints
 * Validates request body, query parameters, and route parameters
 */
export function validateRequest(schema: {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schema.body) {
        const bodyResult = schema.body.safeParse(req.body);
        if (!bodyResult.success) {
          return res.status(400).json({
            message: 'Invalid request body',
            errors: bodyResult.error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message
            }))
          });
        }
        req.body = bodyResult.data;
      }

      // Validate query parameters
      if (schema.query) {
        const queryResult = schema.query.safeParse(req.query);
        if (!queryResult.success) {
          return res.status(400).json({
            message: 'Invalid query parameters',
            errors: queryResult.error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message
            }))
          });
        }
        req.query = queryResult.data;
      }

      // Validate route parameters
      if (schema.params) {
        const paramsResult = schema.params.safeParse(req.params);
        if (!paramsResult.success) {
          return res.status(400).json({
            message: 'Invalid route parameters',
            errors: paramsResult.error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message
            }))
          });
        }
        req.params = paramsResult.data;
      }

      next();
    } catch (error) {
      res.status(500).json({
        message: 'Internal validation error'
      });
    }
  };
}

/**
 * Common validation schemas for reuse across endpoints
 */
export const commonSchemas = {
  id: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a numeric string').transform(Number)
  }),
  
  pagination: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? Math.min(parseInt(val, 10), 100) : 20)
  }),
  
  dateRange: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
  })
};

/**
 * Rate limiting middleware
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    const record = rateLimitStore.get(key);
    
    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (record.count >= maxRequests) {
      return res.status(429).json({
        message: 'Too many requests',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }
    
    record.count++;
    next();
  };
}

/**
 * Request logging middleware with security considerations
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  // Override res.end to track response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const duration = Date.now() - start;
    // Response time tracked
    return originalEnd.call(res, chunk, encoding, cb);
  } as any;
  
  next();
}