import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Common validation patterns
const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  URL: /^https?:\/\/.+/,
  SAFE_TEXT: /^[a-zA-Z0-9\s\-_.,!?'"]+$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  NO_SCRIPT_TAGS: /^(?!.*<script).*$/i,
  NO_SQL_INJECTION: /^(?!.*(union|select|insert|update|delete|drop|create|alter|exec|execute)).*$/i
};

// Input sanitization functions
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Remove null bytes and control characters
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Sanitize HTML
  sanitized = DOMPurify.sanitize(sanitized, { 
    ALLOWED_TAGS: [], 
    ALLOWED_ATTR: [] 
  });
  
  // Remove SQL injection patterns
  sanitized = sanitized.replace(/(union|select|insert|update|delete|drop|create|alter|exec|execute)/gi, '');
  
  // Remove script injection patterns
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  return sanitized.trim();
}

export function sanitizeEmail(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  const sanitized = sanitizeText(input).toLowerCase();
  return PATTERNS.EMAIL.test(sanitized) ? sanitized : '';
}

export function sanitizeUrl(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  const sanitized = sanitizeText(input);
  try {
    const url = new URL(sanitized);
    // Only allow HTTP/HTTPS protocols
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString();
    }
  } catch (error) {
    // Invalid URL
  }
  return '';
}

export function sanitizeNumber(input: any): number | null {
  const num = parseFloat(input);
  return isNaN(num) || !isFinite(num) ? null : num;
}

export function sanitizeInteger(input: any): number | null {
  const num = parseInt(input, 10);
  return isNaN(num) ? null : num;
}

export function sanitizeBoolean(input: any): boolean {
  if (typeof input === 'boolean') return input;
  if (typeof input === 'string') {
    return input.toLowerCase() === 'true' || input === '1';
  }
  return Boolean(input);
}

export function sanitizeArray(input: any, itemSanitizer: (item: any) => any): any[] {
  if (!Array.isArray(input)) return [];
  return input.map(itemSanitizer).filter(item => item !== null && item !== undefined);
}

// Validation schemas for different content types
export const tripValidationSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .refine(val => PATTERNS.NO_SCRIPT_TAGS.test(val), 'Invalid characters in title'),
  description: z.string()
    .max(2000, 'Description too long')
    .refine(val => PATTERNS.NO_SCRIPT_TAGS.test(val), 'Invalid characters in description')
    .optional(),
  city: z.string()
    .min(1, 'City is required')
    .max(100, 'City name too long')
    .refine(val => PATTERNS.NO_SCRIPT_TAGS.test(val), 'Invalid characters in city'),
  startDate: z.string().datetime('Invalid start date'),
  endDate: z.string().datetime('Invalid end date'),
  user_id: z.union([z.number(), z.string()]).optional(),
  location: z.string().optional(),
  collaborators: z.array(z.any()).optional(),
  cityLatitude: z.string().optional(),
  cityLongitude: z.string().optional(),
  hotel: z.string().optional(),
  hotelLatitude: z.string().optional(),
  hotelLongitude: z.string().optional(),
  tripType: z.string().optional(),
  clientName: z.string().optional(),
  projectType: z.string().optional(),
  organization: z.string().optional(),
  budget: z.union([z.number(), z.string()]).optional(),
  tags: z.array(z.string().max(50, 'Tag too long')).max(20, 'Too many tags').optional(),
  notes: z.string().max(5000, 'Notes too long').optional()
});

export const activityValidationSchema = z.object({
  trip_id: z.union([z.string(), z.number()]).transform(val =>
    typeof val === "string" ? parseInt(val, 10) : val
  ),
  title: z.string()
    .min(1, 'Activity title is required')
    .max(200, 'Activity title too long')
    .refine(val => PATTERNS.NO_SCRIPT_TAGS.test(val), 'Invalid characters in title'),
  date: z.string().or(z.date()),
  time: z.string(),
  locationName: z.string()
    .max(200, 'Location too long')
    .refine(val => PATTERNS.NO_SCRIPT_TAGS.test(val), 'Invalid characters in location'),
  notes: z.string()
    .max(2000, 'Notes too long')
    .refine(val => PATTERNS.NO_SCRIPT_TAGS.test(val), 'Invalid characters in notes')
    .optional(),
  tag: z.string().max(50, 'Tag too long').optional(),
  assignedTo: z.string().max(100, 'Assigned to too long').optional(),
  order: z.number(),
  travelMode: z.string().max(20, 'Travel mode too long').optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional()
});

export const userValidationSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username too long')
    .refine(val => /^[a-zA-Z0-9_-]+$/.test(val), 'Username contains invalid characters'),
  email: z.string()
    .email('Invalid email format')
    .max(100, 'Email too long'),
  displayName: z.string()
    .max(100, 'Display name too long')
    .refine(val => PATTERNS.NO_SCRIPT_TAGS.test(val), 'Invalid characters in display name')
    .optional(),
  bio: z.string()
    .max(500, 'Bio too long')
    .refine(val => PATTERNS.NO_SCRIPT_TAGS.test(val), 'Invalid characters in bio')
    .optional(),
  website: z.string().url('Invalid website URL').optional(),
  location: z.string()
    .max(100, 'Location too long')
    .refine(val => PATTERNS.NO_SCRIPT_TAGS.test(val), 'Invalid characters in location')
    .optional()
});

export const commentValidationSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment too long')
    .refine(val => PATTERNS.NO_SCRIPT_TAGS.test(val), 'Invalid characters in comment'),
  parentId: z.number().optional(),
  mentions: z.array(z.number()).max(10, 'Too many mentions').optional()
});

// Middleware for request body validation and sanitization
export function validateAndSanitizeBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize the request body first
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
      }

      // Validate against schema
      const validationResult = schema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }

      // Replace request body with validated data
      req.body = validationResult.data;
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      res.status(500).json({ error: 'Internal validation error' });
    }
  };
}

// Recursive object sanitization
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeText(obj);
  }
  
  if (typeof obj === 'number') {
    return isNaN(obj) || !isFinite(obj) ? null : obj;
  }
  
  if (typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)).filter(item => item !== null);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeText(key);
      if (sanitizedKey) {
        sanitized[sanitizedKey] = sanitizeObject(value);
      }
    }
    return sanitized;
  }
  
  return obj;
}

// Middleware for query parameter validation
export function validateQueryParams(allowedParams: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const sanitizedQuery: any = {};
      
      for (const param of allowedParams) {
        if (req.query[param] !== undefined) {
          const value = req.query[param];
          if (typeof value === 'string') {
            sanitizedQuery[param] = sanitizeText(value);
          } else if (Array.isArray(value)) {
            sanitizedQuery[param] = value.map(v => typeof v === 'string' ? sanitizeText(v) : v);
          } else {
            sanitizedQuery[param] = value;
          }
        }
      }
      
      // Check for suspicious parameters
      for (const key of Object.keys(req.query)) {
        if (!allowedParams.includes(key)) {
          console.warn(`Unexpected query parameter: ${key}`);
        }
      }
      
      req.query = sanitizedQuery;
      next();
    } catch (error) {
      console.error('Query validation error:', error);
      res.status(400).json({ error: 'Invalid query parameters' });
    }
  };
}

// Rate limiting for content creation
export function contentCreationRateLimit() {
  const attempts = new Map<string, { count: number; resetTime: number }>();
  const LIMIT = 10; // 10 content creations per hour
  const WINDOW = 60 * 60 * 1000; // 1 hour

  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip || 'unknown';
    const now = Date.now();
    
    let userAttempts = attempts.get(identifier);
    
    if (!userAttempts || now > userAttempts.resetTime) {
      userAttempts = { count: 0, resetTime: now + WINDOW };
    }
    
    if (userAttempts.count >= LIMIT) {
      return res.status(429).json({
        error: 'Content creation rate limit exceeded',
        retryAfter: Math.ceil((userAttempts.resetTime - now) / 1000)
      });
    }
    
    userAttempts.count++;
    attempts.set(identifier, userAttempts);
    
    next();
  };
}

// Content length validation middleware
export function validateContentLength(maxSize: number = 1024 * 1024) { // 1MB default
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('content-length');
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return res.status(413).json({
        error: 'Content too large',
        maxSize: maxSize
      });
    }
    
    next();
  };
}

// File upload validation for images and documents  
export function validateFileUpload(allowedTypes: string[], maxSize: number = 5 * 1024 * 1024) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return next();
    }
    
    const files = [req.file];
    
    for (const file of files) {
      if (!file) continue;
      
      // Check file size
      if (file.size > maxSize) {
        return res.status(413).json({
          error: 'File too large',
          maxSize: maxSize,
          fileName: file.originalname
        });
      }
      
      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          error: 'Invalid file type',
          allowedTypes: allowedTypes,
          fileName: file.originalname
        });
      }
      
      // Sanitize filename
      if (file.originalname) {
        file.originalname = sanitizeText(file.originalname);
      }
    }
    
    next();
  };
}

// New comprehensive validation and sanitization middleware
export function validateAndSanitizeRequest(schemas: {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize and Validate Body
      if (schemas.body && req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body); // Sanitize first
        const bodyResult = await schemas.body.safeParseAsync(req.body);
        if (!bodyResult.success) {
          return res.status(400).json({
            message: 'Invalid request body',
            errors: bodyResult.error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message
            }))
          });
        }
        req.body = bodyResult.data; // Use validated (and casted) data
      }

      // Sanitize and Validate Query Parameters
      if (schemas.query && req.query && typeof req.query === 'object') {
        const sanitizedQuery: Record<string, any> = {};
        for (const key in req.query) {
          if (Object.prototype.hasOwnProperty.call(req.query, key)) {
            const value = req.query[key];
            if (typeof value === 'string') {
              sanitizedQuery[key] = sanitizeText(value);
            } else if (Array.isArray(value)) {
              sanitizedQuery[key] = value.map(v => typeof v === 'string' ? sanitizeText(v) : v);
            } else {
              sanitizedQuery[key] = value; // Keep non-string, non-array values as is for Zod to handle
            }
          }
        }
        req.query = sanitizedQuery; // Apply sanitized query for Zod parsing

        const queryResult = await schemas.query.safeParseAsync(req.query);
        if (!queryResult.success) {
          return res.status(400).json({
            message: 'Invalid query parameters',
            errors: queryResult.error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message
            }))
          });
        }
        req.query = queryResult.data; // Use validated (and casted) data
      }

      // Sanitize and Validate Route Parameters
      if (schemas.params && req.params && typeof req.params === 'object') {
        const sanitizedParams: Record<string, any> = {};
        for (const key in req.params) {
          if (Object.prototype.hasOwnProperty.call(req.params, key)) {
            const value = req.params[key];
            if (typeof value === 'string') {
              sanitizedParams[key] = sanitizeText(value);
            } else {
              sanitizedParams[key] = value; // Keep non-string values as is for Zod to handle
            }
          }
        }
        req.params = sanitizedParams; // Apply sanitized params for Zod parsing

        const paramsResult = await schemas.params.safeParseAsync(req.params);
        if (!paramsResult.success) {
          return res.status(400).json({
            message: 'Invalid route parameters',
            errors: paramsResult.error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message
            }))
          });
        }
        req.params = paramsResult.data; // Use validated (and casted) data
      }

      next();
    } catch (error) {
      // If ZodError, it's already handled by the errorHandler. 
      // For other errors, pass to generic error handler.
      if (error instanceof z.ZodError) {
        // This case should ideally be caught by safeParse, but as a fallback:
        return res.status(400).json({
            message: 'Validation error',
            errors: error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message
            }))
          });
      }
      console.error('Comprehensive validation middleware error:', error);
      next(error); // Pass to global error handler
    }
  };
}

// Export validation schemas for use in routes
export const validationSchemas = {
  trip: tripValidationSchema,
  activity: activityValidationSchema,
  user: userValidationSchema,
  comment: commentValidationSchema
};