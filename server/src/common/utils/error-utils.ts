import { AppErrorCode } from '@shared/schema/types/error-codes';

/**
 * Creates a standardized API error object
 */
export function createApiError(code: AppErrorCode, message: string): Error {
  const error = new Error(message) as any;
  error.code = code;
  error.isApiError = true;
  return error;
}

/**
 * Checks if an error is an API error
 */
export function isApiError(error: unknown): error is Error & { code: AppErrorCode; isApiError: boolean } {
  return error instanceof Error && (error as any).isApiError === true;
}
