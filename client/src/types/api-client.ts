import { AxiosError, AxiosRequestConfig } from 'axios';
import type { AuthError } from '@shared/schema/types/auth/auth';
import type { Error as ApiError } from '@shared/schema/types/error';

type SharedErrorType = Error | ApiError | AuthError | { message: string; code?: string } | string | unknown;

export interface ApiClientErrorOptions {
  isAuthError?: boolean;
  code?: string;
  details?: unknown;
  statusCode?: number;
}

export class ApiClientError extends Error {
  isAuthError: boolean;
  code?: string;
  details?: unknown;
  statusCode?: number;
  originalError?: Error;

  constructor(
    message: string,
    options: ApiClientErrorOptions = {},
    originalError?: Error
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.isAuthError = options.isAuthError ?? false;
    this.code = options.code;
    this.details = options.details;
    this.statusCode = options.statusCode;
    this.originalError = originalError;
    
    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiClientError);
    }
  }
}

export interface RequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
  skipErrorHandling?: boolean;
  skipCsrf?: boolean;
  requestId?: string;
  _retry?: boolean;
  refreshOnUnauthorized?: boolean;
  maxRetryAttempts?: number;
  metrics?: unknown;
}

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
  withCredentials?: boolean;
  useAuthInterceptor?: boolean;
  retryOnAuthFailure?: boolean;
  maxRetryAttempts?: number;
}

export interface BaseApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
}

export interface PaginatedApiResponse<T> extends BaseApiResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type ApiResponse<T = unknown> = BaseApiResponse<T> | PaginatedApiResponse<T>;

export function isAxiosError<T = any>(
  error: SharedErrorType
): error is AxiosError<BaseApiResponse<T>> {
  return (error as AxiosError).isAxiosError === true;
}

export function isAuthError(error: SharedErrorType): error is AuthError {
  return (error as AuthError)?.code !== undefined && 
         (error as AuthError)?.message !== undefined;
}

export function isApiClientError(error: SharedErrorType): error is ApiClientError {
  return error instanceof ApiClientError;
}
