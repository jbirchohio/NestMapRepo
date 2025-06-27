// Core types
import type { AxiosRequestConfig, CancelToken, AxiosProgressEvent } from 'axios';
import type { User } from './auth/user.js';
import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';

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
  /** Response type override */
  responseType?: 'json' | 'text' | 'blob';
  /** Metadata for request tracking */
  meta?: Record<string, unknown>;
}

/**
 * Standard API response format
 * @template T - Response data type
 */
export interface ApiResponse<T = any> {
  /** Response data */
  data: T;
  /** Optional message from the server */
  message?: string;
  /** Indicates if the request was successful */
  success: boolean;
  /** Server timestamp */
  timestamp?: string;
  /** Optional error code for error responses */
  code?: string;
  /** Optional validation errors */
  errors?: Record<string, string[]>;
  /** Error details */
  error?: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
  /** Pagination metadata */
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
}

export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Standard error response format
 */
export interface ApiErrorResponse {
  /** Error message */
  message: string;
  /** Error code for programmatic handling */
  code?: string;
  /** HTTP status code */
  statusCode?: number;
  /** Additional error details */
  details?: Record<string, unknown>;
  /** Server timestamp */
  timestamp?: string;
  /** API path that caused the error */
  path?: string;
  /** Validation errors if any */
  errors?: Record<string, string[]>;
  /** For compatibility with Error */
  stack?: string;
  isOperational?: boolean;
}

/**
 * Extended error response that includes HTTP status
 */
export interface ErrorResponse extends Error, Omit<ApiErrorResponse, 'message' | 'code'> {
  statusCode?: number;
  isOperational?: boolean;
}

export interface ValidationError {
  field: string | number;
  message: string;
  type: string;
  context?: {
    label?: string;
    value?: unknown;
    key?: string;
  };
}

export interface ValidationErrorResponse extends ApiResponse {
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: ValidationError[];
  };
}

/**
 * Authentication tokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  tokenType?: string;
}

/**
 * Authentication response
 */
export interface AuthResponse extends ApiResponse<{ user: User; tokens: AuthTokens }> {}

export type ApiHandler<T = unknown> = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<ApiResponse<T> | void> | ApiResponse<T> | void;

export interface ControllerResponse<T = unknown> {
  data?: T;
  message?: string;
  meta?: Record<string, unknown>;
  statusCode?: number;
  headers?: Record<string, string>;
}

export interface PaginatedControllerResponse<T> extends ControllerResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
