import { Response } from 'express';

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
 * Standard API paginated response structure
 */
export interface ApiPaginatedResponse<T> extends ApiSuccessResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  details?: Record<string, unknown>;
  code?: string;
}

/**
 * Response data type that can be returned from controllers
 */
export type ControllerResponse<T> = 
  | { type: 'success'; data: T; statusCode?: number; message?: string; meta?: Record<string, unknown> }
  | { type: 'paginated'; data: T[]; total: number; page: number; limit: number; message?: string; statusCode?: number }
  | { type: 'error'; message: string; statusCode: number; details?: Record<string, unknown>; code?: string };

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
 * Formats a paginated API response
 * @param data Array of items
 * @param total Total number of items
 * @param page Current page number
 * @param limit Number of items per page
 * @param message Optional success message
 * @returns Formatted paginated response
 */
export const formatPaginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message?: string
): ApiPaginatedResponse<T> => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    ...formatSuccessResponse(data, message),
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPrevPage,
    },
  };
};

/**
 * Formats an error API response
 * @param message Error message
 * @param details Optional error details
 * @param code Optional error code
 * @returns Formatted error response
 */
export const formatErrorResponse = (
  message: string, 
  details?: Record<string, unknown>,
  code?: string
): ApiErrorResponse => ({
  success: false,
  message,
  ...(details && { details }),
  ...(code && { code }),
});

/**
 * Utility class for handling API responses in a NestJS application
 * Supports both direct response sending and response object creation
 */
export class ResponseFormatter {
  /**
   * Creates a success response object
   */
  public static success<T>(
    data: T,
    message?: string,
    meta?: Record<string, unknown>
  ): ApiSuccessResponse<T> {
    return formatSuccessResponse(data, message, meta);
  }

  /**
   * Creates a paginated response object
   */
  public static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message?: string
  ): ApiPaginatedResponse<T> {
    return formatPaginatedResponse(data, total, page, limit, message);
  }

  /**
   * Creates an error response object
   */
  public static error(
    message: string,
    details?: Record<string, unknown>,
    code?: string
  ): ApiErrorResponse {
    return formatErrorResponse(message, details, code);
  }

  /**
   * Sends a success response using Express response object
   */
  public static sendSuccess<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode = 200,
    meta?: Record<string, unknown>
  ): void {
    res.status(statusCode).json(ResponseFormatter.success(data, message, meta));
  }

  /**
   * Sends a paginated response using Express response object
   */
  public static sendPaginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number,
    message?: string,
    statusCode = 200
  ): void {
    res
      .status(statusCode)
      .json(ResponseFormatter.paginated(data, total, page, limit, message));
  }

  /**
   * Sends an error response using Express response object
   */
  public static sendError(
    res: Response,
    message: string,
    statusCode = 400,
    details?: Record<string, unknown>,
    code?: string
  ): void {
    res
      .status(statusCode)
      .json(ResponseFormatter.error(message, details, code));
  }

  /**
   * Creates a controller response that can be returned from NestJS controllers
   */
  public static createControllerResponse<T>(
    type: 'success',
    data: T,
    options?: { message?: string; statusCode?: number; meta?: Record<string, unknown> }
  ): ControllerResponse<T>;
  public static createControllerResponse<T>(
    type: 'paginated',
    data: T[],
    options: { total: number; page: number; limit: number; message?: string; statusCode?: number }
  ): ControllerResponse<T>;
  public static createControllerResponse<T>(
    type: 'error',
    message: string,
    options: { statusCode: number; details?: Record<string, unknown>; code?: string }
  ): ControllerResponse<T>;
  public static createControllerResponse<T>(
    type: 'success' | 'paginated' | 'error',
    data: any,
    options: any = {}
  ): ControllerResponse<T> {
    if (type === 'success') {
      return { type: 'success', data, ...options };
    } else if (type === 'paginated') {
      return { type: 'paginated', data, ...options };
    } else {
      return { type: 'error', message: data, ...options };
    }
  }

  /**
   * Sends a created (201) response
   * @param res Express response object
   * @param data Response data
   * @param message Optional success message
   */
  public static created<T>(
    res: Response, 
    data: T, 
    message = 'Resource created successfully'
  ): void {
    this.sendSuccess(res, data, message, 201);
  }

  /**
   * Sends a no content (204) response
   * @param res Express response object
   */
  public static noContent(res: Response): void {
    res.status(204).end();
  }

  /**
   * Sends a bad request (400) error response
   * @param res Express response object
   * @param message Error message
   * @param details Optional error details
   */
  public static badRequest(
    res: Response, 
    message: string, 
    details?: Record<string, unknown>
  ): void {
    this.sendError(res, message, 400, details);
  }

  /**
   * Sends an unauthorized (401) error response
   * @param res Express response object
   * @param message Error message
   */
  public static unauthorized(
    res: Response, 
    message = 'Unauthorized'
  ): void {
    this.sendError(res, message, 401);
  }

  /**
   * Sends a forbidden (403) error response
   * @param res Express response object
   * @param message Error message
   */
  public static forbidden(
    res: Response, 
    message = 'Forbidden'
  ): void {
    this.sendError(res, message, 403);
  }

  /**
   * Sends a not found (404) error response
   * @param res Express response object
   * @param message Error message
   */
  public static notFound(
    res: Response, 
    message = 'Resource not found'
  ): void {
    this.sendError(res, message, 404);
  }

  /**
   * Sends a conflict (409) error response
   * @param res Express response object
   * @param message Error message
   * @param details Optional error details
   */
  public static conflict(
    res: Response, 
    message: string, 
    details?: Record<string, unknown>
  ): void {
    this.sendError(res, message, 409, details);
  }

  /**
   * Sends a server error (500) response
   * @param res Express response object
   * @param message Error message
   */
  public static serverError(
    res: Response, 
    message = 'Internal server error'
  ): void {
    this.sendError(res, message, 500);
  }
}
