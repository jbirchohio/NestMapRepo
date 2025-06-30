import { Router } from '../../express-augmentations.js';
import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express-serve-static-core';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
// Type definitions
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';
interface EndpointHealth {
    endpoint: string;
    status: HealthStatus;
    avgResponseTime: number;
    errorRate: number;
    lastError?: string;
    requestCount: number;
    errorCount: number;
    lastChecked: Date;
}
interface HealthResponse {
    status: HealthStatus;
    uptime: number;
    timestamp: string;
    endpoints: {
        total: number;
        healthy: number;
        degraded: number;
        unhealthy: number;
    };
    performance: {
        avgResponseTime: number;
        errorRate: number;
    };
    details?: Array<{
        endpoint: string;
        status: HealthStatus;
        avgResponseTime: number;
        errorRate: number;
        requestCount: number;
        lastError?: string;
        lastChecked: string;
    }>;
}
// Request validation schema
const healthQuerySchema = z.object({
    detailed: z.enum(['true', 'false']).optional().default('false')
});
type HealthQuery = z.infer<typeof healthQuerySchema>;
// In-memory store for health metrics
const healthMetrics = new Map<string, EndpointHealth>();
/**
 * Track endpoint performance metrics
 */
export function trackEndpointHealth(endpoint: string, duration: number, statusCode: number, error?: string): void {
    if (!endpoint || typeof endpoint !== 'string') {
        throw new Error('Endpoint must be a valid string');
    }
    if (typeof duration !== 'number' || duration < 0) {
        throw new Error('Duration must be a non-negative number');
    }
    if (typeof statusCode !== 'number' || statusCode < 100 || statusCode >= 600) {
        throw new Error('Invalid status code');
    }
    const existing = healthMetrics.get(endpoint) || {
        endpoint,
        status: 'healthy' as const,
        avgResponseTime: 0,
        errorRate: 0,
        requestCount: 0,
        errorCount: 0,
        lastChecked: new Date()
    };
    // Create updated metrics object
    const updatedMetrics = { ...existing };
    updatedMetrics.requestCount++;
    updatedMetrics.avgResponseTime =
        ((updatedMetrics.avgResponseTime * (updatedMetrics.requestCount - 1)) + duration) / updatedMetrics.requestCount;
    if (statusCode >= 400 || error) {
        updatedMetrics.errorCount++;
        if (error)
            updatedMetrics.lastError = error;
    }
    updatedMetrics.errorRate = (updatedMetrics.errorCount / updatedMetrics.requestCount) * 100;
    updatedMetrics.lastChecked = new Date();
    // Update health status based on metrics
    if (updatedMetrics.errorRate > 10 || updatedMetrics.avgResponseTime > 5000) {
        updatedMetrics.status = 'unhealthy';
    }
    else if (updatedMetrics.errorRate > 5 || updatedMetrics.avgResponseTime > 2000) {
        updatedMetrics.status = 'degraded';
    }
    else {
        updatedMetrics.status = 'healthy';
    }
    healthMetrics.set(endpoint, updatedMetrics);
}
// Initialize router
const router = Router();
// Rate limiting configuration
const healthCheckLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: JSON.stringify({ error: 'Too many requests, please try again later' })
});
// Apply rate limiting
router.use(healthCheckLimiter);
// Error handling middleware
const handleHealthError = (error: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Health check error:', error);
    res.status(500).json({
        status: 'error',
        message: 'Internal server error during health check',
        timestamp: new Date().toISOString()
    });
};
/**
 * GET /api/health - Get overall API health status
 */
const getHealthHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { detailed } = req.query as {
            detailed?: 'true' | 'false';
        }; // Type assertion for query params
        const shouldIncludeDetails = detailed === 'true';
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        // Filter and process recent metrics
        const recentMetrics = Array.from(healthMetrics.values())
            .filter(metric => metric.lastChecked > fiveMinutesAgo)
            .slice(0, 10); // Limit to 10 most recent endpoints
        const totalEndpoints = recentMetrics.length;
        const healthyEndpoints = recentMetrics.filter(m => m.status === 'healthy').length;
        const degradedEndpoints = recentMetrics.filter(m => m.status === 'degraded').length;
        const unhealthyEndpoints = recentMetrics.filter(m => m.status === 'unhealthy').length;
        // Determine overall status
        let overallStatus: HealthStatus = 'healthy';
        if (unhealthyEndpoints > 0) {
            overallStatus = 'unhealthy';
        }
        else if (degradedEndpoints > 0) {
            overallStatus = 'degraded';
        }
        // Calculate aggregate metrics
        const avgResponseTime = recentMetrics.length > 0
            ? recentMetrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / recentMetrics.length
            : 0;
        const overallErrorRate = recentMetrics.length > 0
            ? recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length
            : 0;
        // Build response
        const response: HealthResponse = {
            status: overallStatus,
            uptime: process.uptime(),
            timestamp: now.toISOString(),
            endpoints: {
                total: totalEndpoints,
                healthy: healthyEndpoints,
                degraded: degradedEndpoints,
                unhealthy: unhealthyEndpoints
            },
            performance: {
                avgResponseTime: Math.round(avgResponseTime * 100) / 100, // Round to 2 decimal places
                errorRate: Math.round(overallErrorRate * 100) / 100
            }
        };
        // Add detailed metrics if requested
        if (shouldIncludeDetails) {
            response.details = recentMetrics.map(metric => ({
                endpoint: metric.endpoint,
                status: metric.status,
                avgResponseTime: Math.round(metric.avgResponseTime * 100) / 100,
                errorRate: Math.round(metric.errorRate * 100) / 100,
                requestCount: metric.requestCount,
                ...(metric.lastError ? { lastError: metric.lastError } : {}),
                lastChecked: metric.lastChecked.toISOString()
            }));
        }
        // Set cache headers
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
        });
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
// Register the route
router.get('/', getHealthHandler);
// Add error handling middleware with proper type
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error('Health check error:', err);
    res.status(500).json({
        status: 'error',
        message: 'Internal server error during health check',
        timestamp: new Date().toISOString()
    });
};
router.use(errorHandler);
// Set cache headers middleware
router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
});
export default router;
