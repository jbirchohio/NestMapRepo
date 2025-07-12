import { Request, Response, NextFunction, RequestHandler } from 'express';
import compression from 'compression';
import { performance } from 'perf_hooks';

declare global {
  namespace NodeJS {
    interface Global {
      gc?: () => void;
    }
  }
}

interface EndpointMetrics {
  totalRequests: number;
  totalDuration: number;
  avgResponseTime: number;
  slowRequestCount: number;
}

const endpointMetrics = new Map<string, EndpointMetrics>();
const dbQueryCounts = new Map<string, number>();

interface PerformanceRequest extends Request {
  dbQueryCount?: number;
  startTime?: [number, number];
}

/**
 * Enhanced performance monitoring middleware
 * Tracks response times, memory usage, and database queries
 */
// Performance monitoring middleware
export const performanceMonitor: RequestHandler = (req: PerformanceRequest, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  const startMemory = process.memoryUsage();
  
  // Track database queries for this request
  const dbQueries = 0; // Will be incremented by database middleware
  (req as any).dbQueryCount = dbQueries;
  
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const end = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
    
    // Extract endpoint pattern for better grouping
    const endpoint = req.url?.split('?')[0] || req.url || 'unknown.js';
    const cleanEndpoint = endpoint.replace(/\/\d+/g, '/:id'); // Normalize IDs
    
    // Update endpoint metrics
    const metrics = endpointMetrics.get(cleanEndpoint) || {
      totalRequests: 0,
      totalDuration: 0,
      avgResponseTime: 0,
      slowRequestCount: 0
    };
    
    metrics.totalRequests++;
    metrics.totalDuration += duration;
    metrics.avgResponseTime = metrics.totalDuration / metrics.totalRequests;
    
    if (duration > 1000) {
      metrics.slowRequestCount++;
    }
    
    endpointMetrics.set(cleanEndpoint, metrics);
    
    // Log slow requests with enhanced context
    if (duration > 1000) {
      console.warn('SLOW_REQUEST:', {
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode,
        dbQueries: (req as any).dbQueryCount || 0,
        memoryDelta: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Log high memory usage
    if (Math.abs(memoryDelta) > 50 * 1024 * 1024) { // 50MB threshold
      console.warn('HIGH_MEMORY_USAGE:', {
        endpoint: cleanEndpoint,
        memoryDelta: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Log consistently slow endpoints
    if (metrics.avgResponseTime > 1000 && metrics.totalRequests > 2) {
      console.warn('SLOW_ENDPOINT:', {
        endpoint: cleanEndpoint,
        avgResponseTime: metrics.avgResponseTime
      });
    }
    
    // Performance metrics headers
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
      res.setHeader('X-Memory-Delta', `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);
    }
    
    return originalEnd.call(this, chunk, encoding, cb);
  };
  
  next();
}

/**
 * Enhanced memory usage monitoring with garbage collection optimization
 */
// Memory monitoring middleware
export const memoryMonitor: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const memUsage = process.memoryUsage();
  const memoryThreshold = 400 * 1024 * 1024; // 400MB - lowered threshold
  
  // Force garbage collection on high memory usage in development
  if (memUsage.heapUsed > memoryThreshold && process.env.NODE_ENV === 'development') {
    if (global.gc) {
      global.gc();
      console.log('🧹 Garbage collection triggered due to high memory usage');
    }
  }
  
  // Log memory warnings with more context
  if (memUsage.heapUsed > memoryThreshold) {
    console.warn('HIGH_MEMORY_USAGE:', {
      heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
      external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`,
      rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`,
      endpoint: req.url,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
}

/**
 * Get performance metrics summary for debugging
 */
export function getPerformanceMetrics() {
  const summary = Array.from(endpointMetrics.entries()).map(([endpoint, metrics]) => ({
    endpoint,
    avgResponseTime: Math.round(metrics.avgResponseTime),
    totalRequests: metrics.totalRequests,
    slowRequestCount: metrics.slowRequestCount,
    slowRequestPercentage: Math.round((metrics.slowRequestCount / metrics.totalRequests) * 100)
  })).sort((a, b) => b.avgResponseTime - a.avgResponseTime);
  
  return {
    totalEndpoints: endpointMetrics.size,
    slowEndpoints: summary.filter(s => s.avgResponseTime > 1000),
    allEndpoints: summary
  };
}

/**
 * Reset performance metrics (useful for testing)
 */
export function resetPerformanceMetrics() {
  endpointMetrics.clear();
  dbQueryCounts.clear();
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
// Response compression middleware
export const responseCompression: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const acceptEncoding = req.get('Accept-Encoding') || '.js';
  
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