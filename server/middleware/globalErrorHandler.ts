import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Global error handling middleware
 * Replaces duplicated try/catch blocks with centralized error handling
 */
export function globalErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Log error with context
  logger.error('Global Error:', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    organizationId: req.user?.organization_id,
    timestamp: new Date().toISOString(),
    ip: req.ip
  });

  // Don't handle if response already sent
  if (res.headersSent) {
    return next(err);
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed',
      errors: err.details || err.message
    });
  }

  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({
      message: 'Authentication required'
    });
  }

  if (err.name === 'ForbiddenError' || err.status === 403) {
    return res.status(403).json({
      message: 'Access denied'
    });
  }

  if (err.name === 'NotFoundError' || err.status === 404) {
    return res.status(404).json({
      message: 'Resource not found'
    });
  }

  // Handle database errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({
      message: 'Service temporarily unavailable'
    });
  }

  // Handle organization access violations
  if (err.message?.includes('organization') || err.message?.includes('tenant')) {
    return res.status(403).json({
      message: 'Organization access violation'
    });
  }

  // Default server error
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err.details 
    })
  });
}

/**
 * Async route wrapper to catch async errors
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Organization access error class
 */
export class OrganizationAccessError extends Error {
  status = 403;
  name = 'OrganizationAccessError';
  
  constructor(message = 'Access denied: Organization permission required') {
    super(message);
  }
}

/**
 * Validation error class
 */
export class ValidationError extends Error {
  status = 400;
  name = 'ValidationError';
  details: any;
  
  constructor(message: string, details?: any) {
    super(message);
    this.details = details;
  }
}