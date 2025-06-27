import SharedErrorType from '@/types/SharedErrorType';
import { AxiosError } from 'axios';
import { AuthError, AuthErrorCode } from '@shared/types/auth';

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
    this.statusCode = options.statusCode;
    this.details = options.details;
    this.originalError = originalError;

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiClientError);
    }
  }
}

export function isAxiosError<T = any>(
  error: SharedErrorType
): error is AxiosError<T> {
  return (error as AxiosError).isAxiosError === true;
}

export function isAuthError(error: SharedErrorType): error is AuthError {
  return error instanceof AuthError;
}

export function isApiClientError(error: SharedErrorType): error is ApiClientError {
  return error instanceof ApiClientError;
}

export function createApiError(
  message: string,
  options: ApiClientErrorOptions = {},
  originalError?: Error
): ApiClientError {
  return new ApiClientError(message, options, originalError);
}

export function createAuthError(
  message: string,
  code: AuthErrorCode = AuthErrorCode.UNKNOWN_ERROR,
  details?: Record<string, any>
): AuthError {
  return new AuthError(code, message, details);
}
