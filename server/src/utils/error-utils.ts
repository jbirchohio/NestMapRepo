/**
 * @fileoverview This file defines custom error classes and error codes for the application.
 * It helps in standardizing error responses and handling.
 */

/**
 * Enum for authentication-related error codes.
 * Provides a standardized set of codes for identifying specific auth errors.
 */
export enum AuthErrorCode {
  // General Errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Authentication Errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_BLACKLISTED = 'TOKEN_BLACKLISTED',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  MISSING_TOKEN = 'MISSING_TOKEN',
  INVALID_OR_EXPIRED_TOKEN = 'INVALID_OR_EXPIRED_TOKEN',

  // User Account Errors
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
}

/**
 * Custom error class for authentication-specific errors.
 * Extends the base Error class to include a specific error code and HTTP status.
 */
class AuthError extends Error {
  public readonly code: AuthErrorCode;
  public readonly status: number;

  /**
   * Creates an instance of AuthError.
   * @param {AuthErrorCode} code - The specific error code from the AuthErrorCode enum.
   * @param {string} message - A human-readable error message.
   * @param {number} [status=400] - The HTTP status code to be sent in the response.
   */
  constructor(code: AuthErrorCode, message: string, status: number = 400) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;

    // This line is to ensure that instanceof works correctly
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

export default AuthError;

/**
 * Type guard to check if an error has a message property
 * @param error The error to check
 * @returns True if the error has a message property
 */
export function isErrorWithMessage(error: unknown): error is {
    message: string;
    stack?: string;
} {
    return (typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as {
            message: unknown;
        }).message === 'string');
}

/**
 * Converts an unknown error to an Error instance
 * @param error The error to convert
 * @returns An Error instance
 */
export function toErrorWithMessage(error: unknown): Error {
    if (error instanceof Error) {
        return error;
    }
    if (isErrorWithMessage(error)) {
        return new Error(error.message);
    }
    try {
        return new Error(JSON.stringify(error));
    }
    catch {
        return new Error(String(error));
    }
}

export interface FormattedError {
    message: string;
    code: string;
    stack?: string;
}

export function classifyError(error: Error): string {
    switch (error.name) {
        case 'ValidationError':
            return 'VALIDATION';
        case 'DatabaseError':
            return 'DATABASE';
        case 'UnauthorizedError':
            return 'AUTH';
        default:
            return 'UNKNOWN';
    }
}
export function formatErrorResponse(error: Error): FormattedError {
    return {
        message: error.message,
        code: classifyError(error),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
}
import logger from './logger.ts';
export function logAndFormatError(error: unknown): FormattedError {
    const err = toErrorWithMessage(error);
    logger.error(err.message, err);
    return formatErrorResponse(err);
}
