/**
 * Advanced Performance Monitoring System - Phase 3 Optimization
 * Real-time tracking and alerting for production-grade performance
 */

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  memoryUsage: number;
  dbQueries: number;
  timestamp: Date;
  userAgent?: string;
  userId?: number;
}

interface PerformanceAlert {
  type: 'SLOW_ENDPOINT' | 'HIGH_ERROR_RATE' | 'MEMORY_LEAK' | 'DB_BOTTLENECK';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  metrics: any;
  timestamp: Date;
}

class AdvancedPerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private readonly MAX_METRICS = 10000;
  private readonly ALERT_THRESHOLDS = {
    SLOW_ENDPOINT: 1000, // ms
    HIGH_ERROR_RATE: 0.05, // 5%
    MEMORY_USAGE: 500, // MB
    DB_QUERY_TIME: 500 // ms
  };

  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    this.analyzePerformance(metric);
  }

  private analyzePerformance(metric: PerformanceMetrics): void {
    // Check for slow endpoints
    if (metric.responseTime > this.ALERT_THRESHOLDS.SLOW_ENDPOINT) {
      this.createAlert('SLOW_ENDPOINT', 'HIGH', {
        endpoint: metric.endpoint,
        responseTime: metric.responseTime,
        threshold: this.ALERT_THRESHOLDS.SLOW_ENDPOINT
      });
    }

    // Check for memory issues
    if (metric.memoryUsage > this.ALERT_THRESHOLDS.MEMORY_USAGE) {
      this.createAlert('MEMORY_LEAK', 'MEDIUM', {
        endpoint: metric.endpoint,
        memoryUsage: metric.memoryUsage,
        threshold: this.ALERT_THRESHOLDS.MEMORY_USAGE
      });
    }

    // Analyze endpoint patterns
    this.analyzeEndpointTrends(metric.endpoint);
  }

  private analyzeEndpointTrends(endpoint: string): void {
    const recentMetrics = this.metrics
      .filter(m => m.endpoint === endpoint)
      .slice(-100); // Last 100 requests

    if (recentMetrics.length < 10) return;

    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
    const errorRate = recentMetrics.filter(m => m.statusCode >= 400).length / recentMetrics.length;

    if (avgResponseTime > this.ALERT_THRESHOLDS.SLOW_ENDPOINT) {
      this.createAlert('SLOW_ENDPOINT', 'MEDIUM', {
        endpoint,
        avgResponseTime,
        sampleSize: recentMetrics.length
      });
    }

    if (errorRate > this.ALERT_THRESHOLDS.HIGH_ERROR_RATE) {
      this.createAlert('HIGH_ERROR_RATE', 'HIGH', {
        endpoint,
        errorRate,
        sampleSize: recentMetrics.length
      });
    }
  }

  private createAlert(type: PerformanceAlert['type'], severity: PerformanceAlert['severity'], metrics: any): void {
    const alert: PerformanceAlert = {
      type,
      severity,
      message: this.generateAlertMessage(type, metrics),
      metrics,
      timestamp: new Date()
    };

    this.alerts.push(alert);
    console.warn(`PERFORMANCE_ALERT: ${alert.message}`, metrics);

    // Keep only recent alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }
  }

  private generateAlertMessage(type: PerformanceAlert['type'], metrics: any): string {
    switch (type) {
      case 'SLOW_ENDPOINT':
        return `Slow endpoint detected: ${metrics.endpoint} (${metrics.responseTime || metrics.avgResponseTime}ms)`;
      case 'HIGH_ERROR_RATE':
        return `High error rate on ${metrics.endpoint}: ${(metrics.errorRate * 100).toFixed(1)}%`;
      case 'MEMORY_LEAK':
        return `High memory usage on ${metrics.endpoint}: ${metrics.memoryUsage}MB`;
      case 'DB_BOTTLENECK':
        return `Database bottleneck detected: ${metrics.queryTime}ms`;
      default:
        return `Performance issue detected`;
    }
  }

  getPerformanceReport(): {
    overview: {
      totalRequests: number;
      avgResponseTime: number;
      errorRate: number;
      topSlowEndpoints: Array<{ endpoint: string; avgTime: number; requests: number }>;
    };
    alerts: PerformanceAlert[];
    memoryTrends: Array<{ timestamp: Date; usage: number }>;
  } {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > last24h);

    const endpointStats = new Map<string, { times: number[]; errors: number }>();
    
    recentMetrics.forEach(metric => {
      if (!endpointStats.has(metric.endpoint)) {
        endpointStats.set(metric.endpoint, { times: [], errors: 0 });
      }
      const stats = endpointStats.get(metric.endpoint)!;
      stats.times.push(metric.responseTime);
      if (metric.statusCode >= 400) stats.errors++;
    });

    const topSlowEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        avgTime: stats.times.reduce((a, b) => a + b, 0) / stats.times.length,
        requests: stats.times.length
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    const totalErrors = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = recentMetrics.length > 0 ? totalErrors / recentMetrics.length : 0;
    const avgResponseTime = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length 
      : 0;

    return {
      overview: {
        totalRequests: recentMetrics.length,
        avgResponseTime,
        errorRate,
        topSlowEndpoints
      },
      alerts: this.alerts.slice(-50), // Last 50 alerts
      memoryTrends: recentMetrics
        .filter((_, i) => i % 10 === 0) // Sample every 10th metric
        .map(m => ({ timestamp: m.timestamp, usage: m.memoryUsage }))
        .slice(-100) // Last 100 samples
    };
  }

  clearOldData(): void {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
  }

  exportMetrics(): string {
    const report = this.getPerformanceReport();
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      ...report,
      rawMetrics: this.metrics.slice(-1000) // Last 1000 metrics
    }, null, 2);
  }
}

export const performanceMonitor = new AdvancedPerformanceMonitor();

// Middleware for automatic performance tracking
export function createPerformanceMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB

    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const endMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      const memoryDelta = endMemory - startMemory;

      performanceMonitor.recordMetric({
        endpoint: req.path,
        method: req.method,
        responseTime,
        statusCode: res.statusCode,
        memoryUsage: endMemory,
        dbQueries: res.locals?.dbQueries || 0,
        timestamp: new Date(),
        userAgent: req.get('User-Agent'),
        userId: req.user?.id
      });
    });

    next();
  };
}

// Clean up old data every hour
setInterval(() => {
  performanceMonitor.clearOldData();
}, 60 * 60 * 1000);