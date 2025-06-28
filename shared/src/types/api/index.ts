import { z } from 'zod';
import type { AxiosRequestConfig, CancelToken, AxiosProgressEvent } from 'axios';

/**
 * Extended request configuration with custom options
 * @template T - Expected response type
 * @template D - Request data type
 */
export interface RequestConfig<T = any, D = any> extends Omit<AxiosRequestConfig<D>, 'cancelToken' | 'headers'> {
  /** Request headers */
  headers?: Record<string, string>;
  /** Skip authentication for this request */
  skipAuth?: boolean;
  /** Skip global error handling for this request */
  skipErrorHandling?: boolean;
  /** Enable response caching */
  useCache?: boolean;
  /** Custom cache key */
  cacheKey?: string;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
  /** Cancel token or boolean to auto-generate one */
  cancelToken?: CancelToken | boolean;
  /** Request ID for cancellation */
  requestId?: string;
  /** On upload progress callback */
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
  /** On download progress callback */
  onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void;
  /** Additional metadata */
  meta?: Record<string, unknown>;
}

/**
 * Standard error codes used in API responses
 */
export enum ApiErrorCode {
  // 4xx Client Errors
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // 5xx Server Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Business Logic Errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  INVALID_OPERATION = 'INVALID_OPERATION',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
  
  // Authentication & Authorization
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  /** Machine-readable error code */
  code: ApiErrorCode | string;
  
  /** Human-readable error message */
  message: string;
  
  /** Additional error details */
  details?: unknown;
  
  /** Validation errors (if applicable) */
  errors?: Record<string, string[]>;
  
  /** Stack trace (only in development) */
  stack?: string;
}

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T = unknown> {
  /** Response data */
  data: T;
  
  /** Optional metadata */
  meta?: {
    /** Pagination info */
    pagination?: {
      /** Current page number (1-based) */
      page: number;
      
      /** Number of items per page */
      limit: number;
      
      /** Total number of items */
      total: number;
      
      /** Total number of pages */
      totalPages: number;
      
      /** Whether there are more items */
      hasMore: boolean;
    };
    
    /** Additional metadata */
    [key: string]: unknown;
  };
}

/**
 * Standard API response type
 */
export type ApiResponse<T = unknown> = 
  | { success: true } & ApiSuccessResponse<T>
  | { success: false } & ApiErrorResponse;

/**
 * Pagination parameters for API requests
 */
export interface PaginationParams {
  /** Page number (1-based) */
  page?: number;
  
  /** Number of items per page */
  limit?: number;
  
  /** Sort field */
  sortBy?: string;
  
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Schema for validating pagination parameters
 */
export const paginationParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
}).partial();

/**
 * Creates a successful API response
 */
export function createSuccessResponse<T = unknown>(
  data: T,
  meta?: ApiSuccessResponse['meta']
): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(meta && { meta }),
  };
}

/**
 * Creates a paginated API response
 */
export function createPaginatedResponse<T = unknown>(
  data: T[],
  total: number,
  params: PaginationParams
): ApiResponse<T[]> {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const totalPages = Math.ceil(total / limit);
  
  return createSuccessResponse(data, {
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  });
}

/**
 * Creates an error API response
 */
export function createErrorResponse(
  code: ApiErrorCode | string,
  message: string,
  options: {
    details?: unknown;
    errors?: Record<string, string[]>;
    stack?: string;
  } = {}
): ApiResponse<never> {
  return {
    success: false,
    code,
    message,
    ...(options.details && { details: options.details }),
    ...(options.errors && { errors: options.errors }),
    ...(process.env.NODE_ENV === 'development' && options.stack && { stack: options.stack }),
  };
}

/**
 * Type guard to check if an object is an ApiErrorResponse
 */
export function isApiErrorResponse(
  response: unknown
): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'code' in response &&
    'message' in response
  );
}

/**
 * Type guard to check if an object is an ApiSuccessResponse
 */
export function isApiSuccessResponse<T = unknown>(
  response: unknown
): response is ApiSuccessResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'data' in response
  );
}

/**
 * Type guard to check if an object is an ApiResponse
 */
export function isApiResponse(
  response: unknown
): response is ApiResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (isApiSuccessResponse(response) || isApiErrorResponse(response))
  );
}

/**
 * Type for API request functions
 */
export type ApiRequestFunction<T = unknown, P = void> = (
  params: P
) => Promise<ApiResponse<T>>;

/**
 * Type for paginated API request functions
 */
export type PaginatedApiRequestFunction<T> = (
  params: PaginationParams & Record<string, unknown>
) => Promise<ApiResponse<T[]>>;
