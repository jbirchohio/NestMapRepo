import SharedErrorType from '@/types/SharedErrorType';
import type { AxiosError } from 'axios';
import type { RequestConfig, ApiErrorResponse } from '@shared/types/api';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  public code?: string;
  public statusCode?: number;
  public details?: Record<string, unknown>;
  public config?: RequestConfig;
  public response?: unknown;
  public isApiError = true;
  public isNetworkError: boolean;
  public isServerError: boolean;
  public isClientError: boolean;
  public isAuthError: boolean;

  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      details?: Record<string, unknown>;
      config?: RequestConfig;
      response?: unknown;
    } = {}
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details;
    this.config = options.config;
    this.response = options.response;
    
    // Set error type flags
    this.isNetworkError = !this.statusCode;
    this.isServerError = !!this.statusCode && this.statusCode >= 500 && this.statusCode < 600;
    this.isClientError = !!this.statusCode && this.statusCode >= 400 && this.statusCode < 500;
    this.isAuthError = this.statusCode === 401;

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Create an ApiError from an AxiosError
   */
  static fromAxiosError(error: AxiosError<ApiErrorResponse>): ApiError {
    const response = error.response;
    const responseData = (response?.data || {}) as Partial<ApiErrorResponse>;
    
    return new ApiError(responseData.message || error.message, {
      code: responseData.code || error.code,
      statusCode: response?.status,
      details: responseData.details,
      config: error.config as RequestConfig,
      response: response?.data,
    });
  }

  /**
   * Check if an error is an ApiError
   */
  static isApiError(error: SharedErrorType): error is ApiError {
    return (error as ApiError)?.isApiError === true;
  }

  /**
   * Convert the error to a plain object
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      isNetworkError: this.isNetworkError,
      isServerError: this.isServerError,
      isClientError: this.isClientError,
      isAuthError: this.isAuthError,
      stack: this.stack,
    };
  }
}

/**
 * Check if an error is a network error
 */
export const isNetworkError = (error: SharedErrorType): boolean => {
  return ApiError.isApiError(error) && error.isNetworkError;
};

/**
 * Check if an error is a server error (5xx)
 */
export const isServerError = (error: SharedErrorType): boolean => {
  return ApiError.isApiError(error) && error.isServerError;
};

/**
 * Check if an error is a client error (4xx)
 */
export const isClientError = (error: SharedErrorType): boolean => {
  return ApiError.isApiError(error) && error.isClientError;
};

/**
 * Check if an error is an authentication error (401)
 */
export const isAuthError = (error: SharedErrorType): boolean => {
  return ApiError.isApiError(error) && error.isAuthError;
};
