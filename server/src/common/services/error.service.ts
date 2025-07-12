import { Injectable, Logger } from '@nestjs/common.js';
import { ApiError, ErrorType, createApiError } from '../types/index.js';

/**
 * Centralized service for error handling and creation
 * Provides standardized methods for creating and throwing errors
 */
@Injectable()
export class ErrorService {
  private readonly logger = new Logger(ErrorService.name);

  /**
   * Create an unauthorized error
   * @param message Error message
   * @param details Additional error details
   * @returns ApiError
   */
  createUnauthorizedError(message = 'Authentication required', details?: Record<string, unknown>): ApiError {
    this.logger.warn(`[UNAUTHORIZED] ${message}`, details);
    return createApiError(ErrorType.UNAUTHORIZED, message, details);
  }

  /**
   * Create a forbidden error
   * @param message Error message
   * @param details Additional error details
   * @returns ApiError
   */
  createForbiddenError(message = 'Access denied', details?: Record<string, unknown>): ApiError {
    this.logger.warn(`[FORBIDDEN] ${message}`, details);
    return createApiError(ErrorType.FORBIDDEN, message, details);
  }

  /**
   * Create a not found error
   * @param message Error message
   * @param details Additional error details
   * @returns ApiError
   */
  createNotFoundError(message = 'Resource not found', details?: Record<string, unknown>): ApiError {
    this.logger.warn(`[NOT_FOUND] ${message}`, details);
    return createApiError(ErrorType.NOT_FOUND, message, details);
  }

  /**
   * Create a bad request error
   * @param message Error message
   * @param details Additional error details
   * @returns ApiError
   */
  createBadRequestError(message = 'Invalid request', details?: Record<string, unknown>): ApiError {
    this.logger.warn(`[BAD_REQUEST] ${message}`, details);
    return createApiError(ErrorType.BAD_REQUEST, message, details);
  }

  /**
   * Create a conflict error
   * @param message Error message
   * @param details Additional error details
   * @returns ApiError
   */
  createConflictError(message = 'Resource conflict', details?: Record<string, unknown>): ApiError {
    this.logger.warn(`[CONFLICT] ${message}`, details);
    return createApiError(ErrorType.CONFLICT, message, details);
  }

  /**
   * Create an internal server error
   * @param message Error message
   * @param details Additional error details
   * @returns ApiError
   */
  createInternalServerError(message = 'Internal server error', details?: Record<string, unknown>, stack?: string): ApiError {
    const error = createApiError(ErrorType.INTERNAL_SERVER_ERROR, message, details);
    
    if (process.env.NODE_ENV !== 'production' && stack) {
      error.stack = stack;
    }
    
    this.logger.error(`[INTERNAL_SERVER_ERROR] ${message}`, stack);
    return error;
  }

  /**
   * Convert a standard Error to an ApiError
   * @param error Standard Error
   * @returns ApiError
   */
  convertError(error: Error): ApiError {
    return this.createInternalServerError(error.message, undefined, error.stack);
  }

  /**
   * Throw an unauthorized error
   * @param message Error message
   * @param details Additional error details
   */
  throwUnauthorizedError(message = 'Authentication required', details?: Record<string, unknown>): never {
    throw this.createUnauthorizedError(message, details);
  }

  /**
   * Throw a forbidden error
   * @param message Error message
   * @param details Additional error details
   */
  throwForbiddenError(message = 'Access denied', details?: Record<string, unknown>): never {
    throw this.createForbiddenError(message, details);
  }

  /**
   * Throw a not found error
   * @param message Error message
   * @param details Additional error details
   */
  throwNotFoundError(message = 'Resource not found', details?: Record<string, unknown>): never {
    throw this.createNotFoundError(message, details);
  }

  /**
   * Throw a bad request error
   * @param message Error message
   * @param details Additional error details
   */
  throwBadRequestError(message = 'Invalid request', details?: Record<string, unknown>): never {
    throw this.createBadRequestError(message, details);
  }

  /**
   * Throw a conflict error
   * @param message Error message
   * @param details Additional error details
   */
  throwConflictError(message = 'Resource conflict', details?: Record<string, unknown>): never {
    throw this.createConflictError(message, details);
  }

  /**
   * Throw an internal server error
   * @param message Error message
   * @param details Additional error details
   */
  throwInternalServerError(message = 'Internal server error', details?: Record<string, unknown>, stack?: string): never {
    throw this.createInternalServerError(message, details, stack);
  }
}
