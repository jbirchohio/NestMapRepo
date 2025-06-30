import type { Response, Request, NextFunction } from 'express';
import type { ApiResponse } from '@shared/schema/types/api/index.js';

/**
 * Response utility for sending standardized API responses
 */
class ResponseHandler {
    /**
     * Send a success response with data
     */
    public static success<T = any>(res: Response, data: T, statusCode: number = 200): Response {
        const response: ApiResponse<T> = {
            success: true,
            data,
        };
        return res.status(statusCode).json(response);
    }

    /**
     * Send an error response
     */
    public static error(res: Response, message: string, statusCode: number = 500, errorCode?: string, details?: unknown): Response {
        const response: ApiResponse<never> = {
            success: false,
            code: errorCode || 'INTERNAL_SERVER_ERROR',
            message,
            details,
        };
        return res.status(statusCode).json(response);
    }

    /**
     * Send a paginated response
     */
    public static paginate<T = any>(res: Response, data: T[], total: number, page: number, limit: number): Response {
        const totalPages = Math.ceil(total / limit);
        const response: ApiResponse<T[]> = {
            success: true,
            data,
            meta: {
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages,
                    hasMore: page < totalPages,
                },
            },
        };
        return res.status(200).json(response);
    }

    /**
     * Send a validation error response
     */
    public static validationError(
        res: Response,
        errors: Array<{ field: string; message: string; type: string; }>,
        message: string = 'Validation failed'
    ): Response {
        return this.error(res, message, 400, 'VALIDATION_ERROR', errors);
    }

    /**
     * Send a not found response
     */
    public static notFound(res: Response, message: string = 'Resource not found'): Response {
        return this.error(res, message, 404, 'NOT_FOUND');
    }

    /**
     * Send an unauthorized response
     */
    public static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
        return this.error(res, message, 401, 'UNAUTHORIZED');
    }

    /**
     * Send a forbidden response
     */
    public static forbidden(res: Response, message: string = 'Forbidden'): Response {
        return this.error(res, message, 403, 'FORBIDDEN');
    }

    /**
     * Send a bad request response
     */
    public static badRequest(res: Response, message: string = 'Bad request', details?: unknown): Response {
        return this.error(res, message, 400, 'BAD_REQUEST', details);
    }
}

/**
 * Extended Response type with our custom methods
 */
export interface ExtendedResponse extends Response {
    success: <T = unknown>(data: T, statusCode?: number) => Response;
    error: (message: string, statusCode?: number, errorCode?: string, details?: unknown) => Response;
    paginate: <T = unknown>(data: T[], total: number, page: number, limit: number) => Response;
}

/**
 * Middleware to extend the Response object with custom methods
 */
export const extendResponse = (
    _req: Request,
    res: Response,
    next: NextFunction
): void => {
    const extendedRes = res as ExtendedResponse;

    extendedRes.success = function <T = unknown>(
        data: T,
        statusCode: number = 200
    ): Response {
        return ResponseHandler.success<T>(this, data, statusCode);
    };

    extendedRes.error = function (
        message: string,
        statusCode: number = 500,
        errorCode?: string,
        details?: unknown
    ): Response {
        return ResponseHandler.error(this, message, statusCode, errorCode, details);
    };

    extendedRes.paginate = function <T = unknown>(
        data: T[],
        total: number,
        page: number,
        limit: number
    ): Response {
        return ResponseHandler.paginate<T>(this, data, total, page, limit);
    };

    next();
};

export default ResponseHandler;
