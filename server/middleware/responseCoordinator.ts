import { Request, Response, NextFunction } from 'express.js';

interface ResponseMetrics {
  startTime: bigint;
  dbQueries?: number;
  dbAvgTime?: number;
  slowQueries?: any[];
  endpointStats?: any;
}

declare global {
  namespace Express {
    interface Request {
      responseMetrics: ResponseMetrics;
    }
  }
}

/**
 * Centralized response coordinator to prevent header conflicts
 * This middleware ensures only one res.end override and coordinates all monitoring
 */
export function responseCoordinator(req: Request, res: Response, next: NextFunction) {
  const startTime = process.hrtime.bigint();
  
  // Initialize metrics on request
  req.responseMetrics = {
    startTime
  };

  // Single point of response interception
  const originalEnd = res.end;
  let endCalled = false;
  
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    // Prevent multiple calls
    if (endCalled) {
      return originalEnd.call(this, chunk, encoding, cb);
    }
    endCalled = true;
    
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000;
    
    // Only set headers if response hasn't been sent
    if (!res.headersSent) {
      // Performance metrics
      res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
      
      // Database metrics if available
      if (req.responseMetrics.dbQueries !== undefined) {
        res.setHeader('X-DB-Query-Count', req.responseMetrics.dbQueries.toString());
        if (req.responseMetrics.dbAvgTime !== undefined) {
          res.setHeader('X-DB-Avg-Time', req.responseMetrics.dbAvgTime.toFixed(2));
        }
      }
    }
    
    // Log slow requests
    if (duration > 1000) {
      console.warn('SLOW_REQUEST:', {
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString()
      });
    }
    
    // Log slow database queries
    if (req.responseMetrics.slowQueries && req.responseMetrics.slowQueries.length > 0) {
      console.warn('SLOW_DB_QUERIES:', {
        endpoint: req.path,
        slowQueries: req.responseMetrics.slowQueries,
        totalQueries: req.responseMetrics.dbQueries
      });
    }
    
    // Record endpoint statistics
    if (req.responseMetrics.endpointStats) {
      const isError = res.statusCode >= 400;
      req.responseMetrics.endpointStats.recordRequest(req.path, duration, isError);
    }
    
    return originalEnd.call(this, chunk, encoding, cb);
  };
  
  next();
}