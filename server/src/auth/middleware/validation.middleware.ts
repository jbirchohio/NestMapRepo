import { Request, Response, NextFunction } from 'express';
import { z, ZodError, AnyZodObject } from 'zod';

// Export the AnyZodObject type so it can be imported by other modules
export type { AnyZodObject };

/**
 * Real validation middleware using Zod
 * Validates request body, query parameters, and URL parameters
 */
export const validateRequest = (schema: AnyZodObject): ((req: Request, res: Response, next: NextFunction) => void | Response) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate the entire request object including body, query, and params
      schema.parse({
        body: req.body || {},
        query: req.query || {},
        params: req.params || {},
      });
      
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: formattedErrors,
          timestamp: new Date().toISOString()
        });
      }
      
      // Handle other unexpected errors
      console.error('Unexpected error during validation:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error during validation',
        timestamp: new Date().toISOString()
      });
      return;
    }
  };
};

/**
 * Validation for request body only
 */
export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body || {});
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Request body validation failed',
          details: error.errors,
          timestamp: new Date().toISOString()
        });
      }
      
      console.error('Body validation error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error during body validation' 
      });
    }
  };
};

/**
 * Validation for query parameters only
 */
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query || {});
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Query parameters validation failed',
          details: error.errors,
          timestamp: new Date().toISOString()
        });
      }
      
      console.error('Query validation error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error during query validation' 
      });
    }
  };
};

/**
 * Validation for URL parameters only
 */
export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params || {});
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: 'URL parameters validation failed',
          details: error.errors,
          timestamp: new Date().toISOString()
        });
      }
      
      console.error('Params validation error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error during params validation' 
      });
    }
  };
};

// Common validation schemas
export const commonSchemas = {
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Email validation
  email: z.string().email('Invalid email format'),
  
  // Password validation (minimum 8 chars, at least one letter and one number)
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain at least one letter and one number'),
  
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  }),
  
  // Date range
  dateRange: z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional()
  }).refine(data => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  }, 'End date must be after start date'),
  
  // Organization ID
  organizationId: z.string().uuid('Invalid organization ID'),
  
  // User ID  
  userId: z.string().uuid('Invalid user ID')
};
