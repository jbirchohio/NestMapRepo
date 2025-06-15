import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiError as LegacyApiError } from './errorHandler';
import { ApiError, ErrorType } from '../src/common/middleware/error-handler.middleware';
import { standardizedErrorHandler } from '../src/common/middleware/standardized-error-handler.middleware';

/**
 * Adapter middleware to bridge legacy error handling with the new standardized system
 * This ensures backward compatibility while allowing gradual migration
 */
export const standardizedErrorAdapter = () => {
  // Create an instance of the standardized error handler
  const standardizedHandler = standardizedErrorHandler(logger);
  
  return (err: Error | LegacyApiError | ApiError, req: Request, res: Response, next: NextFunction) => {
    // If it's already a standardized ApiError, pass it through
    if ('type' in err) {
      return standardizedHandler(err, req, res, next);
    }
    
    // If it's a legacy ApiError, convert it to the new format
    if ('statusCode' in err) {
      const legacyError = err as LegacyApiError;
      
      // Map legacy status codes to error types
      let errorType = ErrorType.INTERNAL_SERVER_ERROR;
      
      switch (legacyError.statusCode) {
        case 400:
          errorType = ErrorType.BAD_REQUEST;
          break;
        case 401:
          errorType = ErrorType.UNAUTHORIZED;
          break;
        case 403:
          errorType = ErrorType.FORBIDDEN;
          break;
        case 404:
          errorType = ErrorType.NOT_FOUND;
          break;
        case 409:
          errorType = ErrorType.CONFLICT;
          break;
        case 429:
          errorType = ErrorType.TOO_MANY_REQUESTS;
          break;
        case 500:
        default:
          errorType = ErrorType.INTERNAL_SERVER_ERROR;
          break;
      }
      
      // Create a standardized ApiError
      const standardizedError: ApiError = {
        type: errorType,
        message: err.message,
        details: legacyError.details,
        stack: err.stack
      };
      
      return standardizedHandler(standardizedError, req, res, next);
    }
    
    // For standard errors, convert to internal server error
    const standardizedError: ApiError = {
      type: ErrorType.INTERNAL_SERVER_ERROR,
      message: err.message || 'An unexpected error occurred',
      stack: err.stack
    };
    
    return standardizedHandler(standardizedError, req, res, next);
  };
};
