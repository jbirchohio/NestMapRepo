/**
 * Standardized Error Response System
 * Ensures consistent error formatting across all API endpoints
 * Single Source of Truth for error handling
 */

export interface StandardErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

export interface StandardSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

/**
 * Standard error codes for consistent frontend handling
 */
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Multi-tenant
  ORGANIZATION_ACCESS_DENIED: 'ORGANIZATION_ACCESS_DENIED',
  CROSS_ORGANIZATION_ACCESS: 'CROSS_ORGANIZATION_ACCESS',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // External services
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  API_KEY_INVALID: 'API_KEY_INVALID',
  
  // Demo mode
  DEMO_MODE_RESTRICTED: 'DEMO_MODE_RESTRICTED',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR'
} as const;

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: keyof typeof ErrorCodes,
  message: string,
  details?: any,
  requestId?: string
): StandardErrorResponse {
  return {
    success: false,
    error: {
      code: ErrorCodes[code],
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId
    }
  };
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): StandardSuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

import type { 
  Request as ExpressRequest, 
  Response, 
  NextFunction, 
  ErrorRequestHandler as ExpressErrorRequestHandler,
  Request as ExpressRequestType
} from 'express.js';
import type { ParamsDictionary } from 'express-serve-static-core.js';
import type { ParsedQs } from 'qs.js';

// Use the project's existing Express type extensions
import type { AuthenticatedRequest } from '../src/types/express.js.js';

// Create a base request type with all the properties we need
type BaseRequest = {
  headers: {
    [key: string]: string | string[] | undefined;
    'x-request-id'?: string;
  };
  originalUrl: string;
  method: string;
  ip: string;
  get(name: string): string | undefined;
};

// Create a union type that includes both authenticated and unauthenticated requests
type Request = (ExpressRequestType & BaseRequest) | (AuthenticatedRequest & BaseRequest);

// Create a custom ErrorRequestHandler type that matches Express's expectations
type ErrorRequestHandler = (
  err: ErrorWithContext,
  req: Request,
  res: Response,
  next: NextFunction
) => void | Response<any, Record<string, any>>;

/**
 * Express middleware for global error handling
 * Combines functionality from globalErrorHandler and standardizedErrorAdapter
 */

// Map of HTTP status codes to error types
const statusToErrorCode: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'RATE_LIMIT_EXCEEDED',
  500: 'INTERNAL_SERVER_ERROR',
  503: 'SERVICE_UNAVAILABLE'
};

interface ErrorWithContext extends Error {
  status?: number;
  statusCode?: number;
  code?: string | number;
  details?: any;
  errors?: any; // For validation errors
  expose?: boolean;
  type?: string;
  retryAfter?: string | number; // For rate limiting
  // Node.js error properties
  hostname?: string;
  address?: string;
  port?: number;
  syscall?: string;
}

/**
 * Express middleware for global error handling
 */
export const globalErrorHandler: ErrorRequestHandler = (err: ErrorWithContext, req: Request, res: Response, next: NextFunction) => {
  try {
    // If no error, continue to next middleware
    if (!err) {
      return next();
    }

    // Generate request ID for tracking
    const requestId = req.headers['x-request-id'] || 
                     `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log the error with context
    const errorContext: Record<string, any> = {
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      url: req.originalUrl,
      method: req.method,
      statusCode: 'statusCode' in err ? err.statusCode : err.status,
      code: 'code' in err ? err.code : undefined,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      requestId
    };

    // Safely add user info if available
    if ('user' in req && req.user) {
      errorContext.user = { 
        id: req.user.id, 
        email: 'email' in req.user ? req.user.email : undefined 
      };
    }

    // Safely add user agent if available
    const userAgent = req.get?.('user-agent');
    if (userAgent) {
      errorContext.userAgent = userAgent;
    }

    console.error('Error processing request', errorContext);

    // Handle different error types
    
    // 1. Handle validation errors
    if (err.name === 'ValidationError' || err.name === 'ValidationException') {
      return res.status(400).json(createErrorResponse(
        'VALIDATION_ERROR',
        err.message || 'Input validation failed',
        err.details || err.errors,
        requestId
      ));
    }
    
    // 2. Handle unauthorized/forbidden
    if (err.statusCode === 401 || err.status === 401 || err.name === 'UnauthorizedError') {
      return res.status(401).json(createErrorResponse(
        'UNAUTHORIZED',
        err.message || 'Authentication required',
        undefined,
        requestId
      ));
    }
    
    if (err.statusCode === 403 || err.status === 403) {
      return res.status(403).json(createErrorResponse(
        'FORBIDDEN',
        err.message || 'Access denied',
        undefined,
        requestId
      ));
    }
    
    // 3. Handle not found
    if (err.statusCode === 404 || err.status === 404) {
      return res.status(404).json(createErrorResponse(
        'NOT_FOUND',
        err.message || 'Resource not found',
        { path: req.originalUrl },
        requestId
      ));
    }
    
    // 4. Handle rate limiting
    if (err.statusCode === 429 || err.status === 429) {
      return res.status(429).json(createErrorResponse(
        'RATE_LIMIT_EXCEEDED',
        err.message || 'Too many requests, please try again later',
        { retryAfter: err.retryAfter },
        requestId
      ));
    }
    
    // 5. Handle external service errors
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED') {
      return res.status(503).json(createErrorResponse(
        'EXTERNAL_SERVICE_ERROR',
        'External service temporarily unavailable',
        { 
          service: err.hostname || 'unknown',
          code: err.code,
          message: err.message
        },
        requestId
      ));
    }
    
    // 6. Handle database errors
    const errorCode = err.code?.toString();
    if (err.name === 'DatabaseError' || (errorCode && errorCode.startsWith('23')) || err.name === 'MongoError') {
      return res.status(500).json(createErrorResponse(
        'DATABASE_ERROR',
        'Database operation failed',
        process.env.NODE_ENV === 'development' ? {
          message: err.message,
          code: err.code,
          stack: err.stack
        } : undefined,
        requestId
      ));
    }
    
    // 7. Handle standardized API errors with status codes
    if ('statusCode' in err || 'status' in err) {
      const status = err.statusCode || err.status || 500;
      const errorCode = statusToErrorCode[status] as keyof typeof ErrorCodes || 'INTERNAL_ERROR.js';
      
      return res.status(status).json(createErrorResponse(
        errorCode,
        err.message || 'An error occurred',
        process.env.NODE_ENV === 'development' ? {
          details: err.details,
          code: err.code,
          stack: err.stack
        } : undefined,
        requestId
      ));
    }
    
    // Default error handler for uncaught exceptions
    return res.status(500).json(createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      process.env.NODE_ENV === 'development' ? {
        message: err.message,
        name: err.name,
        stack: err.stack
      } : undefined,
      requestId
    ));
    
  } catch (error) {
    // If something goes wrong in the error handler itself
    console.error('Critical error in global error handler:', {
      originalError: err,
      handlerError: error,
      timestamp: new Date().toISOString()
    });
    
    // Fallback to basic error response
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while processing your request',
        timestamp: new Date().toISOString()
      }
    });
  }
}

/**
 * Helper functions for common error responses
 */
export const CommonErrors = {
  unauthorized: (message = 'Authentication required') =>
    createErrorResponse('UNAUTHORIZED', message),
    
  forbidden: (message = 'Access denied') =>
    createErrorResponse('FORBIDDEN', message),
    
  notFound: (resource = 'Resource') =>
    createErrorResponse('NOT_FOUND', `${resource} not found`),
    
  validation: (message = 'Invalid input data', details?: any) =>
    createErrorResponse('VALIDATION_ERROR', message, details),
    
  organizationAccess: (message = 'Organization access required') =>
    createErrorResponse('ORGANIZATION_ACCESS_DENIED', message),
    
  demoRestricted: (message = 'This action is not available in demo mode') =>
    createErrorResponse('DEMO_MODE_RESTRICTED', message),
    
  rateLimit: (message = 'Too many requests, please try again later') =>
    createErrorResponse('RATE_LIMIT_EXCEEDED', message),
    
  externalService: (service: string, message = 'External service error') =>
    createErrorResponse('EXTERNAL_SERVICE_ERROR', message, { service })
};