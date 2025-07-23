import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';
import { ErrorLogger } from '@/utils/errorLogger';
import { PerformanceMonitor } from '@/utils/performanceMonitor';
import { ApiResponse, ApiErrorResponse, PerformanceMetrics } from '@/types/api';
import { jwtAuth } from '../../lib/jwtAuth';

type NavigateFunction = (to: string, options?: { replace?: boolean }) => void;

interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
  navigate?: NavigateFunction;
}

interface ExtendedRequestConfig extends Omit<AxiosRequestConfig, 'method' | 'url'> {
  cancelKey?: string;
}

type RequestConfig = ExtendedRequestConfig;

// Global instance of the API client
let apiClientInstance: ApiClient | null = null;

export class ApiClient {
  private client!: AxiosInstance;
  private errorLogger!: ErrorLogger;
  private performanceMonitor!: PerformanceMonitor;
  private securityAuditInterval: ReturnType<typeof setInterval> | null = null;
  private cancelSources: Map<string, AbortController> = new Map();
  private navigate?: NavigateFunction;

  constructor(config: ApiClientConfig) {
    // If an instance already exists, update its navigate function if provided
    if (apiClientInstance) {
      if (config.navigate) {
        apiClientInstance.navigate = config.navigate;
      }
      return apiClientInstance;
    }

    const defaultHeaders: RawAxiosRequestHeaders = {
      ...(config.headers || {}),
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
    
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: defaultHeaders,
      withCredentials: true,
      // Ensure credentials are sent with CORS requests
      withXSRFToken: true,
      // Don't modify request headers (important for CORS)
      transformRequest: [(data, headers) => {
        // Don't overwrite headers if they're already set
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
        if (!headers['Accept']) {
          headers['Accept'] = 'application/json';
        }
        return data;
      }]
    });

    this.navigate = config.navigate;
    this.errorLogger = ErrorLogger.getInstance();
    this.performanceMonitor = PerformanceMonitor.getInstance();

    this.setupInterceptors();

    // Set the global instance
    apiClientInstance = this;

    // Clean up on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.cleanup.bind(this));
    }
  }

  // Typed HTTP methods
  public async get<T = unknown>(
    url: string,
    config: RequestConfig = {}
  ): Promise<T> {
    return this.request<T>('GET', url, config);
  }

  public async post<T = unknown>(
    url: string,
    data?: unknown,
    config: RequestConfig = {}
  ): Promise<T> {
    return this.request<T>('POST', url, { ...config, data });
  }

  public async put<T = unknown>(
    url: string,
    data?: unknown,
    config: RequestConfig = {}
  ): Promise<T> {
    return this.request<T>('PUT', url, { ...config, data });
  }

  public async patch<T = unknown>(
    url: string,
    data?: unknown,
    config: RequestConfig = {}
  ): Promise<T> {
    return this.request<T>('PATCH', url, { ...config, data });
  }

  public async delete<T = unknown>(
    url: string,
    config: RequestConfig = {}
  ): Promise<T> {
    return this.request<T>('DELETE', url, config);
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

  private async request<T = unknown>(
    method: string,
    url: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const { cancelKey, ...axiosConfig } = config;
    // Removed unused requestId to fix the lint warning
    
    // Ensure proper headers for JSON
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(axiosConfig.headers
        ? Object.fromEntries(
            Object.entries(axiosConfig.headers).map(([k, v]) => [k, v ?? ''])
          )
        : {})
    };

    // Handle request data
    let requestData = axiosConfig.data;
    if (requestData && typeof requestData === 'object' && !(requestData instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Set up cancellation if a cancelKey is provided
    if (cancelKey) {
      // Cancel any existing request with the same key
      if (this.cancelSources.has(cancelKey)) {
        this.cancelSources.get(cancelKey)?.abort();
      }
      
      // Create a new cancel token for this request
      const controller = new AbortController();
      this.cancelSources.set(cancelKey, controller);
      axiosConfig.signal = controller.signal;
    }
    
    try {
      const response = await this.client.request<T>({
        method,
        url,
        ...axiosConfig,
        data: requestData,
        headers: {
          ...(axiosConfig.headers || {}),
          ...headers
        },
        withCredentials: true
      });

      // Extract the response data and validate the API response structure
      const responseData = response.data as ApiResponse<T>;
      
      // If the response has a success flag, check it
      if (responseData && typeof responseData === 'object' && 'success' in responseData) {
        if (!responseData.success) {
          const error = new Error(responseData.message || 'Request failed');
          (error as any).response = responseData;
          (error as any).status = response.status;
          throw error;
        }
        
        // If the response has a data field, return it directly
        if ('data' in responseData) {
          return responseData.data as T;
        }
      }
      
      // Otherwise, return the response data as is
      return responseData as unknown as T;
    } catch (error) {
      return this.handleRequestError(error as AxiosError<ApiResponse>);
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
            config.headers['Authorization'] = `Bearer ${token}`;
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
      (response: AxiosResponse<unknown>) => {
        try {
          // End performance monitoring (skip for metrics/error endpoints)
          const skipMonitoring = response.config.url?.includes('/metrics') || response.config.url?.includes('/errors');
          if (!skipMonitoring && response.config?.metrics) {
            this.performanceMonitor.endRequest(response.config.metrics, response);
          }

          // Return the response data directly since we're handling the response type in the request method
          return response;
        } catch (error) {
          this.errorLogger.logError(error as Error, {
            type: 'ResponseInterceptorError',
            response: response.data
          });
          return Promise.reject(error);
        }
      },
      async (error: AxiosError) => {
        try {
          // End performance monitoring on error (skip for metrics/error endpoints)
          const skipMonitoring = error.config?.url?.includes('/metrics') || error.config?.url?.includes('/errors');
          if (!skipMonitoring && error.config?.metrics) {
            this.performanceMonitor.endWithError(error.config.metrics, error);
          }

          // Handle network errors
          if (error.code === 'ECONNABORTED') {
            throw new Error('Request timeout. Please check your internet connection and try again.');
          }

          // Handle HTTP errors
          if (error.response) {
            const { status, data } = error.response;
            const responseData = data as ApiResponse;
            const message = responseData?.message || 'An error occurred while processing your request.';
            
            // Handle specific status codes
            switch (status) {
              case 400:
                // Handle bad request
                if (responseData.errors?.length) {
                  throw new Error(responseData.errors.join(', '));
                }
                break;
              case 401:
                // Redirect to login if not already there
                if (window.location.pathname !== '/login') {
                  window.location.href = '/login';
                }
                break;
              case 403:
                // Handle forbidden access
                console.error('Access denied:', message);
                break;
              case 404:
                // Handle not found
                console.error('Resource not found:', error.config?.url);
                break;
              case 422:
                // Handle validation errors
                if (responseData.errors?.length) {
                  throw new Error(`Validation failed: ${responseData.errors.join(', ')}`);
                }
                break;
              case 500:
                // Handle server errors
                console.error('Server error:', message);
                break;
            }
            
            throw new Error(message);
          }

          // Handle other errors
          throw new Error(error.message || 'An unknown error occurred. Please try again.');
        } catch (err) {
          this.errorLogger.logError(err as Error, {
            type: 'ResponseErrorHandlerError',
            originalError: error
          });
          return Promise.reject(error);
        }
      }
    );
  }

// ...
  // Handle response errors
    private handleRequestError(error: AxiosError<ApiResponse>): never {
    // Handle 401 Unauthorized responses
    this.handleUnauthorized(error);
    // Handle other error responses
    const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
    const apiError: ApiErrorResponse = {
      success: false,
      message: errorMessage,
      errors: error.response?.data?.errors || [errorMessage],
      status: error.response?.status || 0,
      statusText: error.response?.statusText || 'NETWORK_ERROR'
    };
    throw apiError;
  }

  private handleUnauthorized = (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear authentication
      jwtAuth.signOut();
      
      // Get the current path to redirect back after login
      const currentPath = window.location.pathname;
      
      // Only redirect to login if not already on the login page
      if (currentPath !== '/login') {
        // Redirect to login page if navigate function is available
        if (this.navigate) {
          this.navigate(`/login?redirect=${encodeURIComponent(currentPath)}`, { 
            replace: true 
          });
        } else {
          // Fallback to window.location if navigate is not available
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }
      }
    }
    return Promise.reject(error);
  };

  /**
   * Update the navigation function after initialization
   */
  public updateNavigate(navigate: NavigateFunction): void {
    this.navigate = navigate;
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

// Create and export a function to initialize the API client with required dependencies
export const createApiClient = (navigate?: NavigateFunction): ApiClient => {
  if (apiClientInstance) {
    // Update the navigation function if a new one is provided
    if (navigate) {
      apiClientInstance.updateNavigate(navigate);
    }
    return apiClientInstance;
  }
  
  if (!navigate) {
    console.warn('Creating ApiClient without navigate function. This may cause issues with authentication.');
  }
  
  return new ApiClient({
    baseUrl: '', // Use empty string for relative URLs
    timeout: 30000,
    navigate,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });
};

// Get or create an API client instance
export const getApiClient = (navigate?: NavigateFunction): ApiClient => {
  return createApiClient(navigate);
};

// Export a default instance that will be initialized when needed
export default getApiClient;
