import type { Request, Response, NextFunction } from 'express';
import { endpointMonitor } from './api-security.ts';
import { trackEndpointHealth } from '../routes/health.ts';
import { trackRequest } from '../routes/system-metrics.ts';
interface UnifiedMetrics {
    startTime: bigint;
    dbQueries: number;
    dbTotalTime: number;
    slowQueries: any[];
    memoryBefore: number;
}
declare global {
    namespace Express {
        interface Request {
            unifiedMetrics: UnifiedMetrics;
        }
    }
}
/**
 * Unified monitoring middleware that consolidates:
 * - Performance monitoring
 * - Memory monitoring
 * - Database performance tracking
 * - Endpoint statistics
 * - Response coordination
 *
 * This prevents multiple middleware from conflicting over res.end
 */
export function unifiedMonitoringMiddleware(req: Request, res: Response, next: NextFunction) {
    const startTime = process.hrtime.bigint();
    const memoryBefore = process.memoryUsage().heapUsed;
    // Initialize unified metrics
    req.unifiedMetrics = {
        startTime,
        dbQueries: 0,
        dbTotalTime: 0,
        slowQueries: [],
        memoryBefore
    };
    // Database query tracking functions
    req.trackQuery = (duration: number, query?: string) => {
        req.unifiedMetrics.dbQueries++;
        req.unifiedMetrics.dbTotalTime += duration;
        if (duration > 100) { // Slow query threshold: 100ms
            req.unifiedMetrics.slowQueries.push({
                duration,
                query: query?.substring(0, 200) || 'Unknown query'
            });
        }
    };
    // Single response interception point
    const originalEnd = res.end;
    let responseEnded = false;
    res.end = function (chunk?: any, encoding?: any, cb?: any) {
        if (responseEnded) {
            return originalEnd.call(this, chunk, encoding, cb);
        }
        responseEnded = true;
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        const memoryAfter = process.memoryUsage().heapUsed;
        const memoryDelta = memoryAfter - memoryBefore;
        // Set performance headers only if response hasn't been sent
        if (!res.headersSent) {
            res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
            res.setHeader('X-Memory-Delta', `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);
            if (req.unifiedMetrics.dbQueries > 0) {
                res.setHeader('X-DB-Queries', req.unifiedMetrics.dbQueries.toString());
                const avgDbTime = req.unifiedMetrics.dbTotalTime / req.unifiedMetrics.dbQueries;
                res.setHeader('X-DB-Avg-Time', avgDbTime.toFixed(2));
            }
        }
        // Performance logging
        if (duration > 1000) {
            console.warn('SLOW_REQUEST:', {
                method: req.method,
                url: req.url,
                duration: `${duration.toFixed(2)}ms`,
                statusCode: res.statusCode,
                dbQueries: req.unifiedMetrics.dbQueries,
                memoryDelta: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
                timestamp: new Date().toISOString()
            });
        }
        // Database performance logging
        if (req.unifiedMetrics.slowQueries.length > 0) {
            console.warn('SLOW_DB_QUERIES:', {
                endpoint: req.path,
                slowQueries: req.unifiedMetrics.slowQueries,
                totalQueries: req.unifiedMetrics.dbQueries,
                totalDbTime: req.unifiedMetrics.dbTotalTime.toFixed(2)
            });
        }
        // Memory usage warnings (development-aware thresholds)
        const isDevelopment = process.env.NODE_ENV === 'development';
        const isViteAsset = req.path.startsWith('/src/') || req.path.startsWith('/@');
        const memoryThreshold = isDevelopment && isViteAsset ? 300 * 1024 * 1024 : 50 * 1024 * 1024; // 300MB for Vite assets, 50MB otherwise
        if (memoryDelta > memoryThreshold) {
            console.warn('HIGH_MEMORY_USAGE:', {
                endpoint: req.path,
                memoryDelta: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
                threshold: `${(memoryThreshold / 1024 / 1024).toFixed(0)}MB`,
                isViteAsset,
                environment: process.env.NODE_ENV,
                timestamp: new Date().toISOString()
            });
        }
        // Record endpoint statistics
        const isError = res.statusCode >= 400;
        endpointMonitor.recordRequest(req.path, duration, isError);
        // Track API health metrics
        trackEndpointHealth(req.path, duration, res.statusCode, isError ? 'HTTP Error' : undefined);
        // Track system metrics
        trackRequest(duration, isError);
        return originalEnd.call(this, chunk, encoding, cb);
    };
    next();
}
// Helper function to track database queries
declare global {
    namespace Express {
        interface Request {
            trackQuery: (duration: number, query?: string) => void;
        }
    }
}
