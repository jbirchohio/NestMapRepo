import { toast } from "@/hooks/use-toast";

// Security context interface
export interface SecurityContext {
  userId?: string;
  sessionId?: string;
  token?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: string;
  sensitiveData?: boolean;
}

// Base error class
export class ApplicationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly isSecurityError: boolean;
  public readonly securityContext: SecurityContext;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true,
    isSecurityError: boolean = false,
    securityContext: SecurityContext = {}
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.isSecurityError = isSecurityError;
    this.securityContext = securityContext;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, ApplicationError);
  }
}

// Security-specific error types
export class SecurityError extends ApplicationError {
  constructor(
    message: string = 'Security violation detected',
    code: string = 'SECURITY_ERROR',
    statusCode: number = 403,
    isOperational: boolean = true,
    securityContext: SecurityContext = {}
  ) {
    super(message, code, statusCode, isOperational, true, securityContext);
  }
}

export class TokenError extends SecurityError {
  constructor(message: string = 'Token validation failed') {
    super(message, 'TOKEN_ERROR', 401);
  }
}

export class CSRFError extends SecurityError {
  constructor(message: string = 'CSRF token validation failed') {
    super(message, 'CSRF_ERROR', 403);
  }
}

export class SessionError extends SecurityError {
  constructor(message: string = 'Session validation failed') {
    super(message, 'SESSION_ERROR', 401);
  }
}

export class RateLimitError extends SecurityError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_ERROR', 429);
  }
}

export class AccountLockoutError extends SecurityError {
  constructor(message: string = 'Account is locked') {
    super(message, 'ACCOUNT_LOCKED', 403);
  }
}

// General error types
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

// Error handling utilities
export const handleError = (error: Error, context?: SecurityContext): void => {
  // Handle security errors
  if (error instanceof SecurityError) {
    console.error('Security error:', {
      code: error.code,
      message: error.message,
      context: error.securityContext
    });
    
    // Log security event
    logSecurityEvent(error);
    
    // Show generic error to user
    toast({
      title: 'Security Error',
      description: 'A security error occurred. Please try again later.',
      variant: 'destructive'
    });
    
    // Force sign out for security errors
    if (error instanceof TokenError || error instanceof SessionError) {
      window.location.href = '/login';
    }
    return;
  }

  // Handle other errors
  console.error('Application error:', {
    code: error instanceof ApplicationError ? error.code : 'UNKNOWN_ERROR',
    message: error.message
  });

  // Show appropriate error message
  if (error instanceof NetworkError) {
    toast({
      title: 'Network Error',
      description: 'Failed to connect to server. Please check your internet connection.',
      variant: 'destructive'
    });
  } else if (error instanceof ValidationError) {
    toast({
      title: 'Validation Error',
      description: error.message,
      variant: 'destructive'
    });
  } else {
    toast({
      title: 'Error',
      description: 'An unexpected error occurred. Please try again later.',
      variant: 'destructive'
    });
  }
};

// Security event logging
const logSecurityEvent = (error: SecurityError): void => {
  // Log security event to server
  if (error.securityContext && error.securityContext.sensitiveData) {
    // Send security event to server
    fetch('/api/security/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: error.code,
        timestamp: new Date().toISOString(),
        ...error.securityContext
      })
    }).catch(() => {
      // Fail silently if logging fails
    });
  }
};

export interface ErrorContext {
  userId?: string;
  organizationId?: string;
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
