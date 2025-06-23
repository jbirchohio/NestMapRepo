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
