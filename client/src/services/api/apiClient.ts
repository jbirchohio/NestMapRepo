import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';
import { ErrorLogger } from '@/utils/errorLogger';
import { PerformanceMonitor } from '@/utils/performanceMonitor';
import { ApiResponse, ApiErrorResponse, PerformanceMetrics } from '@/types/api';
import { jwtAuth } from '@/lib/jwtAuth';

interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
  navigate?: () => void;
}

interface ExtendedRequestConfig extends Omit<AxiosRequestConfig, 'method' | 'url'> {
  cancelKey?: string;
}

type RequestConfig = ExtendedRequestConfig;

export class ApiClient {
  private client: AxiosInstance;
  private errorLogger: ErrorLogger;
  private performanceMonitor: PerformanceMonitor;
  private securityAuditInterval: ReturnType<typeof setInterval> | null = null;
  private cancelSources: Map<string, AbortController> = new Map();
  public navigate?: () => void;

  constructor(config: ApiClientConfig) {
    const defaultHeaders: RawAxiosRequestHeaders = {
      ...(config.headers || {}),
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: defaultHeaders
    });

    this.navigate = config.navigate;
    this.errorLogger = ErrorLogger.getInstance();
    this.performanceMonitor = PerformanceMonitor.getInstance();

    this.setupInterceptors();

    // Clean up on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.cleanup.bind(this));
    }
  }

  // Typed HTTP methods
  public async get<T = unknown>(
    url: string,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  public async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  public async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  public async delete<T = unknown>(
    url: string,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  public async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  // Core request method with proper typing
  // Request cancellation methods
  public cancelRequest(key: string): void {
    const source = this.cancelSources.get(key);
    if (source) {
      source.abort();
      this.cancelSources.delete(key);
    }
  }

  public isCancel(error: unknown): boolean {
    return axios.isCancel(error);
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    // If we have an extended config with cancelKey, create a cancellation token
    const extendedConfig = config as ExtendedRequestConfig;
    if (extendedConfig.cancelKey) {
      const controller = new AbortController();
      this.cancelSources.set(extendedConfig.cancelKey, controller);
      config.signal = controller.signal;
    }
    
    try {
      const response = await this.client.request<ApiResponse<T>>(config);
      const responseData = response.data;

      if (!responseData.success) {
        const error: ApiErrorResponse = {
          success: false,
          message: responseData.message || 'Request failed',
          errors: responseData.errors,
          status: response.status,
          statusText: response.statusText
        };
        throw error;
      }

      return responseData.data;
    } catch (error) {
      return this.handleRequestError<T>(error as AxiosError<ApiResponse>);
    }
  }

  private setupInterceptors(): void {
    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }

  private setupRequestInterceptor(): void {
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        try {
          // Skip performance monitoring for metrics and error endpoints to prevent recursion
          const skipMonitoring = config.url?.includes('/metrics') || config.url?.includes('/errors');
          
          if (!skipMonitoring) {
            // Start performance monitoring
            const metrics = await this.performanceMonitor.startRequest(config);
            (config as InternalAxiosRequestConfig & { metrics?: PerformanceMetrics }).metrics = metrics;
          }

          // Add basic security headers
          config.headers.set('X-Requested-With', 'XMLHttpRequest');

          // Add Authorization token from JWT auth
          const token = jwtAuth.getToken();
          if (token) {
            config.headers.set('Authorization', `Bearer ${token}`);
          }

          return config;
        } catch (error) {
          this.errorLogger.logError(error as Error, {
            type: 'RequestInterceptorError',
            config
          });
          return Promise.reject(error);
        }
      },
      (error: AxiosError) => {
        this.errorLogger.logError(error, {
          type: 'RequestError',
          config: error.config
        });
        return Promise.reject(error);
      }
    );
  }

  private setupResponseInterceptor(): void {
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        try {
          // End performance monitoring (skip for metrics/error endpoints)
          const skipMonitoring = response.config.url?.includes('/metrics') || response.config.url?.includes('/errors');
          if (!skipMonitoring && response.config?.metrics) {
            this.performanceMonitor.endRequest(response.config.metrics, response);
          }

          // Response validation can be added here if needed
          // Example: this.validateResponse(response.data);

          return response;
        } catch (error) {
          this.errorLogger.logError(error as Error, {
            type: 'ResponseInterceptorError',
            response
          });
          return Promise.reject(error);
        }
      },
      async (error: AxiosError<ApiResponse>) => {
        try {
          // End performance monitoring on error (skip for metrics/error endpoints)
          const skipMonitoring = error.config?.url?.includes('/metrics') || error.config?.url?.includes('/errors');
          if (!skipMonitoring && error.config?.metrics) {
            this.performanceMonitor.endWithError(error.config.metrics, error);
          }

          // Handle authentication errors
          if (error.response?.status === 401) {
            // Redirect to login page if we have navigation function
            if (this.navigate) {
              this.navigate();
            }
          }

          return Promise.reject(error);
        } catch (error) {
          this.errorLogger.logError(error as Error, {
            type: 'ResponseError',
            error
          });
          return Promise.reject(error);
        }
      }
    );
  }

  private async handleRequestError<T>(error: AxiosError<ApiResponse>): Promise<T> {
    if (error.response?.data) {
      const apiError: ApiErrorResponse = {
        success: false,
        message: error.response.data.message || error.message,
        errors: error.response.data.errors || [error.message],
        status: error.response.status,
        statusText: error.response.statusText
      };
      throw apiError;
    }

    throw {
      success: false,
      message: error.message || 'Network Error',
      errors: ['Unable to connect to the server'],
      status: error.status || 0,
      statusText: error.code || 'NETWORK_ERROR'
    } as ApiErrorResponse;
  }

  // Security audit functionality removed as part of NextAuth migration

  /**
   * Clean up resources when the client is no longer needed
   */
  private cleanup(): void {
    if (this.securityAuditInterval) {
      clearInterval(this.securityAuditInterval);
      this.securityAuditInterval = null;
    }
  }
}

// Create and export a function to initialize the API client with required dependencies
export const createApiClient = (navigate?: () => void) => {
  return new ApiClient({
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 30000,
    navigate
  });
};

// For backward compatibility, export a default instance with a warning
let defaultApiClient: ApiClient | null = null;

/**
 * Get or create an API client instance
 * @param navigate Optional navigation function for handling redirects
 * @returns ApiClient instance
 */
export const getApiClient = (navigate?: () => void): ApiClient => {
  // If we don't have a default instance, create one
  if (!defaultApiClient) {
    if (!navigate) {
      console.warn('Creating ApiClient without navigate function. This may cause issues with authentication.');
    }
    
    defaultApiClient = new ApiClient({
      baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
      timeout: 30000,
      navigate: navigate || (() => {
        console.warn('No navigation function provided. Authentication redirects will not work.');
      })
    });
  }
  // If a new navigate function is provided, update the client's navigate function
  else if (navigate && defaultApiClient) {
    // Update the navigate function if needed
    defaultApiClient.navigate = navigate;
  }
  
  return defaultApiClient;
};

// Export a default instance that will be initialized when needed
export default getApiClient;
