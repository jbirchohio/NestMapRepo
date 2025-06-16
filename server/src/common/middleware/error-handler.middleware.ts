import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

/**
 * Error types for standardized error handling
 */
export enum ErrorType {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  CONFLICT = 'CONFLICT',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

/**
 * Standard API error structure
 */
export interface ApiError {
  type: ErrorType;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

/**
 * Creates a standardized API error
 * @param type Error type
 * @param message Error message
 * @param details Additional error details
 * @returns ApiError object
 */
export const createApiError = (
  type: ErrorType,
  message: string,
  details?: Record<string, unknown>
): ApiError => ({
  type,
  message,
  details,
});

/**
 * Maps error types to HTTP status codes
 */
export const errorTypeToStatusCode: Record<ErrorType, number> = {
  [ErrorType.UNAUTHORIZED]: 401,
  [ErrorType.FORBIDDEN]: 403,
  [ErrorType.NOT_FOUND]: 404,
  [ErrorType.BAD_REQUEST]: 400,
  [ErrorType.CONFLICT]: 409,
  [ErrorType.INTERNAL_SERVER_ERROR]: 500,
};

/**
 * Middleware for handling errors in a standardized way
 * @param logger Logger instance
 * @returns Express middleware function
 */
export const errorHandlerMiddleware = (logger: Logger) => {
  return (error: Error | ApiError, req: Request, res: Response, next: NextFunction): void => {
    // If headers already sent, let Express handle it
    if (res.headersSent) {
      return next(error);
    }

    // Default to internal server error
    let statusCode = 500;
    let errorResponse: { message: string; details?: Record<string, unknown> } = {
      message: 'An unexpected error occurred',
    };

    // Handle ApiError type
    if ('type' in error) {
      const apiError = error as ApiError;
      statusCode = errorTypeToStatusCode[apiError.type];
      errorResponse = {
        message: apiError.message,
        details: apiError.details,
      };

      // Log error with appropriate level based on type
      if (apiError.type === ErrorType.INTERNAL_SERVER_ERROR) {
        logger.error(`[${apiError.type}] ${apiError.message}`, apiError.stack);
      } else {
        logger.warn(`[${apiError.type}] ${apiError.message}`, apiError.details);
      }
    } else {
      // Handle standard Error
      logger.error(`[INTERNAL_SERVER_ERROR] ${error.message}`, error.stack);
    }

    // Send response
    res.status(statusCode).json(errorResponse);
  };
};

/**
 * Helper function to wrap controller methods with try/catch
 * @param handler Controller handler function
 * @param logger Logger instance
 * @returns Wrapped handler function
 */
export const asyncHandler = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<any>,
  logger: Logger
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req, res, next);
    } catch (error) {
      // If it's already an ApiError, pass it through
      let errorMessage = 'An unexpected error occurred';
      let errorStack: string | undefined = undefined;

      if (error instanceof Error) {
        errorMessage = error.message;
        errorStack = error.stack;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
        // Handle cases where error is an object with a message property but not an Error instance
        errorMessage = error.message;
        if ('stack' in error && typeof error.stack === 'string') {
          errorStack = error.stack;
        }
      }

      // If it's already an ApiError (checked by 'type' property), pass it through
      // This check should ideally be more robust, e.g., checking specific properties of ApiError
      if (typeof error === 'object' && error !== null && 'type' in error) {
        next(error); // Assuming error is indeed ApiError or compatible
        return;
      }

      // Convert standard errors or other thrown types to ApiError
      const apiError = createApiError(
        ErrorType.INTERNAL_SERVER_ERROR,
        errorMessage
      );
      
      // Add stack trace in development
      if (process.env.NODE_ENV !== 'production' && errorStack) {
        apiError.stack = errorStack;
      }
      
      next(apiError);
    }
  };
};
