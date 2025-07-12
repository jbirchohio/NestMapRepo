import { Response } from 'express.js';

/**
 * Standard API success response structure
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
}

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Formats a successful API response
 * @param data Response data
 * @param message Optional success message
 * @param meta Optional metadata
 * @returns Formatted success response
 */
export const formatSuccessResponse = <T>(
  data: T,
  message?: string,
  meta?: Record<string, unknown>
): ApiSuccessResponse<T> => ({
  success: true,
  data,
  ...(message && { message }),
  ...(meta && { meta }),
});

/**
 * Formats an error API response
 * @param message Error message
 * @param details Optional error details
 * @returns Formatted error response
 */
export const formatErrorResponse = (
  message: string,
  details?: Record<string, unknown>
): ApiErrorResponse => ({
  success: false,
  message,
  ...(details && { details }),
});

/**
 * Utility class for sending standardized API responses
 */
export class ResponseFormatter {
  /**
   * Sends a successful response
   * @param res Express response object
   * @param data Response data
   * @param message Optional success message
   * @param meta Optional metadata
   * @param statusCode HTTP status code (default: 200)
   */
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    meta?: Record<string, unknown>,
    statusCode = 200
  ): Response {
    return res.status(statusCode).json(formatSuccessResponse(data, message, meta));
  }

  /**
   * Sends an error response
   * @param res Express response object
   * @param message Error message
   * @param details Optional error details
   * @param statusCode HTTP status code (default: 400)
   */
  static error(
    res: Response,
    message: string,
    details?: Record<string, unknown>,
    statusCode = 400
  ): Response {
    return res.status(statusCode).json(formatErrorResponse(message, details));
  }

  /**
   * Sends a created (201) response
   * @param res Express response object
   * @param data Response data
   * @param message Optional success message
   */
  static created<T>(res: Response, data: T, message?: string): Response {
    return this.success(res, data, message || 'Resource created successfully', undefined, 201);
  }

  /**
   * Sends a no content (204) response
   * @param res Express response object
   */
  static noContent(res: Response): Response {
    return res.status(204).end();
  }

  /**
   * Sends a bad request (400) error response
   * @param res Express response object
   * @param message Error message
   * @param details Optional error details
   */
  static badRequest(res: Response, message: string, details?: Record<string, unknown>): Response {
    return this.error(res, message, details, 400);
  }

  /**
   * Sends an unauthorized (401) error response
   * @param res Express response object
   * @param message Error message
   */
  static unauthorized(res: Response, message = 'Unauthorized'): Response {
    return this.error(res, message, undefined, 401);
  }

  /**
   * Sends a forbidden (403) error response
   * @param res Express response object
   * @param message Error message
   */
  static forbidden(res: Response, message = 'Forbidden'): Response {
    return this.error(res, message, undefined, 403);
  }

  /**
   * Sends a not found (404) error response
   * @param res Express response object
   * @param message Error message
   */
  static notFound(res: Response, message = 'Resource not found'): Response {
    return this.error(res, message, undefined, 404);
  }

  /**
   * Sends a conflict (409) error response
   * @param res Express response object
   * @param message Error message
   * @param details Optional error details
   */
  static conflict(res: Response, message: string, details?: Record<string, unknown>): Response {
    return this.error(res, message, details, 409);
  }

  /**
   * Sends a server error (500) response
   * @param res Express response object
   * @param message Error message
   */
  static serverError(res: Response, message = 'Internal server error'): Response {
    return this.error(res, message, undefined, 500);
  }
}
