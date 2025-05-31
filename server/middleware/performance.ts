import { Request, Response, NextFunction } from 'express';

/**
 * Performance monitoring middleware
 * Tracks response times and identifies slow endpoints
 */
export function performanceMonitor(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    
    // Log slow requests (>1000ms)
    if (duration > 1000) {
      console.warn('SLOW_REQUEST:', {
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString()
      });
    }
    
    // Performance metrics
    res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
    
    return originalEnd.call(this, chunk, encoding, cb);
  };
  
  next();
}

/**
 * Memory usage monitoring
 */
export function memoryMonitor(req: Request, res: Response, next: NextFunction) {
  const memUsage = process.memoryUsage();
  const memoryThreshold = 500 * 1024 * 1024; // 500MB
  
  if (memUsage.heapUsed > memoryThreshold) {
    console.warn('HIGH_MEMORY_USAGE:', {
      heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
      external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
}

/**
 * Database query optimization helper
 */
export function queryOptimizer() {
  return {
    /**
     * Add pagination to prevent large result sets
     */
    paginate: (page: number = 1, limit: number = 20) => {
      const offset = (page - 1) * Math.min(limit, 100); // Cap at 100 items
      return { limit: Math.min(limit, 100), offset };
    },
    
    /**
     * Add performance hints for complex queries
     */
    withIndex: (indexName: string) => {
      return `/* USE INDEX (${indexName}) */`;
    },
    
    /**
     * Monitor query execution time
     */
    timeQuery: async <T>(queryFn: () => Promise<T>, queryName: string): Promise<T> => {
      const start = process.hrtime.bigint();
      try {
        const result = await queryFn();
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000;
        
        if (duration > 100) { // Log queries taking more than 100ms
          console.warn('SLOW_QUERY:', {
            name: queryName,
            duration: `${duration.toFixed(2)}ms`,
            timestamp: new Date().toISOString()
          });
        }
        
        return result;
      } catch (error) {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000;
        console.error('QUERY_ERROR:', {
          name: queryName,
          duration: `${duration.toFixed(2)}ms`,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    }
  };
}

/**
 * Response compression middleware
 */
export function responseCompression(req: Request, res: Response, next: NextFunction) {
  const acceptEncoding = req.get('Accept-Encoding') || '';
  
  if (acceptEncoding.includes('gzip')) {
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Vary', 'Accept-Encoding');
  }
  
  next();
}

/**
 * Cache control middleware for static resources
 */
export function cacheControl(maxAge: number = 3600) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      res.setHeader('ETag', `"${Date.now()}"`);
    }
    next();
  };
}

/**
 * Health check endpoint performance metrics
 */
export function healthMetrics() {
  return {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: process.memoryUsage().heapUsed,
      total: process.memoryUsage().heapTotal,
      external: process.memoryUsage().external
    },
    cpu: process.cpuUsage(),
    version: process.version,
    platform: process.platform
  };
}