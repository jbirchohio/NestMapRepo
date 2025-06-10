import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export function createApiError(
  message: string, 
  statusCode: number = 500, 
  code?: string,
  details?: any
): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}

export function errorHandler(
  err: Error | ApiError | ZodError,
  req: Request,
  res: Response,
  _next: NextFunction // Prefix with underscore to indicate it's intentionally unused
) {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const validationError = createApiError(
      'Validation error',
      400,
      'VALIDATION_ERROR',
      err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code
      }))
    );
    return sendErrorResponse(validationError, req, res);
  }

  // Handle JWT errors
  if (err instanceof JsonWebTokenError || err instanceof TokenExpiredError) {
    const authError = createApiError(
      'Invalid or expired token',
      401,
      'INVALID_TOKEN'
    );
    return sendErrorResponse(authError, req, res);
  }

  // Handle custom API errors
  if ('statusCode' in err) {
    return sendErrorResponse(err as ApiError, req, res);
  }

  // Handle all other errors
  const internalError = createApiError(
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    500,
    'INTERNAL_SERVER_ERROR',
    process.env.NODE_ENV !== 'production' ? { stack: err.stack } : undefined
  );

  return sendErrorResponse(internalError, req, res);
}

function sendErrorResponse(error: ApiError, req: Request, res: Response) {
  const { message, statusCode = 500, code, details } = error;
  
  // Log the error
  logger.error('Request error', {
    error: message,
    code,
    statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });

  // Send error response
  return res.status(statusCode).json({
    error: message,
    code,
    ...(details && { details }),
    ...(process.env.NODE_ENV !== 'production' && { 
      timestamp: new Date().toISOString(),
      path: req.path 
    })
  });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      next(err);
    });
  };
}

// Common error responses
export const commonErrors = {
  notFound: (resource: string, details?: any) => 
    createApiError(`${resource} not found`, 404, 'NOT_FOUND', details),
    
  unauthorized: (message = 'Unauthorized access', details?: any) => 
    createApiError(message, 401, 'UNAUTHORIZED', details),
    
  forbidden: (message = 'Forbidden', details?: any) => 
    createApiError(message, 403, 'FORBIDDEN', details),
    
  badRequest: (message: string, details?: any) => 
    createApiError(message, 400, 'BAD_REQUEST', details),
    
  conflict: (message: string, details?: any) => 
    createApiError(message, 409, 'CONFLICT', details),
    
  validationError: (message: string, details?: any) => 
    createApiError(`Validation error: ${message}`, 422, 'VALIDATION_ERROR', details),
    
  tooManyRequests: (message = 'Too many requests', details?: any) =>
    createApiError(message, 429, 'TOO_MANY_REQUESTS', details),
    
  serviceUnavailable: (message = 'Service temporarily unavailable', details?: any) =>
    createApiError(message, 503, 'SERVICE_UNAVAILABLE', details)
};