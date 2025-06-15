import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';
import { ApiError, ErrorType, errorTypeToStatusCode } from './error-handler.middleware';

/**
 * Standardized error handler middleware
 * Uses the ApiError structure for consistent error responses
 * @param logger Logger instance
 * @returns Express middleware function
 */
export const standardizedErrorHandler = (logger: Logger) => {
  return (error: Error | ApiError, req: Request, res: Response, next: NextFunction) => {
    // Skip if headers already sent
    if (res.headersSent) {
      return next(error);
    }

    // Default error response
    let errorResponse = {
      success: false,
      error: {
        type: ErrorType.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
      },
    };

    // Default status code
    let statusCode = 500;

    // If it's an ApiError, use its properties
    if ('type' in error) {
      const apiError = error as ApiError;
      
      errorResponse.error.type = apiError.type;
      errorResponse.error.message = apiError.message;
      
      if (apiError.details) {
        errorResponse.error['details'] = apiError.details;
      }
      
      // Map error type to status code
      statusCode = errorTypeToStatusCode[apiError.type] || 500;

      // Log based on error severity
      if (statusCode >= 500) {
        logger.error(
          `[${apiError.type}] ${req.method} ${req.path}: ${apiError.message}`,
          apiError.stack
        );
      } else if (statusCode >= 400) {
        logger.warn(
          `[${apiError.type}] ${req.method} ${req.path}: ${apiError.message}`
        );
      }
    } else {
      // For standard errors, convert to internal server error
      errorResponse.error.message = error.message || 'An unexpected error occurred';
      
      // Add stack trace in development
      if (process.env.NODE_ENV !== 'production') {
        errorResponse.error['stack'] = error.stack;
      }
      
      // Log error
      logger.error(`[INTERNAL_SERVER_ERROR] ${req.method} ${req.path}: ${error.message}`, error.stack);
    }

    // Add request ID if available
    if (req.headers['x-request-id']) {
      errorResponse.error['requestId'] = req.headers['x-request-id'];
    }

    // Send response
    res.status(statusCode).json(errorResponse);
  };
};

/**
 * Wrapper for controller methods to standardize error handling
 * @param handler Controller handler function
 * @param logger Logger instance
 * @returns Wrapped handler function with standardized error handling
 */
export const withStandardizedErrorHandling = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<any>,
  logger: Logger
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};
