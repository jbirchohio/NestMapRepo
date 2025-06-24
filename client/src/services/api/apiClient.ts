import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
  RawAxiosRequestHeaders,
  isAxiosError as axiosIsAxiosError,
  AxiosRequestHeaders
} from 'axios';
import { AuthInterceptor } from './interceptors/auth';
import { AbortController } from 'abort-controller';
import { TokenManager } from '@/utils/tokenManager';
// InputValidator not currently used, removed to clean up imports
import { CSRFTokenManager } from '@/utils/csrfTokenManager';
import { ErrorLogger } from '@/utils/errorLogger';
import { PerformanceMonitor } from '@/utils/performanceMonitor';
import type { ApiResponse, ApiErrorResponse } from '@/types/api';
import { AuthError, AuthErrorCode } from '@shared/types/auth/auth';
// AuthTokens type not directly used, removed to clean up imports

// Using shared AuthError type guard

/**
 * Extended error type that includes our custom AuthError and additional context
 */
export class ApiClientError extends Error {
  isAuthError: boolean;
  authError?: AuthError;
  statusCode?: number;
  code?: string;
  isAxiosError: boolean;
  config?: any;
  request?: any;
  response?: any;
  toJSON?: () => object;
  refreshOnUnauthorized?: boolean;

  constructor(message: string, isAuthError = false, error?: any) {
    super(message);
    this.name = 'ApiClientError';
    this.isAuthError = isAuthError;
    this.isAxiosError = false;
    
    if (error) {
      this.authError = error;
      this.statusCode = error.response?.status || error.statusCode;
      this.code = error.code;
      this.isAxiosError = error.isAxiosError || false;
      this.config = error.config;
      this.request = error.request;
      this.response = error.response;
      this.toJSON = error.toJSON;
      
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, ApiClientError);
      }
    }
  }
};

// Base response type for all API responses
export interface BaseApiResponse<T = unknown> {
  data: T;
  error?: ApiErrorResponse | AuthError;
  meta?: Record<string, unknown>;
}

// Type for paginated responses
export interface PaginatedResponse<T> extends BaseApiResponse<T[]> {
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Extended request configuration with additional options
export interface RequestConfig<T = unknown> extends AxiosRequestConfig<T> {
  /**
   * Whether to retry the request on failure (default: true)
   */
  retry?: boolean;
  /**
   * Whether to include credentials (cookies, HTTP authentication) with the request (default: true)
   */
  withCredentials?: boolean;
  /**
   * Whether to use the authentication interceptor (default: true)
   */
  useAuthInterceptor?: boolean;
  /**
   * Whether to retry on authentication failure (default: true)
   */
  retryOnAuthFailure?: boolean;
  /**
   * Whether to refresh token on 401 Unauthorized (default: true)
   */
  refreshOnUnauthorized?: boolean;
  /**
   * Maximum number of retry attempts (default: 3)
   */
  maxRetryAttempts?: number;
  /**
   * Custom error message to display
   */
  errorMessage?: string;
  /**
   * Whether to show error notifications (default: true)
   */
  showErrorNotification?: boolean;
  /**
   * Internal property to track retry attempts
   * @internal
   */
  _retry?: boolean;
  /**
   * Internal property to track request ID
   * @internal
   */
  requestId?: string;
  /**
   * Internal property for performance metrics
   * @internal
   */
  metrics?: any;
}

interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
  withCredentials?: boolean;
  useAuthInterceptor?: boolean;
  retryOnAuthFailure?: boolean;
  maxRetryAttempts?: number;
}


export class ApiClient {
  private client: AxiosInstance;
  private tokenManager: TokenManager;
  private csrfManager: CSRFTokenManager;
  private errorLogger: ErrorLogger;
  private performanceMonitor: PerformanceMonitor;
  private securityAuditInterval: ReturnType<typeof setInterval> | null = null;
  private abortControllers: Map<string, AbortController> = new Map();
  private authInterceptor: AuthInterceptor;
  private config: ApiClientConfig;
  constructor(config: ApiClientConfig) {
    this.config = {
      ...config,
      timeout: config.timeout || 30000,
      withCredentials: config.withCredentials ?? true,
      useAuthInterceptor: config.useAuthInterceptor ?? true,
      retryOnAuthFailure: config.retryOnAuthFailure ?? true,
      maxRetryAttempts: config.maxRetryAttempts || 3,
    };

    // Initialize services
    this.tokenManager = TokenManager.getInstance();
    this.csrfManager = CSRFTokenManager.getInstance();
    this.errorLogger = ErrorLogger.getInstance();
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.authInterceptor = new AuthInterceptor();

    // Initialize axios instance
    const defaultHeaders: RawAxiosRequestHeaders = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json',
      ...(config.headers || {}),
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: defaultHeaders as AxiosRequestHeaders,
      withCredentials: this.config.withCredentials,
    });

    // Set up interceptors
    this.setupInterceptors();
    this.setupSecurityAudit();
    
    // Set axios instance in auth interceptor
    this.authInterceptor.setAxiosInstance(this.client);
  }

  /**
   * Handles request configuration before it is sent
   * - Adds CSRF token
   * - Adds authentication token
   * - Sets up request tracking and metrics
   */
  private handleRequest = async (
    config: InternalAxiosRequestConfig & RequestConfig
  ): Promise<InternalAxiosRequestConfig> => {
    try {
      // Create a new config to avoid mutating the original
      const newConfig = { ...config };
      
      // Add request ID for tracking
      const requestId = crypto.randomUUID();
      (newConfig as any).requestId = requestId;

      // Create abort controller for this request
      const controller = new AbortController();
      this.abortControllers.set(requestId, controller);
      newConfig.signal = controller.signal;

      // Skip further processing for auth requests to prevent loops
      if (newConfig.url?.includes('/auth/refresh') || newConfig.skipAuth) {
        return newConfig;
      }

      // Add CSRF token if needed
      if (!newConfig.skipCsrf) {
        const csrfToken = await this.csrfManager.getToken();
        if (csrfToken) {
          newConfig.headers = newConfig.headers || {};
          (newConfig.headers as Record<string, string>)['X-CSRF-Token'] = csrfToken;
        }
      }

      // Add auth token if needed
      if (!newConfig.skipAuth) {
        const token = this.tokenManager.getAccessToken();
        if (!token) {
          throw new AuthError(AuthErrorCode.UNAUTHORIZED, 'No authentication token available');
        }
        newConfig.headers = newConfig.headers || {};
        (newConfig.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      }

      // Add security headers
      newConfig.headers = newConfig.headers || {};
      (newConfig.headers as Record<string, string>)['X-Request-ID'] = requestId;
      (newConfig.headers as Record<string, string>)['X-Application-Version'] = 
        (process.env as Record<string, string>)['APP_VERSION'] || '1.0.0';

      // Start performance monitoring
      const metrics = this.performanceMonitor.startRequest({
        url: newConfig.url || '',
        method: newConfig.method?.toUpperCase() || 'GET',
      });
      (newConfig as any).metrics = metrics;

      return newConfig;
    } catch (error) {
      this.errorLogger.logError(error as Error, {
        type: 'RequestInterceptorError',
        config
      });
      return Promise.reject(error);
    }
  };

  private setupSecurityAudit(): void {
    // Set up periodic security checks
    if (this.securityAuditInterval) {
      clearInterval(this.securityAuditInterval);
    }

    // Run security audit every 5 minutes
    this.securityAuditInterval = setInterval(() => {
      this.runSecurityChecks().catch(error => {
        this.errorLogger.logError(error, { type: 'SecurityAuditError' });
      });
    }, 5 * 60 * 1000);
  }

  private async runSecurityChecks(): Promise<void> {
    // Check for token expiration
    if (!this.tokenManager.hasValidToken()) {
      try {
        await this.tokenManager.refreshTokens();
      } catch (error) {
        this.errorLogger.logError(error as Error, { type: 'TokenRefreshError' });
        this.handleSessionError(error);
      }
    }
  }

  private handleSessionError = async (error: unknown): Promise<never> => {
    // Log the error for debugging
    this.errorLogger.logError(error as Error, {
      type: 'SessionError',
      message: 'Session validation failed',
      code: error instanceof AuthError ? error.code : undefined,
    });

    // Clear any invalid tokens
    this.tokenManager.clearTokens();

    // Redirect to login page if not already there
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      const redirectUrl = window.location.pathname !== '/' ? `?redirect=${encodeURIComponent(window.location.pathname)}` : '';
      window.location.href = `/login?session=expired${redirectUrl}`;
    }

    return Promise.reject(
      error instanceof AuthError 
        ? error 
        : new AuthError(AuthErrorCode.EXPIRED_TOKEN, 'Your session has expired. Please log in again.')
    );
  };

  private async handleTokenRefresh(error: ApiClientError): Promise<never> {
    // If we've already tried to refresh, don't try again
    if (!error.config || (error.config as any)._retry) {
      return Promise.reject(error);
    }

    try {
      // Mark that we're retrying
      (error.config as any)._retry = true;

      // Try to refresh the token
      const newToken = await this.tokenManager.refreshTokens();
      
      if (!newToken) {
        throw new AuthError(AuthErrorCode.EXPIRED_TOKEN, 'Failed to refresh token');
      }
      
      // Update the authorization header
      if (error.config.headers) {
        error.config.headers.Authorization = `Bearer ${newToken}`;
      }
      
      // Retry the original request with the new token
      return this.client.request(error.config);
    } catch (refreshError) {
      // If refresh fails, clear tokens and handle session error
      return this.handleSessionError(refreshError);
    }
  }

  private async handleRequestError(error: unknown): Promise<never> {
    if (!axiosIsAxiosError(error as Error)) {
      // For non-Axios errors, wrap in a generic error
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      const genericError = new ApiClientError(
        errorMessage,
        false,
        new AuthError(AuthErrorCode.UNKNOWN_ERROR, errorMessage)
      );
      this.errorLogger.logError(genericError, { type: 'NonAxiosError' });
      throw genericError;
    }

    const axiosError = error as AxiosError<BaseApiResponse>;
    // For Axios errors, create a properly typed error
    const apiError = new ApiClientError(
      axiosError.response?.data?.error?.message || axiosError.message,
      axiosError.response?.status === 401,
      axiosError
    );

    // Log the error with context if we have a response
    if (axiosError.response) {
      const { status } = axiosError.response;
      const errorData = axiosError.response.data?.error;
      
      // Log the error with context
      this.errorLogger.logError(apiError, {
        type: 'APIError',
        status,
        code: typeof errorData === 'object' && errorData !== null && 'code' in errorData 
          ? String(errorData.code) 
          : undefined,
        url: axiosError.config?.url,
        method: axiosError.config?.method,
        response: axiosError.response.data
      });

      // Handle specific error statuses
      if (status === 401) {
        return this.handleTokenRefresh(apiError);
      } else if (status === 403) {
        await this.handleSessionError(apiError as unknown as AxiosError<ApiResponse>);
        // Ensure we don't reach the end of the function
        return Promise.reject(apiError);
      }
      
      // For all other cases, throw the API error
      throw apiError;
    }
    
    // If we get here, it's an Axios error but without a response
    throw apiError || error;
  }

  private async handleResponseError(error: unknown): Promise<never> {
    // Clean up any pending requests
    const axiosError = error as AxiosError<BaseApiResponse<unknown>>;
    const requestId = (axiosError.config as any)?.requestId;
    if (requestId) {
      this.abortControllers.delete(requestId);
    }

    // If it's already an ApiClientError, just rethrow
    if (error instanceof ApiClientError) {
      return Promise.reject(error);
    }

    // Handle AuthError
    if (error instanceof AuthError) {
      return Promise.reject(new ApiClientError(error.message, true, error));
    }

    // Handle Axios errors
    if (axiosIsAxiosError(error)) {
      const status = error.response?.status;
      const code = error.code;
      const config = error.config as RequestConfig;
      const responseData = error.response?.data as { error?: { code?: string; message?: string; details?: unknown } } | undefined;

      // Log the error
      this.errorLogger.logError(error, {
        type: 'ApiError',
        status,
        code,
        url: config?.url,
        method: config?.method,
        responseData: responseData ? JSON.stringify(responseData) : undefined,
      });

      // Handle 401 Unauthorized (token expired or invalid)
      if (status === 401) {
        // If this is a refresh token request, don't try to refresh again
        if (config?.url?.includes('/auth/refresh')) {
          return this.handleSessionError(
            new AuthError(
              (responseData?.error?.code as AuthErrorCode) || AuthErrorCode.EXPIRED_TOKEN,
              responseData?.error?.message || 'Session expired',
              responseData?.error?.details as Record<string, unknown> | undefined
            )
          );
        }

        // Check if we should attempt to refresh tokens
        const shouldRefresh = config?.refreshOnUnauthorized ?? true;
        if (shouldRefresh) {
          return this.handleTokenRefresh(
            new ApiClientError(
              responseData?.error?.message || 'Authentication required',
              true,
              new AuthError(
                (responseData?.error?.code as AuthErrorCode) || AuthErrorCode.UNAUTHORIZED,
                responseData?.error?.message || 'Authentication required'
              )
            )
          );
        }
    }

    // Handle 403 Forbidden (insufficient permissions)
    if (status === 403) {
      return Promise.reject(
        new ApiClientError(
          responseData?.error?.message || 'Forbidden',
          true,
          new AuthError(
            (responseData?.error?.code as AuthErrorCode) || AuthErrorCode.FORBIDDEN,
            responseData?.error?.message || 'You do not have permission to perform this action',
            responseData?.error?.details as Record<string, unknown> | undefined
          )
        )
      );
    }

    // Handle 400 Bad Request with validation errors
    if (status === 400 && responseData?.error?.code === 'VALIDATION_ERROR') {
      return Promise.reject(
        new ApiClientError(
          responseData.error.message || 'Validation failed',
          true,
          new AuthError(
            AuthErrorCode.VALIDATION_ERROR,
            responseData.error.message || 'Validation failed',
            responseData.error.details as Record<string, any> | undefined
          )
        )
      );
    }

    // Handle other error statuses
    if (status && status >= 400) {
      return Promise.reject(
        new ApiClientError(
          responseData?.error?.message || `Request failed with status ${status}`,
          false,
          error
        )
      );
    }
  }

  // For non-Axios errors or unhandled status codes, wrap in ApiClientError
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
  return Promise.reject(
    new ApiClientError(errorMessage, false, error)
  );
};

/**
 * Handles successful API responses
 * @param response The successful response from the API
 */
private handleResponse<T>(
  response: AxiosResponse<BaseApiResponse<T>>
): AxiosResponse<BaseApiResponse<T>> {
  // Stop performance monitoring for this request
  const requestId = (response.config as any)?.requestId;
  if (requestId) {
    const metrics = (response.config as any)?.metrics;
    if (metrics) {
      this.performanceMonitor.endRequest(metrics, response);
    }
    this.abortControllers.delete(requestId);
  }

  // Handle successful responses with error data
  if (response.data?.error) {
    const error = response.data.error;
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : 'An unknown error occurred';
        
    const errorCode = error instanceof AuthError 
      ? error.code 
      : typeof error === 'object' && error !== null && 'code' in error && error.code
        ? String(error.code)
        : AuthErrorCode.UNKNOWN_ERROR;

    throw new ApiClientError(
      errorMessage,
      true,
      new AuthError(
        (errorCode as AuthErrorCode) || AuthErrorCode.UNKNOWN_ERROR,
        errorMessage
      )
    );
  }

  return response;
};

/**
/**
 * Sets up request and response interceptors
 */
private setupInterceptors(): void {
  // Request interceptor
  this.client.interceptors.request.use(
    this.handleRequest,
    (error) => this.handleRequestError(error).catch(err => Promise.reject(err))
  );

  // Response interceptor
  this.client.interceptors.response.use(
    (response) => this.handleResponse(response),
    (error) => this.handleResponseError(error).catch(err => Promise.reject(err))
  );
}

/**
 * Cancel all pending requests
 */
/**
 * Cancels all pending requests by aborting all active AbortControllers
 * and clearing the abortControllers map.
 */
public cancelAllRequests(): void {
  this.abortControllers.forEach((controller: AbortController) => {
    try {
      controller.abort();
    } catch (error: unknown) {
      // Ignore errors from already aborted controllers
      const isAbortError = error instanceof Error && error.name === 'AbortError';
      if (!isAbortError) {
        console.warn('Error while aborting controller:', error);
      }
    }
  });
  this.abortControllers.clear();
}

/**
 * Make a GET request
 */
public async get<T = any>(url: string, config?: RequestConfig): Promise<AxiosResponse<BaseApiResponse<T>>> {
  return this.client.get<BaseApiResponse<T>>(url, config);
}

/**
 * Make a POST request
 */
public async post<T = any>(
  url: string, 
  data?: any, 
  config?: RequestConfig
): Promise<AxiosResponse<BaseApiResponse<T>>> {
  return this.client.post<BaseApiResponse<T>>(url, data, config);
}

/**
 * Make a PUT request
 */
public async put<T = any>(
  url: string, 
  data?: any, 
  config?: RequestConfig
): Promise<AxiosResponse<BaseApiResponse<T>>> {
  return this.client.put<BaseApiResponse<T>>(url, data, config);
}

/**
 * Make a DELETE request
 */
public async delete<T = any>(url: string, config?: RequestConfig): Promise<AxiosResponse<BaseApiResponse<T>>> {
  return this.client.delete<BaseApiResponse<T>>(url, config);
}

}

// Create and export a singleton instance
const apiClient = new ApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  withCredentials: true,
  useAuthInterceptor: true,
  retryOnAuthFailure: true,
  maxRetryAttempts: 3
});

// Export the API client instance
export { apiClient };
