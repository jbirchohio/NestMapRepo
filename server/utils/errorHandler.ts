/**
 * Standardized Error Response System
 * Ensures consistent error formatting across all API endpoints
 */

export interface StandardErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

export interface StandardSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

/**
 * Standard error codes for consistent frontend handling
 */
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Multi-tenant
  ORGANIZATION_ACCESS_DENIED: 'ORGANIZATION_ACCESS_DENIED',
  CROSS_ORGANIZATION_ACCESS: 'CROSS_ORGANIZATION_ACCESS',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // External services
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  API_KEY_INVALID: 'API_KEY_INVALID',

  // Demo mode
  DEMO_MODE_RESTRICTED: 'DEMO_MODE_RESTRICTED',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR'
} as const;

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: keyof typeof ErrorCodes,
  message: string,
  details?: any,
  requestId?: string
): StandardErrorResponse {
  return {
    success: false,
    error: {
      code: ErrorCodes[code],
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId
    }
  };
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): StandardSuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

/**
 * Express middleware for global error handling
 */
export function globalErrorHandler(err: any, req: any, res: any, next: any) {
  // Generate request ID for tracking
  const requestId = req.headers['x-request-id'] ||
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json(createErrorResponse(
      'VALIDATION_ERROR',
      'Input validation failed',
      err.details,
      requestId
    ));
  }

  if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
    return res.status(503).json(createErrorResponse(
      'EXTERNAL_SERVICE_ERROR',
      'External service temporarily unavailable',
      { service: err.hostname },
      requestId
    ));
  }

  if (err.name === 'DatabaseError' || err.code?.startsWith('23')) {
    return res.status(500).json(createErrorResponse(
      'DATABASE_ERROR',
      'Database operation failed',
      process.env.NODE_ENV === 'development' ? err.message : undefined,
      requestId
    ));
  }

  // Default internal server error
  return res.status(500).json(createErrorResponse(
    'INTERNAL_ERROR',
    'An unexpected error occurred',
    process.env.NODE_ENV === 'development' ? err.message : undefined,
    requestId
  ));
}

/**
 * Helper functions for common error responses
 */
export const CommonErrors = {
  unauthorized: (message = 'Authentication required') =>
    createErrorResponse('UNAUTHORIZED', message),

  forbidden: (message = 'Access denied') =>
    createErrorResponse('FORBIDDEN', message),

  notFound: (resource = 'Resource') =>
    createErrorResponse('NOT_FOUND', `${resource} not found`),

  validation: (message = 'Invalid input data', details?: any) =>
    createErrorResponse('VALIDATION_ERROR', message, details),

  organizationAccess: (message = 'Organization access required') =>
    createErrorResponse('ORGANIZATION_ACCESS_DENIED', message),

  demoRestricted: (message = 'This action is not available in demo mode') =>
    createErrorResponse('DEMO_MODE_RESTRICTED', message),

  rateLimit: (message = 'Too many requests, please try again later') =>
    createErrorResponse('RATE_LIMIT_EXCEEDED', message),

  externalService: (service: string, message = 'External service error') =>
    createErrorResponse('EXTERNAL_SERVICE_ERROR', message, { service })
};