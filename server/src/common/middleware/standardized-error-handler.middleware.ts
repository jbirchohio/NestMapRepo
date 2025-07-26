// Local type definitions to avoid external dependencies
interface Request {
  params?: Record<string, string>;
  body?: Record<string, any>;
  query?: Record<string, any>;
  headers?: Record<string, string | string[]>;
  path?: string;
  ip?: string;
  method?: string;
  [key: string]: any;
}

interface Response {
  status(code: number): Response;
  json(data: any): Response;
  send(data: any): Response;
  setHeader(name: string, value: string): void;
  getHeader(name: string): string | undefined;
  headersSent: boolean; // Added property to fix the error
}

interface NextFunction {
  (error?: any): void;
}

// Mock logger implementation
class Logger {
  constructor(private name: string) {}
  
  log(message: string): void {
    console.log(`[${this.name}] ${message}`);
  }
  
  error(message: string, stack?: string): void {
    console.error(`[${this.name}] ${message}`);
    if (stack) console.error(stack);
  }
  
  warn(message: string): void {
    console.warn(`[${this.name}] ${message}`);
  }
}

// Mock error types
enum ErrorType {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  CONFLICT = 'CONFLICT',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}

interface ApiError extends Error {
  type: ErrorType;
  statusCode: number;
  message: string;
  details?: any;
}

 interface ExtendedErrorResponse {
        type: ErrorType;
        message: string;
        timestamp: string;
        path: string;
        method: string;
        details?: unknown;
        stack?: string;
        requestId?: string;
      }
      


/**
 * Maps error types to HTTP status codes
 */
const errorTypeToStatusCode: Record<ErrorType, number> = {
  [ErrorType.UNAUTHORIZED]: 401,
  [ErrorType.FORBIDDEN]: 403,
  [ErrorType.NOT_FOUND]: 404,
  [ErrorType.BAD_REQUEST]: 400,
  [ErrorType.CONFLICT]: 409,
  [ErrorType.INTERNAL_SERVER_ERROR]: 500,
};

/**
 * Standardized error handler middleware
 * Uses the ApiError structure for consistent error responses
 * @param logger Logger instance
 * @returns Express middleware function
 */
export const standardizedErrorHandler = (logger: Logger) => {
  return (error: Error | ApiError, req: Request, res: Response, next: NextFunction) => {
    // Skip if headers already sent
    if (res.headersSent) {
      return next(error);
    }

    // Default error response
    let errorResponse = {
      success: false,
      error: {
        type: ErrorType.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
      },
    };

    // Default status code
    let statusCode = 500;

    // If it's an ApiError, use its properties
    if ('type' in error) {
      const apiError = error as ApiError;
      
      errorResponse.error.type = apiError.type;
      errorResponse.error.message = apiError.message;
      
      /**
       * Extended error response type for additional properties
       */
     
      if ('details' in apiError && apiError.details !== undefined) {
        (errorResponse.error as ExtendedErrorResponse).details = apiError.details;
      }
      
      // Map error type to status code
      statusCode = errorTypeToStatusCode[apiError.type] || 500;

      // Log based on error severity
      if (statusCode >= 500) {
        logger.error(
          `[${apiError.type}] ${req.method} ${req.path}: ${apiError.message}`,
          apiError.stack
        );
      } else if (statusCode >= 400) {
        logger.warn(
          `[${apiError.type}] ${req.method} ${req.path}: ${apiError.message}`
        );
      }
    } else {
      // For standard errors, convert to internal server error
      errorResponse.error.message = error.message || 'An unexpected error occurred';
      
      // Add stack trace in development
      if (process.env.NODE_ENV !== 'production' && error.stack) {
        (errorResponse.error as ExtendedErrorResponse).stack = error.stack;
      }
      
      // Log error
      logger.error(`[INTERNAL_SERVER_ERROR] ${req.method} ${req.path}: ${error.message}`, error.stack);
    }

    // Add request ID if available
    const requestId = req.headers?.['x-request-id'] ?? undefined;
    if (requestId && typeof requestId === 'string') {
      (errorResponse.error as {
        type: ErrorType;
        message: string;
        timestamp: string;
        path: string;
        method: string;
        details?: unknown;
        stack?: string;
        requestId?: string;
      }).requestId = requestId;
    }

    // Send response
    res.status(statusCode).json(errorResponse);
  };
};

/**
 * Wrapper for controller methods to standardize error handling
 * @param handler Controller handler function
 * @param logger Logger instance
 * @returns Wrapped handler function with standardized error handling
 */
export const withStandardizedErrorHandling = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

