import { Router } from 'express';
import { getPoolStats, testConnection } from '../db-connection-optimized';
import { superCache } from '../services/superCache';
import os from 'os';

const router = Router();

/**
 * Free monitoring endpoints - track your app's health without external services
 */

// Basic health check
router.get('/health', async (req, res) => {
  const dbHealthy = await testConnection(1);
  
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbHealthy ? 'connected' : 'disconnected'
  });
});

// Detailed health metrics
router.get('/health/detailed', async (req, res) => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  const loadAverage = os.loadavg();
  
  // Get database stats
  const dbStats = getPoolStats();
  
  // Get cache stats
  const cacheStats = superCache.getStats();
  
  // Calculate memory percentage
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryPercentage = (usedMemory / totalMemory) * 100;
  
  // Check if we're approaching Railway's 512MB limit
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  const memoryWarning = heapUsedMB > 400; // Warn at 400MB
  const memoryCritical = heapUsedMB > 450; // Critical at 450MB
  
  res.json({
    status: memoryCritical ? 'critical' : memoryWarning ? 'warning' : 'healthy',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: process.uptime(),
      formatted: formatUptime(process.uptime())
    },
    memory: {
      process: {
        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${heapUsedMB.toFixed(2)} MB`,
        external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
        warning: memoryWarning,
        critical: memoryCritical
      },
      system: {
        total: `${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
        free: `${(freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
        used: `${(usedMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
        percentage: `${memoryPercentage.toFixed(2)}%`
      }
    },
    cpu: {
      usage: cpuUsage,
      loadAverage: {
        '1min': loadAverage[0].toFixed(2),
        '5min': loadAverage[1].toFixed(2),
        '15min': loadAverage[2].toFixed(2)
      },
      cores: os.cpus().length
    },
    database: {
      ...dbStats,
      healthy: dbStats.errors === 0,
      poolUtilization: `${((dbStats.active / dbStats.config.max) * 100).toFixed(2)}%`
    },
    cache: {
      hitRate: `${(cacheStats.hitRate * 100).toFixed(2)}%`,
      totalSize: `${(cacheStats.totalSize / 1024 / 1024).toFixed(2)} MB`,
      evictions: cacheStats.evictions,
      caches: cacheStats.caches
    }
  });
});

// Performance metrics endpoint
router.get('/metrics', async (req, res) => {
  const metrics = await collectMetrics();
  
  // Return in Prometheus format for easy integration
  res.set('Content-Type', 'text/plain');
  res.send(formatPrometheusMetrics(metrics));
});

// Endpoint response times tracking
const responseTimes: Map<string, number[]> = new Map();

router.get('/metrics/endpoints', (req, res) => {
  const endpointStats: any[] = [];
  
  responseTimes.forEach((times, endpoint) => {
    if (times.length === 0) return;
    
    const sorted = [...times].sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    
    endpointStats.push({
      endpoint,
      count: times.length,
      avg: avg.toFixed(2),
      p50: p50.toFixed(2),
      p95: p95.toFixed(2),
      p99: p99.toFixed(2),
      min: Math.min(...times).toFixed(2),
      max: Math.max(...times).toFixed(2)
    });
  });
  
  // Sort by average response time
  endpointStats.sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg));
  
  res.json({
    slowestEndpoints: endpointStats.slice(0, 10),
    totalEndpoints: endpointStats.length,
    overallStats: calculateOverallStats(endpointStats)
  });
});

// Readiness check (for load balancers)
router.get('/ready', async (req, res) => {
  try {
    // Check critical dependencies
    const dbHealthy = await testConnection(1);
    const cacheStats = superCache.getStats();
    const memoryUsage = process.memoryUsage();
    
    const ready = 
      dbHealthy && 
      cacheStats.hitRate > 0 && // Cache is working
      memoryUsage.heapUsed < 450 * 1024 * 1024; // Under memory limit
    
    res.status(ready ? 200 : 503).json({
      ready,
      checks: {
        database: dbHealthy,
        cache: cacheStats.hitRate > 0,
        memory: memoryUsage.heapUsed < 450 * 1024 * 1024
      }
    });
  } catch (error) {
    res.status(503).json({ ready: false, error: 'Health check failed' });
  }
});

// Liveness check (for container orchestration)
router.get('/live', (req, res) => {
  res.json({ alive: true, pid: process.pid });
});

// Helper functions
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  
  return parts.join(' ');
}

async function collectMetrics() {
  const memoryUsage = process.memoryUsage();
  const dbStats = getPoolStats();
  const cacheStats = superCache.getStats();
  
  return {
    process_heap_used_bytes: memoryUsage.heapUsed,
    process_heap_total_bytes: memoryUsage.heapTotal,
    db_connections_active: dbStats.active,
    db_connections_idle: dbStats.idle,
    db_connections_waiting: dbStats.waiting,
    cache_hit_rate: cacheStats.hitRate,
    cache_evictions_total: cacheStats.evictions,
    cache_size_bytes: cacheStats.totalSize
  };
}

function formatPrometheusMetrics(metrics: any): string {
  const lines: string[] = [];
  
  for (const [key, value] of Object.entries(metrics)) {
    lines.push(`# TYPE ${key} gauge`);
    lines.push(`${key} ${value}`);
  }
  
  return lines.join('\n');
}

function calculateOverallStats(endpointStats: any[]): any {
  if (endpointStats.length === 0) return null;
  
  const allTimes: number[] = [];
  endpointStats.forEach(stat => {
    allTimes.push(parseFloat(stat.avg));
  });
  
  return {
    averageResponseTime: (allTimes.reduce((a, b) => a + b, 0) / allTimes.length).toFixed(2),
    totalRequests: endpointStats.reduce((sum, stat) => sum + stat.count, 0)
  };
}

// Middleware to track response times
export function responseTimeTracking() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const endpoint = `${req.method} ${req.route?.path || req.path}`;
      
      if (!responseTimes.has(endpoint)) {
        responseTimes.set(endpoint, []);
      }
      
      const times = responseTimes.get(endpoint)!;
      times.push(duration);
      
      // Keep only last 1000 measurements per endpoint
      if (times.length > 1000) {
        times.shift();
      }
    });
    
    next();
  };
}

export default router;