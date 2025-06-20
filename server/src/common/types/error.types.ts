/**
 * Error types for standardized error handling
 */
export enum ErrorType {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  CONFLICT = 'CONFLICT',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

/**
 * Standard API error structure
 */
export interface ApiError extends Error {
  type: ErrorType;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

/**
 * Creates a standardized API error
 * @param type Error type
 * @param message Error message
 * @param details Additional error details
 * @returns ApiError object
 */
export const createApiError = (
  type: ErrorType,
  message: string,
  details?: Record<string, unknown>
): ApiError => {
  const error = new Error(message) as ApiError;
  error.type = type;
  error.details = details;
  return error;
};
