// Centralized error handling middleware
import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export function createApiError(message: string, statusCode: number = 500, code?: string): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export function errorHandler(err: ApiError, req: Request, res: Response, next: NextFunction) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error for debugging
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${statusCode}: ${message}`);
  if (statusCode >= 500) {
    console.error(err.stack);
  }
  
  res.status(statusCode).json({
    error: message,
    code: err.code,
    timestamp: new Date().toISOString(),
    path: req.path
  });
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Common error responses
export const commonErrors = {
  notFound: (resource: string) => createApiError(`${resource} not found`, 404, 'NOT_FOUND'),
  unauthorized: () => createApiError('Unauthorized access', 401, 'UNAUTHORIZED'),
  forbidden: () => createApiError('Forbidden', 403, 'FORBIDDEN'),
  badRequest: (message: string) => createApiError(message, 400, 'BAD_REQUEST'),
  conflict: (message: string) => createApiError(message, 409, 'CONFLICT'),
  validationError: (message: string) => createApiError(`Validation error: ${message}`, 422, 'VALIDATION_ERROR')
};