/**
 * Input Validation Middleware
 * Comprehensive input sanitization and validation
 */

import { Request, Response, NextFunction } from 'express';
import  z  from 'zod';
import { logger } from '../utils/logger';

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except tab, newline, and carriage return
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Basic XSS prevention
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // SQL injection prevention patterns
    .replace(/(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE)?|INSERT|SELECT|UNION|UPDATE)\b)/gi, '');
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Input sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    logger.error('Input sanitization error:', error);
    res.status(400).json({
      success: false,
      error: 'Invalid input data',
      message: 'Request contains invalid or malicious data'
    });
  }
};

/**
 * Validate request against Zod schema
 */
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        logger.warn('Validation failed: ' + JSON.stringify({
          url: req.url,
          method: req.method,
          errors,
          ip: req.ip
        }));
        
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Invalid input data',
          details: errors
        });
      }
      
      // Replace request body with validated data
      req.body = result.data;
      next();
    } catch (error) {
      logger.error('Validation middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Validation error',
        message: 'Unable to validate request'
      });
    }
  };
};

/**
 * File upload validation
 */
export const validateFileUpload = (options: {
  maxSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { maxSize = 10 * 1024 * 1024, allowedTypes = [], maxFiles = 10 } = options;
    
    // Check if files exist
    if (!req.files && !req.file) {
      return next();
    }
    
    // Handle different file upload scenarios
    let files: any[] = [];
    
    if (req.files) {
      if (Array.isArray(req.files)) {
        files = req.files.filter(f => f && typeof f === 'object' && 'size' in f);
      } else {
        // req.files is an object with field names as keys
        files = Object.values(req.files).flat().filter(f => f && typeof f === 'object' && 'size' in f);
      }
    } else if (req.file && typeof req.file === 'object' && 'size' in req.file) {
      files = [req.file];
    }
    
    // Check number of files
    if (files.length > maxFiles) {
      return res.status(400).json({
        success: false,
        error: 'Too many files',
        message: `Maximum ${maxFiles} files allowed`
      });
    }
    
    // Validate each file
    for (const file of files) {
      if (!file) continue;
      
      // Check file size
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          error: 'File too large',
          message: `File size must be less than ${maxSize / 1024 / 1024}MB`
        });
      }
      
      // Check file type
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file type',
          message: `Allowed types: ${allowedTypes.join(', ')}`
        });
      }
      
      // Check for malicious file names
      if (file.originalname && /[<>:"/\\|?*\x00-\x1f]/.test(file.originalname)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid filename',
          message: 'Filename contains invalid characters'
        });
      }
    }
    
    next();
  };
};

/**
 * Request size validation
 */
export const validateRequestSize = (maxSize: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        success: false,
        error: 'Request too large',
        message: `Request size must be less than ${maxSize / 1024 / 1024}MB`
      });
    }
    
    next();
  };
};

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  }),
  
  // ID validation
  id: z.string().uuid('Invalid ID format'),
  
  // Email validation
  email: z.string().email('Invalid email format').max(255),
  
  // Password validation
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain uppercase, lowercase, number, and special character'),
  
  // Organization ID validation
  organizationId: z.string().uuid('Invalid organization ID'),
  
  // Search query validation
  searchQuery: z.string().min(1).max(255).transform(sanitizeString),
  
  // Date range validation
  dateRange: z.object({
    startDate: z.string().datetime('Invalid start date'),
    endDate: z.string().datetime('Invalid end date')
  }).refine(data => new Date(data.startDate) < new Date(data.endDate), {
    message: 'Start date must be before end date'
  })
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: errors
        });
      }
      
      req.query = result.data;
      next();
    } catch (error) {
      logger.error('Query validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Query validation error'
      });
    }
  };
};

/**
 * Validate URL parameters
 */
export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params);
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          error: 'Invalid URL parameters',
          details: errors
        });
      }
      
      req.params = result.data;
      next();
    } catch (error) {
      logger.error('Params validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Parameter validation error'
      });
    }
  };
};

