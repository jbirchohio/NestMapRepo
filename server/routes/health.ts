import { Router, Request, Response } from 'express';
import { db } from '../db-connection';
import { sql } from 'drizzle-orm';
import os from 'os';

const router = Router();

// Store API health metrics in memory
interface EndpointHealth {
  endpoint: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  avgResponseTime: number;
  errorRate: number;
  lastError?: string;
  requestCount: number;
  errorCount: number;
  lastChecked: Date;
}

const healthMetrics = new Map<string, EndpointHealth>();

// Track endpoint performance
export function trackEndpointHealth(endpoint: string, duration: number, statusCode: number, error?: string) {
  const existing = healthMetrics.get(endpoint) || {
    endpoint,
    status: 'healthy',
    avgResponseTime: 0,
    errorRate: 0,
    requestCount: 0,
    errorCount: 0,
    lastChecked: new Date()
  };

  existing.requestCount++;
  existing.avgResponseTime = ((existing.avgResponseTime * (existing.requestCount - 1)) + duration) / existing.requestCount;

  if (statusCode >= 400 || error) {
    existing.errorCount++;
    existing.lastError = error || `HTTP ${statusCode}`;
  }

  existing.errorRate = (existing.errorCount / existing.requestCount) * 100;
  existing.lastChecked = new Date();

  // Determine health status
  if (existing.errorRate > 10 || existing.avgResponseTime > 5000) {
    existing.status = 'unhealthy';
  } else if (existing.errorRate > 5 || existing.avgResponseTime > 2000) {
    existing.status = 'degraded';
  } else {
    existing.status = 'healthy';
  }

  healthMetrics.set(endpoint, existing);
}

/**
 * GET /api/health/live - Liveness probe (for k8s/monitoring)
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

/**
 * GET /api/health/ready - Readiness probe with database check
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check database connectivity
    await db.execute(sql`SELECT 1`);
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready', 
      reason: 'Database unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/health - Get comprehensive health status
router.get('/', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Filter recent metrics
    const recentMetrics = Array.from(healthMetrics.values())
      .filter(metric => metric.lastChecked > fiveMinutesAgo)
      .slice(0, 10); // Top 10 most recent endpoints

    const totalEndpoints = recentMetrics.length;
    const healthyEndpoints = recentMetrics.filter(m => m.status === 'healthy').length;
    const degradedEndpoints = recentMetrics.filter(m => m.status === 'degraded').length;
    const unhealthyEndpoints = recentMetrics.filter(m => m.status === 'unhealthy').length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyEndpoints > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedEndpoints > 0) {
      overallStatus = 'degraded';
    }

    const avgResponseTime = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / recentMetrics.length
      : 0;

    const overallErrorRate = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length
      : 0;

    // Check database health
    let dbStatus = 'healthy';
    let dbLatency = 0;
    try {
      const dbStart = Date.now();
      await db.execute(sql`SELECT 1`);
      dbLatency = Date.now() - dbStart;
      if (dbLatency > 1000) dbStatus = 'degraded';
    } catch (error) {
      dbStatus = 'unhealthy';
      overallStatus = 'unhealthy';
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const usedMem = memUsage.heapUsed + memUsage.external;
    const memPercentage = (usedMem / totalMem) * 100;
    
    let memStatus = 'healthy';
    if (memPercentage > 90) {
      memStatus = 'critical';
      overallStatus = 'unhealthy';
    } else if (memPercentage > 70) {
      memStatus = 'warning';
      if (overallStatus === 'healthy') overallStatus = 'degraded';
    }

    const response = {
      status: overallStatus,
      uptime: process.uptime(),
      timestamp: now,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV || 'development',
        memory: {
          status: memStatus,
          used: Math.round(usedMem / 1024 / 1024), // MB
          total: Math.round(totalMem / 1024 / 1024), // MB
          percentage: Math.round(memPercentage)
        }
      },
      database: {
        status: dbStatus,
        latency: dbLatency
      },
      endpoints: {
        total: totalEndpoints,
        healthy: healthyEndpoints,
        degraded: degradedEndpoints,
        unhealthy: unhealthyEndpoints
      },
      performance: {
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(overallErrorRate * 100) / 100
      },
      details: recentMetrics.map(metric => ({
        endpoint: metric.endpoint,
        status: metric.status,
        avgResponseTime: Math.round(metric.avgResponseTime),
        errorRate: Math.round(metric.errorRate * 100) / 100,
        requestCount: metric.requestCount,
        lastError: metric.lastError,
        lastChecked: metric.lastChecked
      }))
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date()
    });
  }
});

export default router;