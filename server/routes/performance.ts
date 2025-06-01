import { Router, Request, Response } from 'express';
import { getPerformanceMetrics, resetPerformanceMetrics } from '../middleware/performance';
import { performanceOptimizer } from '../services/performanceOptimizer';
import { unifiedAuthMiddleware } from '../middleware/unifiedAuth';

const router = Router();

/**
 * Performance monitoring endpoints for acquisition readiness
 * Provides real-time metrics for potential buyers to assess system health
 */

// Get comprehensive performance metrics
router.get('/metrics', unifiedAuthMiddleware, (req: Request, res: Response) => {
  try {
    const performanceData = getPerformanceMetrics();
    const cacheStats = performanceOptimizer.getCacheStats();
    const memoryUsage = process.memoryUsage();
    
    const metrics = {
      server: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV
      },
      performance: performanceData,
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024)
      },
      cache: cacheStats,
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Performance metrics error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve performance metrics' 
    });
  }
});

// Performance health check for monitoring systems
router.get('/health', (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  const uptime = process.uptime();
  
  const health = {
    status: 'healthy',
    uptime: Math.round(uptime),
    memory: {
      used: Math.round(heapUsedMB),
      status: heapUsedMB > 500 ? 'warning' : 'ok'
    },
    timestamp: new Date().toISOString()
  };
  
  const statusCode = heapUsedMB > 1000 ? 503 : 200;
  res.status(statusCode).json(health);
});

// Clear performance cache (admin only)
router.post('/cache/clear', unifiedAuthMiddleware, (req: Request, res: Response) => {
  try {
    // Only allow admin users to clear cache
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin privileges required' 
      });
    }
    
    performanceOptimizer.clearCache();
    resetPerformanceMetrics();
    
    res.json({
      success: true,
      message: 'Performance cache and metrics cleared'
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({ 
      error: 'Failed to clear cache' 
    });
  }
});

// Force garbage collection (development only)
router.post('/gc', unifiedAuthMiddleware, (req: Request, res: Response) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ 
      error: 'Only available in development mode' 
    });
  }
  
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin privileges required' 
    });
  }
  
  try {
    const beforeMemory = process.memoryUsage();
    
    if (global.gc) {
      global.gc();
      const afterMemory = process.memoryUsage();
      
      res.json({
        success: true,
        message: 'Garbage collection triggered',
        memoryBefore: Math.round(beforeMemory.heapUsed / 1024 / 1024),
        memoryAfter: Math.round(afterMemory.heapUsed / 1024 / 1024),
        freed: Math.round((beforeMemory.heapUsed - afterMemory.heapUsed) / 1024 / 1024)
      });
    } else {
      res.json({
        success: false,
        message: 'Garbage collection not available (run with --expose-gc)'
      });
    }
  } catch (error) {
    console.error('GC error:', error);
    res.status(500).json({ 
      error: 'Failed to trigger garbage collection' 
    });
  }
});

// Get slow endpoints report
router.get('/slow-endpoints', unifiedAuthMiddleware, (req: Request, res: Response) => {
  try {
    const metrics = getPerformanceMetrics();
    const slowEndpoints = metrics.slowEndpoints || [];
    
    res.json({
      success: true,
      data: {
        totalSlowEndpoints: slowEndpoints.length,
        endpoints: slowEndpoints.slice(0, 20), // Top 20 slowest
        summary: {
          averageResponseTime: slowEndpoints.reduce((sum, ep) => sum + ep.avgResponseTime, 0) / slowEndpoints.length || 0,
          totalRequests: slowEndpoints.reduce((sum, ep) => sum + ep.totalRequests, 0)
        }
      }
    });
  } catch (error) {
    console.error('Slow endpoints error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve slow endpoints' 
    });
  }
});

export default router;