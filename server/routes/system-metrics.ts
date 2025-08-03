import type { Express } from "express";
import { requireSuperadminRole } from "../middleware/auth";
import { checkSystemHealthAndGenerateAlerts } from "./alerts";
import os from "os";
import process from "process";

interface SystemMetrics {
  server: {
    uptime: number;
    nodeVersion: string;
    platform: string;
    architecture: string;
    pid: number;
  };
  memory: {
    totalSystemMemory: number;
    freeSystemMemory: number;
    usedSystemMemory: number;
    nodeMemoryUsage: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
    memoryUtilization: number;
  };
  cpu: {
    loadAverage: number[];
    cpuCount: number;
    cpuUsage: number;
  };
  disk: {
    totalSpace: number;
    freeSpace: number;
    usedSpace: number;
    diskUtilization: number;
  };
  network: {
    activeConnections: number;
    requestsPerSecond: number;
    bandwidth: {
      incoming: number;
      outgoing: number;
    };
  };
  performance: {
    responseTimeP50: number;
    responseTimeP95: number;
    responseTimeP99: number;
    errorRate: number;
    throughput: number;
  };
  alerts: {
    critical: number;
    warning: number;
    info: number;
  };
  timestamp: string;
}

// Global metrics tracking
let requestCount = 0;
let totalResponseTime = 0;
let errorCount = 0;
let responseTimes: number[] = [];
let lastMetricsReset = Date.now();

// Track incoming requests for metrics
export function trackRequest(responseTime: number, isError: boolean) {
  requestCount++;
  totalResponseTime += responseTime;
  responseTimes.push(responseTime);
  
  if (isError) {
    errorCount++;
  }
  
  // Keep only last 1000 response times for percentile calculation
  if (responseTimes.length > 1000) {
    responseTimes = responseTimes.slice(-1000);
  }
}

function calculatePercentile(arr: number[], percentile: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index] || 0;
}

async function getDiskUsage(): Promise<{ total: number; free: number; used: number }> {
  try {
    // Use Node.js fs module to get actual disk usage
    const { statfs } = await import('fs/promises');
    const path = process.platform === 'win32' ? 'C:\\' : '/';
    
    try {
      const stats = await statfs(path);
      const total = stats.blocks * stats.bsize;
      const free = stats.bfree * stats.bsize;
      const used = total - free;
      
      return { total, free, used };
    } catch {
      // Fallback for environments where statfs isn't available
      // Return conservative estimates based on process memory
      const memUsage = process.memoryUsage();
      const estimatedTotal = 100 * 1024 * 1024 * 1024; // 100GB estimate
      const estimatedUsed = memUsage.rss * 100; // Rough estimate
      const estimatedFree = estimatedTotal - estimatedUsed;
      
      return { 
        total: estimatedTotal, 
        free: Math.max(0, estimatedFree), 
        used: estimatedUsed 
      };
    }
  } catch (error) {
    console.error('Error getting disk usage:', error);
    return { total: 0, free: 0, used: 0 };
  }
}

// Track active connections
let activeConnectionCount = 0;

export function incrementActiveConnections(): void {
  activeConnectionCount++;
}

export function decrementActiveConnections(): void {
  activeConnectionCount = Math.max(0, activeConnectionCount - 1);
}

function getActiveConnections(): number {
  // Return actual tracked connections, with a minimum of 1 (the current request)
  return Math.max(1, activeConnectionCount);
}

function getCpuUsage(): Promise<number> {
  return new Promise((resolve) => {
    const startUsage = process.cpuUsage();
    const startTime = process.hrtime();
    
    setTimeout(() => {
      const currentUsage = process.cpuUsage(startUsage);
      const currentTime = process.hrtime(startTime);
      
      const elapTime = currentTime[0] * 1000000 + currentTime[1] / 1000; // microseconds
      const elapUsage = currentUsage.user + currentUsage.system;
      const cpuPercent = (100 * elapUsage / elapTime);
      
      resolve(Math.min(100, Math.max(0, cpuPercent)));
    }, 100);
  });
}

function generateAlerts(metrics: Partial<SystemMetrics>): { critical: number; warning: number; info: number } {
  let critical = 0;
  let warning = 0;
  let info = 0;
  
  // Memory alerts
  if (metrics.memory && metrics.memory.memoryUtilization > 90) {
    critical++;
  } else if (metrics.memory && metrics.memory.memoryUtilization > 75) {
    warning++;
  }
  
  // CPU alerts
  if (metrics.cpu && metrics.cpu.cpuUsage > 85) {
    critical++;
  } else if (metrics.cpu && metrics.cpu.cpuUsage > 70) {
    warning++;
  }
  
  // Disk alerts
  if (metrics.disk && metrics.disk.diskUtilization > 95) {
    critical++;
  } else if (metrics.disk && metrics.disk.diskUtilization > 85) {
    warning++;
  }
  
  // Performance alerts
  if (metrics.performance && metrics.performance.errorRate > 5) {
    critical++;
  } else if (metrics.performance && metrics.performance.errorRate > 1) {
    warning++;
  }
  
  if (metrics.performance && metrics.performance.responseTimeP95 > 2000) {
    warning++;
  }
  
  return { critical, warning, info };
}

export function registerSystemMetricsRoutes(app: Express): void {
  // Get comprehensive system metrics
  app.get("/api/system/metrics", requireSuperadminRole, async (req, res) => {
    try {
      const memoryUsage = process.memoryUsage();
      const totalSystemMemory = os.totalmem();
      const freeSystemMemory = os.freemem();
      const usedSystemMemory = totalSystemMemory - freeSystemMemory;
      
      const diskUsage = await getDiskUsage();
      const cpuUsage = await getCpuUsage();
      
      const currentTime = Date.now();
      const timeSinceReset = (currentTime - lastMetricsReset) / 1000; // seconds
      const requestsPerSecond = timeSinceReset > 0 ? requestCount / timeSinceReset : 0;
      const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
      const averageResponseTime = requestCount > 0 ? totalResponseTime / requestCount : 0;
      
      const metrics: SystemMetrics = {
        server: {
          uptime: process.uptime(),
          nodeVersion: process.version,
          platform: os.platform(),
          architecture: os.arch(),
          pid: process.pid
        },
        memory: {
          totalSystemMemory,
          freeSystemMemory,
          usedSystemMemory,
          nodeMemoryUsage: {
            rss: memoryUsage.rss,
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            external: memoryUsage.external
          },
          memoryUtilization: (usedSystemMemory / totalSystemMemory) * 100
        },
        cpu: {
          loadAverage: os.loadavg(),
          cpuCount: os.cpus().length,
          cpuUsage
        },
        disk: {
          totalSpace: diskUsage.total,
          freeSpace: diskUsage.free,
          usedSpace: diskUsage.used,
          diskUtilization: diskUsage.total > 0 ? (diskUsage.used / diskUsage.total) * 100 : 0
        },
        network: {
          activeConnections: getActiveConnections(),
          requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
          bandwidth: {
            incoming: requestCount * averageResponseTime * 0.001, // Estimate based on request volume
            outgoing: requestCount * averageResponseTime * 0.0008  // Slightly less for outgoing
          }
        },
        performance: {
          responseTimeP50: calculatePercentile(responseTimes, 50),
          responseTimeP95: calculatePercentile(responseTimes, 95),
          responseTimeP99: calculatePercentile(responseTimes, 99),
          errorRate: Math.round(errorRate * 100) / 100,
          throughput: Math.round(requestsPerSecond * 100) / 100
        },
        alerts: { critical: 0, warning: 0, info: 0 },
        timestamp: new Date().toISOString()
      };
      
      // Generate alerts based on current metrics
      metrics.alerts = generateAlerts(metrics);
      
      // Auto-generate system alerts based on metrics
      checkSystemHealthAndGenerateAlerts({
        memory: { utilization: metrics.memory.memoryUtilization },
        cpu: { usage: metrics.cpu.cpuUsage },
        disk: { utilization: metrics.disk.diskUtilization },
        performance: { 
          errorRate: metrics.performance.errorRate,
          responseTimeP95: metrics.performance.responseTimeP95
        },
        network: { activeConnections: metrics.network.activeConnections }
      });
      
      res.json(metrics);
    } catch (error) {
      console.error('Error getting system metrics:', error);
      res.status(500).json({ error: 'Failed to retrieve system metrics' });
    }
  });
  
  // Reset metrics counters
  app.post("/api/system/metrics/reset", requireSuperadminRole, (req, res) => {
    requestCount = 0;
    totalResponseTime = 0;
    errorCount = 0;
    responseTimes = [];
    lastMetricsReset = Date.now();
    
    res.json({ message: 'Metrics reset successfully', timestamp: new Date().toISOString() });
  });
  
  // Get system health summary
  app.get("/api/system/health-summary", requireSuperadminRole, async (req, res) => {
    try {
      const memoryUsage = process.memoryUsage();
      const totalSystemMemory = os.totalmem();
      const freeSystemMemory = os.freemem();
      const usedSystemMemory = totalSystemMemory - freeSystemMemory;
      const memoryUtilization = (usedSystemMemory / totalSystemMemory) * 100;
      
      const diskUsage = await getDiskUsage();
      const diskUtilization = diskUsage.total > 0 ? (diskUsage.used / diskUsage.total) * 100 : 0;
      const cpuUsage = await getCpuUsage();
      
      const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
      const averageResponseTime = requestCount > 0 ? totalResponseTime / requestCount : 0;
      
      let status = 'healthy';
      if (memoryUtilization > 90 || diskUtilization > 95 || cpuUsage > 85 || errorRate > 5) {
        status = 'critical';
      } else if (memoryUtilization > 75 || diskUtilization > 85 || cpuUsage > 70 || errorRate > 1 || averageResponseTime > 1000) {
        status = 'warning';
      }
      
      res.json({
        status,
        uptime: process.uptime(),
        memory: {
          utilization: Math.round(memoryUtilization * 100) / 100,
          used: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100, // MB
          total: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100 // MB
        },
        cpu: {
          usage: Math.round(cpuUsage * 100) / 100,
          loadAverage: os.loadavg()[0]
        },
        disk: {
          utilization: Math.round(diskUtilization * 100) / 100
        },
        performance: {
          errorRate: Math.round(errorRate * 100) / 100,
          averageResponseTime: Math.round(averageResponseTime * 100) / 100,
          requestsProcessed: requestCount
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting health summary:', error);
      res.status(500).json({ error: 'Failed to retrieve health summary' });
    }
  });
}