import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { logger } from '../utils/logger';

/**
 * Correlation ID middleware for request tracing
 * Helps debug issues across distributed systems
 */

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      requestId?: string;
      parentRequestId?: string;
    }
  }
}

/**
 * Generate or extract correlation ID from request
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // Check for existing correlation ID in headers
  const existingCorrelationId = 
    req.headers['x-correlation-id'] || 
    req.headers['x-request-id'] ||
    req.headers['correlation-id'] ||
    req.headers['request-id'];

  // Check for parent request ID (for tracing request chains)
  const parentRequestId = 
    req.headers['x-parent-request-id'] ||
    req.headers['parent-request-id'];

  // Generate new IDs if not present
  const correlationId = String(existingCorrelationId || nanoid(12));
  const requestId = nanoid(8);

  // Attach to request object
  req.correlationId = correlationId;
  req.requestId = requestId;
  if (parentRequestId) {
    req.parentRequestId = String(parentRequestId);
  }

  // Set response headers
  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('X-Request-ID', requestId);
  if (parentRequestId) {
    res.setHeader('X-Parent-Request-ID', String(parentRequestId));
  }

  // Create context object for logging
  const logContext = {
    correlationId,
    requestId,
    parentRequestId: parentRequestId || undefined,
    method: req.method,
    path: req.path,
    userId: (req as any).user?.id,
  };

  // Attach context to request for use in handlers
  (req as any).logContext = logContext;

  // Log request start (only in development)
  if (process.env.NODE_ENV === 'development') {
    logger.info('Request started', {
      ...logContext,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer,
    });
  }

  // Track request timing
  const startTime = Date.now();

  // Log response when finished (only for errors in production)
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    const duration = Date.now() - startTime;
    
    // Only log in development or for errors
    if (process.env.NODE_ENV === 'development' || res.statusCode >= 400) {
      logger.info('Request completed', {
        ...logContext,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentLength: res.getHeader('content-length'),
      });
    }

    // Call original end method
    return originalEnd.apply(res, args as any);
  };

  // Handle errors
  res.on('error', (error) => {
    const duration = Date.now() - startTime;
    logger.error('Request failed', {
      ...logContext,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      statusCode: res.statusCode,
    });
  });

  next();
}

/**
 * Extract correlation ID from request
 */
export function getCorrelationId(req: Request): string {
  return req.correlationId || 'unknown';
}

/**
 * Create a correlation context for async operations
 */
export function createCorrelationContext(req: Request) {
  return {
    correlationId: req.correlationId,
    requestId: req.requestId,
    parentRequestId: req.parentRequestId,
    userId: (req as any).user?.id,
  };
}

/**
 * Propagate correlation ID to external requests
 */
export function propagateCorrelationId(headers: Record<string, string>, req: Request): Record<string, string> {
  if (req.correlationId) {
    headers['X-Correlation-ID'] = req.correlationId;
  }
  if (req.requestId) {
    headers['X-Parent-Request-ID'] = req.requestId;
  }
  return headers;
}

/**
 * Middleware to require correlation ID (for critical endpoints)
 */
export function requireCorrelationId(req: Request, res: Response, next: NextFunction) {
  if (!req.correlationId) {
    logger.warn('Request missing correlation ID', {
      method: req.method,
      path: req.path,
      headers: req.headers,
    });
    
    return res.status(400).json({
      error: 'Missing correlation ID',
      message: 'This endpoint requires an X-Correlation-ID header',
    });
  }
  
  next();
}

/**
 * Create a traced async function that preserves correlation context
 */
export function traced<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: { correlationId?: string; requestId?: string }
): T {
  return (async (...args: any[]) => {
    const logContext = {
      correlationId: context.correlationId,
      requestId: context.requestId,
      function: fn.name || 'anonymous',
    };

    try {
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`Function ${fn.name} started`, logContext);
      }
      const result = await fn(...args);
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`Function ${fn.name} completed`, logContext);
      }
      return result;
    } catch (error: any) {
      logger.error(`Function ${fn.name} failed`, {
        ...logContext,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }) as T;
}