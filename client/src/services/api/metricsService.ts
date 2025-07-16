import { getApiClient } from './apiClient';

export interface MetricPoint {
  timestamp: string;
  value: number;
  [key: string]: any;
}

export interface TimeRange {
  start: string | Date;
  end: string | Date;
  interval?: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

export interface MetricQuery {
  metric: string;
  timeRange: TimeRange;
  filters?: Record<string, any>;
  groupBy?: string[];
  limit?: number;
}

export interface MetricResponse {
  metric: string;
  data: MetricPoint[];
  metadata?: {
    unit?: string;
    description?: string;
    [key: string]: any;
  };
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    load: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
  uptime: number;
  timestamp: string;
}

export interface ApplicationMetrics {
  requests: {
    total: number;
    byStatus: Record<string, number>;
    byEndpoint: Record<string, number>;
    byMethod: Record<string, number>;
  };
  responseTimes: {
    average: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    max: number;
  };
  activeUsers: number;
  sessions: number;
  errors: number;
  timestamp: string;
}

export interface UserActivity {
  userId: string;
  email: string;
  lastActive: string;
  actions: number;
  endpoints: string[];
  devices: string[];
  locations: string[];
}

export interface DatabaseMetrics {
  connections: number;
  queries: {
    total: number;
    slow: number;
    avgTime: number;
    byType: Record<string, number>;
  };
  collections: Array<{
    name: string;
    count: number;
    size: number;
    avgObjSize: number;
    storageSize: number;
    indexes: number;
  }>;
}

class MetricsService {
  private static instance: MetricsService;
  private basePath = '/metrics';

  private constructor() {}

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  // System Metrics
  public async getSystemMetrics(): Promise<SystemMetrics> {
    return getApiClient().get<SystemMetrics>(`${this.basePath}/system`);
  }

  public async getSystemMetricsHistory(params: TimeRange): Promise<MetricResponse> {
    return getApiClient().get<MetricResponse>(`${this.basePath}/system/history`, { params });
  }

  // Application Metrics
  public async getApplicationMetrics(): Promise<ApplicationMetrics> {
    return getApiClient().get<ApplicationMetrics>(`${this.basePath}/application`);
  }

  public async getApplicationMetricsHistory(params: TimeRange): Promise<MetricResponse> {
    return getApiClient().get<MetricResponse>(`${this.basePath}/application/history`, { params });
  }

  // User Activity
  public async getUserActivity(params: {
    userId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ data: UserActivity[]; total: number }> {
    return getApiClient().get<{ data: UserActivity[]; total: number }>(
      `${this.basePath}/user-activity`,
      { params }
    );
  }

  // Database Metrics
  public async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    return getApiClient().get<DatabaseMetrics>(`${this.basePath}/database`);
  }

  // Custom Metrics
  public async queryMetrics(queries: MetricQuery[]): Promise<MetricResponse[]> {
    return getApiClient().post<MetricResponse[]>(
      `${this.basePath}/query`,
      { queries },
      { params: { queries } as any } // Cast to any to avoid type issues with the request config
    );
  }

  // Error Tracking
  public async getErrorMetrics(params: TimeRange): Promise<{
    errors: Array<{
      id: string;
      message: string;
      count: number;
      firstSeen: string;
      lastSeen: string;
      status: number;
      path: string;
      method: string;
    }>;
    total: number;
  }> {
    return getApiClient().get<{
      errors: Array<{
        id: string;
        message: string;
        count: number;
        firstSeen: string;
        lastSeen: string;
        status: number;
        path: string;
        method: string;
      }>;
      total: number;
    }>(`${this.basePath}/errors`, { params });
  }

  // Performance Metrics
  public async getPerformanceMetrics(params: TimeRange): Promise<{
    pageLoad: {
      average: number;
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
    apiResponse: {
      average: number;
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
    database: {
      queryTime: number;
      connectionTime: number;
    };
  }> {
    return getApiClient().get<{
      pageLoad: {
        average: number;
        p50: number;
        p90: number;
        p95: number;
        p99: number;
      };
      apiResponse: {
        average: number;
        p50: number;
        p90: number;
        p95: number;
        p99: number;
      };
      database: {
        queryTime: number;
        connectionTime: number;
      };
    }>(`${this.basePath}/performance`, { params });
  }

  // Custom Events
  public async trackEvent(
    eventName: string,
    properties: Record<string, any> = {},
    userId?: string
  ): Promise<void> {
    return getApiClient().post<void>(
      `${this.basePath}/events`,
      { eventName, properties, userId }
    );
  }

  // Health Check
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Array<{
      name: string;
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime: number;
      timestamp: string;
    }>;
    timestamp: string;
  }> {
    return getApiClient().get<{
      status: 'healthy' | 'degraded' | 'unhealthy';
      services: Array<{
        name: string;
        status: 'healthy' | 'degraded' | 'unhealthy';
        responseTime: number;
        timestamp: string;
      }>;
      timestamp: string;
    }>('/health');
  }
}

export const metricsService = MetricsService.getInstance();
