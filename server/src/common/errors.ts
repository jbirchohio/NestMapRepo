/**
 * Base error class for all custom errors in the application
 */
import type { AppErrorCode } from '@shared/types/error-codes.js';

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly code: AppErrorCode;
    public readonly details?: any;
    constructor(code: AppErrorCode, message: string, statusCode: number = 500, isOperational: boolean = true, details?: any) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.details = details;
        // Ensure the error stack is captured
        Error.captureStackTrace(this, this.constructor);
    }
}
// 400 Bad Request
export class BadRequestError extends AppError {
    constructor(message: string = 'Bad Request', details?: any) {
        super(AppErrorCode.BAD_REQUEST, message, 400, true, details);
    }
}
// 401 Unauthorized
export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized', details?: any) {
        super(AppErrorCode.UNAUTHORIZED, message, 401, true, details);
    }
}
// 403 Forbidden
export class ForbiddenError extends AppError {
    constructor(message: string = 'Forbidden', details?: any) {
        super(AppErrorCode.FORBIDDEN, message, 403, true, details);
    }
}
// 404 Not Found
export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found', details?: any) {
        super(AppErrorCode.NOT_FOUND, message, 404, true, details);
    }
}
// 409 Conflict
export class ConflictError extends AppError {
    constructor(message: string = 'Conflict', details?: any) {
        super(AppErrorCode.CONFLICT, message, 409, true, details);
    }
}
// 422 Unprocessable Entity
export class ValidationError extends AppError {
    constructor(message: string = 'Validation failed', details?: any) {
        super(AppErrorCode.VALIDATION_ERROR, message, 422, true, details);
    }
}
// 429 Too Many Requests
export class RateLimitError extends AppError {
    constructor(message: string = 'Too many requests', details?: any) {
        super(AppErrorCode.TOO_MANY_REQUESTS, message, 429, true, details);
    }
}
// 500 Internal Server Error
export class InternalServerError extends AppError {
    constructor(message: string = 'Internal server error', details?: any) {
        super(AppErrorCode.INTERNAL_SERVER_ERROR, message, 500, false, details);
    }
}
// 503 Service Unavailable
export class ServiceUnavailableError extends AppError {
    constructor(message: string = 'Service unavailable', details?: any) {
        super(AppErrorCode.SERVICE_UNAVAILABLE, message, 503, true, details);
    }
}
/**
 * Type guard to check if an error is an instance of AppError
 */
export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
}
/**
 * Type guard to check if an error is operational
 */
export function isOperationalError(error: unknown): boolean {
    return isAppError(error) && error.isOperational === true;
}
