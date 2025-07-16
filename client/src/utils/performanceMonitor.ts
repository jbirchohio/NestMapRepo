import { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ErrorLogger } from './errorLogger';
import { getSession } from 'next-auth/react';
import { getApiClient } from '@/services/api/apiClient';

export interface PerformanceMetrics {
  timestamp: string;
  requestTime: number;
  responseTime: number;
  totalDuration: number;
  method: string;
  url: string;
  status: number | null;
  size: number;
  userId: string | null;
  sessionId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  errorType: string | null;
  errorMessage: string | null;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[];
  private maxMetrics: number;
  private logInterval: NodeJS.Timeout | null = null;
  private errorLogger: ErrorLogger;

  private constructor() {
    this.metrics = [];
    this.maxMetrics = 1000;
    this.errorLogger = ErrorLogger.getInstance();
    this.setupMetricsRotation();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private setupMetricsRotation(): void {
    // Rotate metrics every 5 minutes
    this.logInterval = setInterval(() => {
      this.rotateMetrics();
    }, 5 * 60 * 1000);
  }

  private rotateMetrics(): void {
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  public async startRequest(config: AxiosRequestConfig<unknown>): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    const session = await getSession();
    
    const metrics: PerformanceMetrics = {
      timestamp: new Date().toISOString(),
      requestTime: startTime,
      responseTime: 0,
      totalDuration: 0,
      method: config.method?.toUpperCase() || 'GET',
      url: config.url || '',
      status: null,
      size: 0,
      userId: session?.user?.id || null,
      sessionId: session?.user?.accessToken ? 'active' : null,
      ipAddress: null, // No longer tracking IP in client
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
      success: false,
      errorType: null,
      errorMessage: null
    };

    return metrics;
  }

  public endRequest(metrics: PerformanceMetrics, response: AxiosResponse<unknown, unknown>): void {
    try {
      metrics.responseTime = Date.now();
      metrics.totalDuration = metrics.responseTime - metrics.requestTime;
      metrics.status = response.status;
      metrics.size = response.headers['content-length'] ? parseInt(response.headers['content-length']) : 0;
      metrics.success = true;
      this.metrics.push(metrics);
      this.rotateMetrics();
      this.sendMetricsToBackend(metrics);
    } catch (error) {
      const errToLog = error instanceof Error ? error : new Error(String(error));
      this.errorLogger.logError(errToLog, {
        type: 'PerformanceMetricsError',
        context: metrics
      });
    }
  }

  public endWithError(metrics: PerformanceMetrics, error: AxiosError<unknown, unknown>): void {
    try {
      metrics.responseTime = Date.now();
      metrics.totalDuration = metrics.responseTime - metrics.requestTime;
      metrics.status = error.response?.status || null;
      metrics.errorType = error.code || null;
      metrics.errorMessage = error.message;
      metrics.success = false;
      this.metrics.push(metrics);
      this.rotateMetrics();
      this.sendMetricsToBackend(metrics);
    } catch (error) {
      const errToLog = error instanceof Error ? error : new Error(String(error));
      this.errorLogger.logError(errToLog, {
        type: 'PerformanceMetricsError',
        context: metrics
      });
    }
  }

  private async sendMetricsToBackend(metrics: PerformanceMetrics): Promise<void> {
    try {
      // apiClient.post will handle JSON.stringify internally for object payloads
      await getApiClient().post('/metrics', metrics);
    } catch (error: unknown) {
      // Log the error that occurred during sending metrics
      const errToLog = error instanceof Error ? error : new Error(String(error));
      this.errorLogger.logError(errToLog, {
        type: 'SendMetricsBackendError',
        context: { metricsId: metrics.timestamp } // Example context
      });

      // Store failed metrics for retry
      let pendingMetricsList: PerformanceMetrics[] = [];
      const pendingMetricsRaw = localStorage.getItem('pending_metrics');
      if (pendingMetricsRaw) {
        try {
          pendingMetricsList = JSON.parse(pendingMetricsRaw) as PerformanceMetrics[];
        } catch (parseError) {
          const errToLogParse = parseError instanceof Error ? parseError : new Error(String(parseError));
          this.errorLogger.logError(errToLogParse, {
            type: 'PendingMetricsParseError',
            context: { rawValue: pendingMetricsRaw?.substring(0, 100) } // Log a snippet
          });
          pendingMetricsList = []; // Initialize if parsing fails
        }
      }
      pendingMetricsList.push(metrics);
      localStorage.setItem('pending_metrics', JSON.stringify(pendingMetricsList));
    }
  }

  public getRecentMetrics(limit: number = 100): PerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }

  public clearMetrics(): void {
    this.metrics = [];
    localStorage.removeItem('pending_metrics');
  }

  public destroy(): void {
    if (this.logInterval) {
      clearInterval(this.logInterval);
      this.logInterval = null;
    }
  }

  public retryFailedMetrics(): void {
    try {
      const pendingMetricsRaw = localStorage.getItem('pending_metrics');
      if (pendingMetricsRaw) {
        let metricsToRetry: PerformanceMetrics[] = [];
        try {
          metricsToRetry = JSON.parse(pendingMetricsRaw) as PerformanceMetrics[];
        } catch (parseError) {
          const errToLogParse = parseError instanceof Error ? parseError : new Error(String(parseError));
          this.errorLogger.logError(errToLogParse, {
            type: 'PendingMetricsParseErrorOnRetry',
            context: { rawValue: pendingMetricsRaw?.substring(0, 100) } // Log a snippet
          });
          localStorage.removeItem('pending_metrics'); // Clear corrupted cookie
          return;
        }

        if (metricsToRetry.length > 0) {
          // Assuming sendMetricsToBackend handles its own errors and retries by adding to cookie.
          // We'll clear the cookie here and let sendMetricsToBackend repopulate if individual sends fail.
          localStorage.removeItem('pending_metrics'); 
          for (const metric of metricsToRetry) {
            // Not awaiting, as sendMetricsToBackend will handle its own persistence logic.
            this.sendMetricsToBackend(metric);
          }
        }
      }
    } catch (error: unknown) {
      const errToLog = error instanceof Error ? error : new Error(String(error));
      this.errorLogger.logError(errToLog, {
        type: 'MetricsRetryError',
        context: {
          hasPendingMetrics: !!localStorage.getItem('pending_metrics')
        }
      });
    }
  }

  public getPerformanceStats(): {
    averageResponseTime: number;
    requestsPerMinute: number;
    successRate: number;
    errorRate: number;
    totalRequests: number;
  } {
    const now = Date.now();
    const lastMinute = now - 60000;
    const recentMetrics = this.metrics.filter(m => m.timestamp > new Date(lastMinute).toISOString());
    
    const totalRequests = recentMetrics.length;
    const successfulRequests = recentMetrics.filter(m => m.success).length;
    const totalDuration = recentMetrics.reduce((sum, m) => sum + m.totalDuration, 0);

    return {
      averageResponseTime: totalRequests > 0 ? totalDuration / totalRequests : 0,
      requestsPerMinute: totalRequests,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      errorRate: totalRequests > 0 ? ((totalRequests - successfulRequests) / totalRequests) * 100 : 0,
      totalRequests
    };
  }
}
