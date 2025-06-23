import type { Response } from '../../express-augmentations.ts';
import type { ApiResponse, PaginatedApiResponse } from '@shared/types/api';
/**
 * Response utility for sending standardized API responses
 */
class ResponseHandler {
    /**
     * Send a success response with data
     */
    public static success<T = any>(res: Response, data: T, message: string = 'Success', statusCode: number = 200): Response {
        const response: ApiResponse<T> = {
            success: true,
            data,
            message,
        };
        return res.status(statusCode).json(response);
    }
    /**
     * Send an error response
     */
    public static error(res: Response, message: string, statusCode: number = 500, errorCode?: string, details?: any): Response {
        const response: ApiResponse = {
            success: false,
            message,
            error: {
                code: errorCode || 'INTERNAL_SERVER_ERROR',
                message,
                details,
            },
        };
        return res.status(statusCode).json(response);
    }
    /**
     * Send a paginated response
     */
    public static paginate<T = any>(res: Response, data: T[], total: number, page: number, limit: number, message: string = 'Success'): Response {
        const totalPages = Math.ceil(total / limit);
        const response: PaginatedApiResponse<T> = {
            success: true,
            data,
            message,
            meta: {
                total,
                page,
                limit,
                totalPages,
            },
        };
        return res.status(200).json(response);
    }
    /**
     * Send a validation error response
     */
    public static validationError(res: Response, errors: Array<{
        field: string;
        message: string;
        type: string;
    }>, message: string = 'Validation failed'): Response {
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
    public static badRequest(res: Response, message: string = 'Bad request', details?: any): Response {
        return this.error(res, message, 400, 'BAD_REQUEST', details);
    }
}
/**
 * Middleware to extend the Response object with custom methods
 */
export const extendResponse = (_req: any, res: Response, next: () => void): void => {
    // Add success method
    res.success = function <T = any>(data: T, message: string = 'Success', statusCode: number = 200) {
        return ResponseHandler.success<T>(this, data, message, statusCode);
    };
    // Add error method
    res.error = function (message: string, statusCode: number = 500, errorCode?: string, details?: any) {
        return ResponseHandler.error(this, message, statusCode, errorCode, details);
    };
    // Add paginate method
    res.paginate = function <T = any>(data: T[], total: number, page: number, limit: number, message: string = 'Success') {
        return ResponseHandler.paginate<T>(this, data, total, page, limit, message);
    };
    next();
};
export default ResponseHandler;
