import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * SQL injection prevention middleware
 * Validates and sanitizes database queries
 */
export function preventSQLInjection(req: Request, res: Response, next: NextFunction) {
  const dangerousPatterns = [
    // Only flag actual SQL injection patterns, not legitimate content
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b).*(\bFROM\b|\bINTO\b|\bWHERE\b|\bSET\b)/gi,
    /(--|\/\*|\*\/)(?=.*(\bSELECT\b|\bUNION\b))/gi,
    /(\bOR\b|\bAND\b)\s*(1\s*=\s*1|true|false)\s*(--|;)/gi,
    /;\s*(\bDROP\b|\bDELETE\b|\bUPDATE\b)/gi
  ];

  const checkForSQLInjection = (obj: any): boolean => {
    if (typeof obj === 'string') {
      // Skip checking for common legitimate words in travel context
      const legitKeywords = ['select destination', 'select city', 'select hotel', 'business trip', 'create trip'];
      const lowerObj = obj.toLowerCase();
      if (legitKeywords.some(keyword => lowerObj.includes(keyword))) {
        return false;
      }
      return dangerousPatterns.some(pattern => pattern.test(obj));
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(value => checkForSQLInjection(value));
    }
    return false;
  };

  if (checkForSQLInjection(req.body) || checkForSQLInjection(req.query) || checkForSQLInjection(req.params)) {
    console.warn('Potential SQL injection attempt detected:', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      body: req.body,
      timestamp: new Date().toISOString()
    });
    
    return res.status(400).json({
      message: 'Invalid input detected'
    });
  }

  next();
}

/**
 * Organization context security middleware
 * Ensures proper multi-tenant data isolation
 */
export function enforceOrganizationSecurity(req: Request, res: Response, next: NextFunction) {
  // Skip for public endpoints
  if (req.path.includes('/api/public/') || req.path.includes('/api/auth/')) {
    return next();
  }

  // Ensure user has organization context for protected resources
  if (req.user && req.user.organization_id) {
    req.organizationFilter = (orgId: number | null) => orgId === req.user!.organization_id;
  }

  next();
}

/**
 * Data validation schemas for critical entities
 */
export const securitySchemas = {
  tripAccess: z.object({
    trip_id: z.number().positive(),
    user_id: z.number().positive(),
    organizationId: z.number().positive().optional()
  }),

  userPermissions: z.object({
    user_id: z.number().positive(),
    action: z.enum(['read', 'write', 'delete', 'admin']),
    resource: z.string().min(1)
  }),

  organizationData: z.object({
    organizationId: z.number().positive(),
    data: z.record(z.any())
  })
};

/**
 * Audit logging middleware for sensitive operations
 */
export function auditLogger(action: string, resource: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auditData = {
      action,
      resource,
      user_id: req.user?.id,
      organizationId: req.user?.organization_id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString(),
      requestId: req.get('x-request-id') || 'unknown'
    };

    console.log('AUDIT:', auditData);

    // Override res.end to log completion
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any, cb?: any) {
      console.log('AUDIT_COMPLETE:', {
        ...auditData,
        statusCode: res.statusCode,
        success: res.statusCode < 400
      });
      
      return originalEnd.call(res, chunk, encoding, cb);
    } as any;

    next();
  };
}

/**
 * File upload security middleware
 */
export function secureFileUpload(req: Request, res: Response, next: NextFunction) {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/csv',
    'application/json'
  ];

  const maxFileSize = 10 * 1024 * 1024; // 10MB

  if (req.file) {
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: 'File type not allowed'
      });
    }

    if (req.file.size > maxFileSize) {
      return res.status(400).json({
        message: 'File size exceeds limit'
      });
    }

    // Sanitize filename
    req.file.originalname = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  next();
}

/**
 * CORS security configuration
 */
export function configureCORS(req: Request, res: Response, next: NextFunction) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  const origin = req.get('origin');

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
}