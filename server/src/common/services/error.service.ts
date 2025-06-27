import { Injectable, Logger, type HttpException } from '@nestjs/common';
import { ErrorType, type ApiError } from '../types/error.types.js';
import { createApiError } from '../types/error.types.js';

/**
 * Type for error details that can be included in error responses
 * Aligns with the ErrorDetails type from errorHandler.ts
 */
type ErrorDetails = Record<string, unknown> | Record<string, unknown>[] | string | number | boolean | null | undefined;
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
    /**
     * Creates an unauthorized error (HTTP 401)
     * @param message Error message (default: 'Authentication required')
     * @param details Optional error details
     * @returns ApiError instance
     */
    createUnauthorizedError(message = 'Authentication required', details?: ErrorDetails): ApiError {
        this.logger.warn(`[UNAUTHORIZED] ${message}`, details);
        return createApiError(ErrorType.UNAUTHORIZED, message, details);
    }
    /**
     * Create a forbidden error
     * @param message Error message
     * @param details Additional error details
     * @returns ApiError
     */
    /**
     * Creates a forbidden error (HTTP 403)
     * @param message Error message (default: 'Access denied')
     * @param details Optional error details
     * @returns ApiError instance
     */
    createForbiddenError(message = 'Access denied', details?: ErrorDetails): ApiError {
        this.logger.warn(`[FORBIDDEN] ${message}`, details);
        return createApiError(ErrorType.FORBIDDEN, message, details);
    }
    /**
     * Create a not found error
     * @param message Error message
     * @param details Additional error details
     * @returns ApiError
     */
    /**
     * Creates a not found error (HTTP 404)
     * @param message Error message (default: 'Resource not found')
     * @param details Optional error details
     * @returns ApiError instance
     */
    createNotFoundError(message = 'Resource not found', details?: ErrorDetails): ApiError {
        this.logger.warn(`[NOT_FOUND] ${message}`, details);
        return createApiError(ErrorType.NOT_FOUND, message, details);
    }
    /**
     * Create a bad request error
     * @param message Error message
     * @param details Additional error details
     * @returns ApiError
     */
    /**
     * Creates a bad request error (HTTP 400)
     * @param message Error message (default: 'Invalid request')
     * @param details Optional error details
     * @returns ApiError instance
     */
    createBadRequestError(message = 'Invalid request', details?: ErrorDetails): ApiError {
        this.logger.warn(`[BAD_REQUEST] ${message}`, details);
        return createApiError(ErrorType.BAD_REQUEST, message, details);
    }

    /**
     * Creates a validation error (HTTP 422)
     * @param message Error message (default: 'Validation failed')
     * @param details Optional validation error details
     * @returns ApiError instance
     */
    createValidationError(message = 'Validation failed', details?: ErrorDetails): ApiError {
        this.logger.warn(`[VALIDATION_ERROR] ${message}`, details);
        return createApiError(ErrorType.BAD_REQUEST, message, details);
    }

    /**
     * Creates a conflict error (HTTP 409)
     * @param message Error message (default: 'Resource conflict')
     * @param details Optional error details
     * @returns ApiError instance
     */
    createConflictError(message = 'Resource conflict', details?: ErrorDetails): ApiError {
        this.logger.warn(`[CONFLICT] ${message}`, details);
        return createApiError(ErrorType.CONFLICT, message, details);
    }

    /**
     * Creates an internal server error (HTTP 500)
     * @param message Error message (default: 'Internal server error')
     * @param details Optional error details
     * @returns ApiError instance
     */
    createInternalError(message = 'Internal server error', details?: ErrorDetails): ApiError {
        this.logger.error(`[INTERNAL_ERROR] ${message}`, details);
        return createApiError(ErrorType.INTERNAL_SERVER_ERROR, message, details);
    }

    /**
     * Converts an HTTP exception to an ApiError
     * @param exception HTTP exception to convert
     * @returns ApiError instance
     */
    fromHttpException(exception: HttpException): ApiError {
        const response = exception.getResponse() as 
            | string 
            | { message?: string | string[]; error?: string; statusCode?: number };
        
        const message = typeof response === 'string' 
            ? response 
            : Array.isArray(response.message)
                ? response.message.join(', ')
                : response.message || response.error || 'An error occurred';
                
        const status = exception.getStatus();
        
        // Map HTTP status to error type
        if (status >= 500) {
            return this.createInternalError(message);
        } else if (status === 401) {
            return this.createUnauthorizedError(message);
        } else if (status === 403) {
            return this.createForbiddenError(message);
        } else if (status === 404) {
            return this.createNotFoundError(message);
        } else if (status === 409) {
            return this.createConflictError(message);
        } else if (status === 400 || status === 422) {
            return this.createValidationError(message);
        }
        
        return this.createBadRequestError(message);
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
