/**
 * Standardized Error Response System
 * Ensures consistent error formatting across all API endpoints
 * Single Source of Truth for error handling
 */
/**
 * Type for error details that can be included in error responses
 */
type ErrorDetails = Record<string, unknown> | Record<string, unknown>[] | string | number | boolean | null | undefined;

export interface StandardErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: ErrorDetails;
        timestamp: string;
        requestId?: string;
    };
}
export interface StandardSuccessResponse<T = unknown> {
    success: true;
    data: T;
    message?: string;
    timestamp: string;
}
/**
 * Standard error codes for consistent frontend handling
 */
export const ErrorCodes = {
    // Authentication & Authorization
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    INVALID_TOKEN: 'INVALID_TOKEN',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    // Validation
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
    // Resources
    NOT_FOUND: 'NOT_FOUND',
    ALREADY_EXISTS: 'ALREADY_EXISTS',
    CONFLICT: 'CONFLICT',
    // Multi-tenant
    ORGANIZATION_ACCESS_DENIED: 'ORGANIZATION_ACCESS_DENIED',
    CROSS_ORGANIZATION_ACCESS: 'CROSS_ORGANIZATION_ACCESS',
    // Rate limiting
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    // External services
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
    API_KEY_INVALID: 'API_KEY_INVALID',
    // Demo mode
    DEMO_MODE_RESTRICTED: 'DEMO_MODE_RESTRICTED',
    // Server errors
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    CONFIGURATION_ERROR: 'CONFIGURATION_ERROR'
} as const;
/**
 * Create a standardized error response
 */
export function createErrorResponse(code: keyof typeof ErrorCodes, message: string, details?: ErrorDetails, requestId?: string): StandardErrorResponse {
    return {
        success: false,
        error: {
            code: ErrorCodes[code],
            message,
            details,
            timestamp: new Date().toISOString(),
            requestId
        }
    };
}
/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(data: T, message?: string): StandardSuccessResponse<T> {
    return {
        success: true,
        data,
        message,
        timestamp: new Date().toISOString()
    };
}
import type { Response, NextFunction, Request } from 'express';


/**
 * Represents the structure of a standardized error response
 */
export interface StandardErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: ErrorDetails;
        timestamp: string;
        requestId?: string;
    };
}

/**
 * Represents the structure of a standardized success response
 */
export interface StandardSuccessResponse<T = unknown> {
    success: true;
    data: T;
    message?: string;
    timestamp: string;
}

/**
 * Represents the structure of an error with additional context properties
 */
export interface ErrorWithContext extends Error {
    status?: number;
    statusCode?: number;
    code?: string | number;
    details?: ErrorDetails;
    errors?: Record<string, unknown> | Array<{ message?: string; path?: string | number }>;
    path?: string | number;
    expose?: boolean;
    type?: string;
    retryAfter?: string | number;
    hostname?: string | string[];
    address?: string;
    port?: number;
    syscall?: string;
    stack?: string;
}

/**
 * Type guard to check if a value is a NetworkError
 */
function isNetworkError(error: unknown): error is ErrorWithContext & {
    code: 'ENOTFOUND' | 'ECONNREFUSED' | 'ECONNABORTED';
    hostname?: string | string[];
} {
    if (typeof error !== 'object' || error === null) return false;
    const code = (error as { code?: unknown }).code;
    return code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'ECONNABORTED';
}

/**
 * Type guard to check if an error is a database error
 */
function isDatabaseError(error: unknown): error is ErrorWithContext & {
    name: 'DatabaseError' | 'MongoError';
    code?: string | number;
} {
    if (typeof error !== 'object' || error === null) return false;
    const name = (error as { name?: unknown }).name;
    return name === 'DatabaseError' || name === 'MongoError';
}

/**
 * Type definition for Express error request handler
 */
type ErrorRequestHandler = (
    err: ErrorWithContext,
    req: Request,
    res: Response,
    next: NextFunction
) => void | Response<StandardErrorResponse>;
/**
 * Express middleware for global error handling
 * Combines functionality from globalErrorHandler and standardizedErrorAdapter
 */
// Map of HTTP status codes to error types
const statusToErrorCode: Record<number, string> = {
    400: 'VALIDATION_ERROR',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMIT_EXCEEDED',
    500: 'INTERNAL_SERVER_ERROR',
    503: 'SERVICE_UNAVAILABLE'
};
// ErrorWithContext interface is now defined above with proper types
/**
 * Express middleware for global error handling
 */
interface RequestUser {
    id?: string | number;
    email?: string;
    [key: string]: unknown;
}

export const globalErrorHandler: ErrorRequestHandler = (err: ErrorWithContext, req: Request, res: Response, next: NextFunction) => {
    try {
        // If no error, continue to next middleware
        if (!err) {
            return next();
        }
        // Generate request ID for tracking
        let requestId = req.headers['x-request-id'] ||
            `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        if (Array.isArray(requestId)) {
            requestId = requestId[0];
        }
        // Log the error with context
        const errorContext: Record<string, unknown> = {
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
            url: req.originalUrl,
            method: req.method,
            statusCode: 'statusCode' in err ? err.statusCode : err.status,
            code: 'code' in err ? err.code : undefined,
            timestamp: new Date().toISOString(),
            ip: req.ip,
            requestId
        };
        // Safely add user info if available
        const user = req.user as RequestUser | undefined;
        if (user) {
            errorContext.user = {
                id: user.id,
                email: user.email
            };
        }
        // Safely add user agent if available
        const userAgent = req.get?.('user-agent');
        if (userAgent) {
            errorContext.userAgent = Array.isArray(userAgent) ? userAgent[0] : userAgent;
        }
        console.error('Error processing request', errorContext);
        // Handle different error types
        // 1. Handle validation errors
        if (err.name === 'ValidationError' || err.name === 'ValidationException') {
            return res.status(400).json(createErrorResponse('VALIDATION_ERROR', err.message || 'Input validation failed', err.details || err.errors, requestId));
        }
        // 2. Handle unauthorized/forbidden
        if (err.statusCode === 401 || err.status === 401 || err.name === 'UnauthorizedError') {
            return res.status(401).json(createErrorResponse('UNAUTHORIZED', err.message || 'Authentication required', undefined, requestId));
        }
        if (err.statusCode === 403 || err.status === 403) {
            return res.status(403).json(createErrorResponse('FORBIDDEN', err.message || 'Access denied', undefined, requestId));
        }
        // 3. Handle not found
        if (err.statusCode === 404 || err.status === 404) {
            const originalUrl = Array.isArray(req.originalUrl) ? req.originalUrl[0] : req.originalUrl;
            return res.status(404).json(createErrorResponse('NOT_FOUND', err.message || 'Resource not found', { path: originalUrl }, requestId));
        }
        // 4. Handle rate limiting
        if (err.statusCode === 429 || err.status === 429) {
            return res.status(429).json(createErrorResponse('RATE_LIMIT_EXCEEDED', err.message || 'Too many requests, please try again later', { retryAfter: err.retryAfter }, requestId));
        }
        // 5. Handle external service errors
        if (isNetworkError(err)) {
            const hostname = Array.isArray(err.hostname) ? err.hostname[0] : err.hostname;
            return res.status(503).json(createErrorResponse('EXTERNAL_SERVICE_ERROR', 'External service temporarily unavailable', {
                service: hostname || 'unknown',
                code: err.code,
                message: err.message,
                ...(process.env.NODE_ENV === 'development' ? {
                    syscall: err.syscall,
                    address: err.address,
                    port: err.port
                } : {})
            }, requestId));
        }
        // 6. Handle database errors
        const errorCode = err.code?.toString();
        if (isDatabaseError(err) || (errorCode && errorCode.startsWith('23'))) {
            return res.status(500).json(createErrorResponse('DATABASE_ERROR', 'Database operation failed', process.env.NODE_ENV === 'development' ? {
                message: err.message,
                code: err.code,
                stack: err.stack
            } : undefined, requestId));
        }
        // 7. Handle standardized API errors with status codes
        if ('statusCode' in err || 'status' in err) {
            const status = (err.statusCode || err.status || 500) as number;
            const errorCode = statusToErrorCode[status] as keyof typeof ErrorCodes || 'INTERNAL_ERROR';
            const message = Array.isArray(err.message) ? err.message[0] : err.message;
            return res.status(status).json(createErrorResponse(errorCode, message || 'An error occurred', process.env.NODE_ENV === 'development' ? {
                details: err.details,
                code: err.code,
                stack: err.stack
            } : undefined, requestId));
        }
        // Default error handler for uncaught exceptions
        const errorMessage = Array.isArray(err.message) ? err.message[0] : err.message;
        return res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'An unexpected error occurred', process.env.NODE_ENV === 'development' ? {
            message: errorMessage,
            name: err.name,
            stack: err.stack
        } : undefined, requestId));
    }
    catch (error: unknown) {
        // If something goes wrong in the error handler itself
        console.error('Critical error in global error handler:', {
            originalError: err,
            handlerError: error,
            timestamp: new Date().toISOString()
        });
        // Fallback to basic error response
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An error occurred while processing your request',
                timestamp: new Date().toISOString()
            }
        });
    }
};
/**
 * Helper functions for common error responses
 */
export const CommonErrors = {
    unauthorized: (message = 'Authentication required') => createErrorResponse('UNAUTHORIZED', message),
    forbidden: (message = 'Access denied') => createErrorResponse('FORBIDDEN', message),
    notFound: (resource = 'Resource') => createErrorResponse('NOT_FOUND', `${resource} not found`),
    validation: (message = 'Invalid input data', details?: ErrorDetails) => createErrorResponse('VALIDATION_ERROR', message, details),
    organizationAccess: (message = 'Organization access required') => createErrorResponse('ORGANIZATION_ACCESS_DENIED', message),
    demoRestricted: (message = 'This action is not available in demo mode') => createErrorResponse('DEMO_MODE_RESTRICTED', message),
    rateLimit: (message = 'Too many requests, please try again later') => createErrorResponse('RATE_LIMIT_EXCEEDED', message),
    externalService: (service: string, message = 'External service error') => createErrorResponse('EXTERNAL_SERVICE_ERROR', message, { service })
};
