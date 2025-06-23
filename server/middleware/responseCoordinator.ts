import type { Request, Response, NextFunction } from 'express';

// Extend the existing Express types
declare global {
    namespace Express {
        interface ResponseMetrics {
            startTime?: bigint;  // Made optional to match usage
            endTime?: bigint;
            statusCode?: number;
            duration?: number;
            queryCount?: number;
            cacheStatus?: 'hit' | 'miss' | 'skip';
            dbQueries?: number;
            dbAvgTime?: number;
            slowQueries?: any[];
            endpointStats?: any;
        }
        
        interface Request {
            responseMetrics?: ResponseMetrics;
        }
    }
}
/**
 * Centralized response coordinator to prevent header conflicts
 * This middleware ensures only one res.end override and coordinates all monitoring
 */
export function responseCoordinator(req: Request, res: Response, next: NextFunction) {
    const startTime = process.hrtime.bigint();
    // Initialize metrics on request with proper typing
    const responseMetrics: Express.ResponseMetrics = {
        startTime,
        dbQueries: 0,
        dbAvgTime: 0,
        slowQueries: [],
        endpointStats: undefined
    };
    req.responseMetrics = responseMetrics;
    
    // Single point of response interception
    const originalEnd = res.end;
    let endCalled = false;
    res.end = function (chunk?: any, encoding?: any, cb?: any) {
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
            if (responseMetrics.dbQueries !== undefined) {
                res.setHeader('X-DB-Query-Count', responseMetrics.dbQueries.toString());
                if (responseMetrics.dbAvgTime !== undefined) {
                    res.setHeader('X-DB-Avg-Time', responseMetrics.dbAvgTime.toFixed(2));
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
        if (req.responseMetrics?.slowQueries && req.responseMetrics.slowQueries.length > 0) {
            console.warn('SLOW_DB_QUERIES:', {
                endpoint: req.path,
                slowQueries: req.responseMetrics.slowQueries,
                totalQueries: req.responseMetrics.dbQueries
            });
        }
        // Record endpoint statistics
        if (req.responseMetrics?.endpointStats) {
            const isError = res.statusCode >= 400;
            req.responseMetrics.endpointStats.recordRequest(req.path, duration, isError);
        }
        return originalEnd.call(this, chunk, encoding, cb);
    };
    next();
}
