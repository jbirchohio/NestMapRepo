import { toast } from "@/hooks/use-toast";

export class ApplicationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, ApplicationError);
  }
}

export class NetworkError extends ApplicationError {
  constructor(message: string = 'Network request failed') {
    super(message, 'NETWORK_ERROR', 503);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string = 'Validation failed') {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'PERMISSION_ERROR', 403);
  }
}

export interface ErrorContext {
  userId?: number;
  organizationId?: number;
  action?: string;
  metadata?: Record<string, any>;
}

export class ErrorHandler {
  static handle(error: Error, context: ErrorContext = {}) {
    console.error('Error handled:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      timestamp: new Date().toISOString()
    });

    // Show user-friendly error message
    if (error instanceof ApplicationError) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else if (error instanceof TypeError) {
      toast({
        title: "System Error", 
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Send to monitoring service (Sentry, LogRocket, etc.)
      this.reportError(error, context);
    }
  }

  static async handleAsync<T>(
    operation: () => Promise<T>,
    context: ErrorContext = {}
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.handle(error as Error, context);
      return null;
    }
  }

  static handleSync<T>(
    operation: () => T,
    context: ErrorContext = {}
  ): T | null {
    try {
      return operation();
    } catch (error) {
      this.handle(error as Error, context);
      return null;
    }
  }

  private static reportError(error: Error, context: ErrorContext) {
    // Placeholder for production error reporting
    // Implementation would depend on chosen service (Sentry, LogRocket, etc.)
    console.log('Would report to error service:', { error, context });
  }

  static createRetryWrapper<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ) {
    return async (): Promise<T> => {
      let lastError: Error;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error as Error;
          
          if (attempt === maxRetries) {
            throw lastError;
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
      
      throw lastError!;
    };
  }
}

export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => R,
  context: ErrorContext = {}
) => {
  return (...args: T): R | null => {
    return ErrorHandler.handleSync(() => fn(...args), context);
  };
};

export const withAsyncErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: ErrorContext = {}
) => {
  return async (...args: T): Promise<R | null> => {
    return ErrorHandler.handleAsync(() => fn(...args), context);
  };
};