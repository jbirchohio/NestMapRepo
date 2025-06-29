import type { Request, Response, NextFunction } from 'express';
import type { ApiError } from '../types/index.js';
import { ErrorType, createApiError } from '../types/index.js';
import { AppErrorCode } from '@shared/types/error-codes.js';
import logger from '../../utils/logger.js';
/**
 * Maps error types to HTTP status codes
 */
const errorTypeToStatusCode: Record<ErrorType, number> = {
    [ErrorType.UNAUTHORIZED]: 401,
    [ErrorType.FORBIDDEN]: 403,
    [ErrorType.NOT_FOUND]: 404,
    [ErrorType.BAD_REQUEST]: 400,
    [ErrorType.CONFLICT]: 409,
    [ErrorType.INTERNAL_SERVER_ERROR]: 500,
};
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
        const errorResponse = {
            success: false,
            error: {
                type: ErrorType.INTERNAL_SERVER_ERROR,
                code: AppErrorCode.INTERNAL_SERVER_ERROR,
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
            // Use type assertion with interface extension to handle optional properties
            interface ExtendedErrorResponse {
                type: ErrorType;
                code: AppErrorCode;
                message: string;
                timestamp: string;
                path: string;
                method: string;
                details?: unknown;
                stack?: string;
                requestId?: string;
            }
            if ('details' in apiError && apiError.details !== undefined) {
                (errorResponse.error as ExtendedErrorResponse).details = apiError.details;
            }
            // Map error type to status code
            statusCode = errorTypeToStatusCode[apiError.type] || 500;
            (errorResponse.error as ExtendedErrorResponse).code = apiError.code;
            // Log based on error severity
            if (statusCode >= 500) {
                logger.error(`[${apiError.type}] ${req.method} ${req.path}: ${apiError.message}`, apiError.stack);
            }
            else if (statusCode >= 400) {
                logger.warn(`[${apiError.type}] ${req.method} ${req.path}: ${apiError.message}`);
            }
        }
        else {
            // For standard errors, convert to internal server error
            errorResponse.error.message = error.message || 'An unexpected error occurred';
            (errorResponse.error as ExtendedErrorResponse).code = AppErrorCode.INTERNAL_SERVER_ERROR;
            // Add stack trace in development
            if (process.env.NODE_ENV !== 'production' && error.stack) {
                (errorResponse.error as ExtendedErrorResponse).stack = error.stack;
            }
            // Log error
            logger.error(`[INTERNAL_SERVER_ERROR] ${req.method} ${req.path}: ${error.message}`, error.stack);
        }
        // Add request ID if available
        const requestId = req.headers['x-request-id'];
        if (requestId && typeof requestId === 'string') {
            (errorResponse.error as ExtendedErrorResponse).requestId = requestId;
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
export const withStandardizedErrorHandling = (handler: (req: Request, res: Response, next: NextFunction) => Promise<any>, logger: Logger) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await handler(req, res, next);
        }
        catch (error) {
            next(error);
        }
    };
};
