import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';
import { SecurityUtils } from '@/utils/securityUtils';
import { TokenManager } from '@/utils/tokenManager';
import { SessionSecurity } from '@/utils/sessionSecurity';
import { CSRFTokenManager } from '@/utils/csrfTokenManager';
import { ErrorLogger } from '@/utils/errorLogger';
import { PerformanceMonitor } from '@/utils/performanceMonitor';
import { ApiResponse, ApiErrorResponse, PerformanceMetrics } from '@/types/api';

interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

interface ExtendedRequestConfig extends Omit<AxiosRequestConfig, 'method' | 'url'> {
  cancelKey?: string;
}

type RequestConfig = ExtendedRequestConfig;

export class ApiClient {
  private client: AxiosInstance;
  private securityUtils: SecurityUtils;
  private tokenManager: TokenManager;
  private sessionSecurity: SessionSecurity;
  // Rate limiter is initialized but not currently used - keeping for future rate limiting
  private csrfManager: CSRFTokenManager;
  private errorLogger: ErrorLogger;
  private performanceMonitor: PerformanceMonitor;
  private securityAuditInterval: ReturnType<typeof setInterval> | null = null;
  private cancelSources: Map<string, AbortController> = new Map();

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

    this.securityUtils = SecurityUtils.getInstance();
    this.tokenManager = TokenManager.getInstance();
    this.sessionSecurity = SessionSecurity.getInstance();
    this.csrfManager = CSRFTokenManager.getInstance();
    this.errorLogger = ErrorLogger.getInstance();
    this.performanceMonitor = PerformanceMonitor.getInstance();

    this.setupInterceptors();
    this.setupSecurityAudit();

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
          // Start performance monitoring
          const metrics = this.performanceMonitor.startRequest(config);
          (config as InternalAxiosRequestConfig & { metrics?: PerformanceMetrics }).metrics = metrics;

          // Add security headers
          const securityHeaders = this.securityUtils.getSecurityHeaders();
          Object.entries(securityHeaders).forEach(([key, value]) => {
            if (value !== undefined) {
              config.headers[key] = value;
            }
          });

          // Add CSRF token
          const csrfHeader = this.csrfManager.getCSRFHeader();
          if (csrfHeader?.['X-CSRF-Token']) {
            config.headers['X-CSRF-Token'] = csrfHeader['X-CSRF-Token'];
          }

          // Add Authorization token
          const token = await this.tokenManager.getAccessToken();
          if (token) {
            config.headers.set('Authorization', `Bearer ${token}`);
          }

          // Request data validation can be added here if needed
          // Example: this.validateRequestData(config.data);

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
          // End performance monitoring
          if (response.config?.metrics) {
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
          // End performance monitoring on error
          if (error.config?.metrics) {
            this.performanceMonitor.endWithError(error.config.metrics, error);
          }

          // Handle token errors
          if (error.response?.status === 401) {
            await this.handleTokenError(error);
          }

          // Handle session errors
          if (error.response?.status === 403) {
            await this.handleSessionError(error);
          }

          // Audit security context
          const securityContext = this.securityUtils.getSecurityContext();
          if (securityContext) {
            this.securityUtils.reportSecurityContext(securityContext);
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

  private async handleTokenError(_error: AxiosError<ApiResponse>): Promise<void> {
    try {
      this.tokenManager.destroyTokens();
    } catch (err) {
      this.errorLogger.logError(err as Error, {
        type: 'TokenError',
        context: {
          token: this.tokenManager.getAccessToken(),
          session: this.sessionSecurity.getSessionId()
        }
      });
      this.sessionSecurity.destroySession();
      this.csrfManager.clearToken();
    }
  }

  private async handleSessionError(error: AxiosError<ApiResponse>): Promise<void> {
    try {
      await this.sessionSecurity.handleSessionError(error);
    } catch (error) {
      this.errorLogger.logError(error as Error, {
        type: 'SessionError',
        context: {
          session: this.sessionSecurity.getSessionId()
        }
      });
      this.sessionSecurity.destroySession();
    }
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

  private setupSecurityAudit(): void {
    // Run security audit every 5 minutes
    this.securityAuditInterval = setInterval(() => {
      this.performSecurityAudit();
    }, 5 * 60 * 1000);
  }

  private async performSecurityAudit(): Promise<void> {
    try {
      const auditResult = await this.securityUtils.performSecurityAudit();
      if (!auditResult.success) {
        this.errorLogger.logError(new Error('Security audit failed'), {
          type: 'SecurityAudit',
          details: auditResult.details
        });
      }
    } catch (err) {
      // Log the error but don't throw to prevent unhandled promise rejections
      this.errorLogger.logError(err as Error, {
        type: 'SecurityAuditError'
      });
    }
  }

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

// Create and export a singleton instance
const apiClientInstance = new ApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000
});

// Export the instance as default and named export
export { apiClientInstance as apiClient, apiClientInstance as default };
