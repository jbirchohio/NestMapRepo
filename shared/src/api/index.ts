import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { 
  ApiResponse, 
  ApiErrorResponse, 
  ApiSuccessResponse
} from '../types/api/index.js';

// Extend the base AxiosRequestConfig with our custom options
type ExtendedAxiosRequestConfig<D = any> = Omit<AxiosRequestConfig<D>, 'cancelToken' | 'headers'> & {
  headers?: Record<string, string>;
  skipAuth?: boolean;
  skipErrorHandling?: boolean;
  useCache?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  cancelToken?: any; // Using any here to avoid type conflicts with Axios
  requestId?: string;
};

<<<<<<< Updated upstream
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ApiErrorCode, type ApiErrorResponse, type ApiSuccessResponse } from '../types/api';

export interface ApiConfig extends Omit<AxiosRequestConfig, 'headers'> {
  /** Skip authentication for this request */
  skipAuth?: boolean;
  /** Skip error handling for this request */
  skipErrorHandling?: boolean;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Additional metadata */
  meta?: Record<string, unknown>;
}

export class ApiError<T = unknown> extends Error {
  status?: number;
  code?: string;
  details?: T;
  config?: InternalAxiosRequestConfig;
  response?: AxiosResponse<ApiErrorResponse<T>>;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      details?: T;
      config?: InternalAxiosRequestConfig;
      response?: AxiosResponse<ApiErrorResponse<T>>;
    } = {}
  ) {
=======
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

class ApiError extends Error {
  status?: number;
  code?: string;
  details?: unknown;

  constructor(message: string, options: { status?: number; code?: string; details?: unknown } = {}) {
>>>>>>> Stashed changes
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
<<<<<<< Updated upstream
    this.config = options.config;
    this.response = options.response;
  }
}

export interface ApiClientConfig extends AxiosRequestConfig {
  baseURL: string;
  timeout?: number;
  withCredentials?: boolean;
  headers?: Record<string, string>;
  onUnauthenticated?: () => void;
  onError?: (error: ApiError) => void;
}

export class ApiClient {
  private client: AxiosInstance;
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 30000, // 30 seconds
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      ...config,
    };

    this.client = axios.create({
      ...this.config,
      headers: {
        ...this.config.headers,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = this.getAuthToken();
        if (token && !config.headers?.Authorization) {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${token}`,
          };
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiErrorResponse>) => {
        const { response, config } = error;
        const originalRequest = config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Handle 401 Unauthorized
        if (response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            // Try to refresh token
            const newToken = await this.refreshToken();
            if (newToken) {
              this.setAuthToken(newToken);
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // If refresh fails, log out user
            this.handleUnauthenticated();
            return Promise.reject(refreshError);
          }
        }

        // Create a proper ApiError from the response
        const apiError = new ApiError(
          response?.data?.message || error.message,
          {
            status: response?.status,
            code: response?.data?.code,
            details: response?.data?.details,
            config: error.config,
            response,
          }
        );

        // Global error handler
        if (this.config.onError && !originalRequest.skipErrorHandling) {
          this.config.onError(apiError);
        }

        return Promise.reject(apiError);
      }
    );
  }

  // Abstract methods to be implemented by the client
  protected getAuthToken(): string | null {
    // To be implemented by the client
    return null;
  }

  protected setAuthToken(token: string): void {
    // To be implemented by the client
  }

  protected async refreshToken(): Promise<string | null> {
    // To be implemented by the client
    return null;
  }

  protected handleUnauthenticated(): void {
    if (this.config.onUnauthenticated) {
      this.config.onUnauthenticated();
    }
  }

  // HTTP Methods
  public async get<T = any>(
    url: string,
    config: ApiConfig = {}
  ): Promise<ApiSuccessResponse<T>> {
    const response = await this.client.get<ApiSuccessResponse<T>>(url, config);
    return response.data;
  }

  public async post<T = any, D = any>(
    url: string,
    data?: D,
    config: ApiConfig = {}
  ): Promise<ApiSuccessResponse<T>> {
    const response = await this.client.post<ApiSuccessResponse<T>>(url, data, config);
    return response.data;
  }

  public async put<T = any, D = any>(
    url: string,
    data?: D,
    config: ApiConfig = {}
  ): Promise<ApiSuccessResponse<T>> {
    const response = await this.client.put<ApiSuccessResponse<T>>(url, data, config);
    return response.data;
  }

  public async patch<T = any, D = any>(
    url: string,
    data?: D,
    config: ApiConfig = {}
  ): Promise<ApiSuccessResponse<T>> {
    const response = await this.client.patch<ApiSuccessResponse<T>>(url, data, config);
    return response.data;
  }

  public async delete<T = any>(
    url: string,
    config: ApiConfig = {}
  ): Promise<ApiSuccessResponse<T>> {
    const response = await this.client.delete<ApiSuccessResponse<T>>(url, config);
    return response.data;
  }

  // Create a scoped API client with a base URL
  public createScoped(baseURL: string): ApiClient {
    return new ApiClient({
      ...this.config,
      baseURL: `${this.config.baseURL}${baseURL}`,
    });
  }
}

// Default API client instance
const createApiClient = (baseURL: string, config: Omit<ApiClientConfig, 'baseURL'> = {}) => {
  return new ApiClient({
    baseURL,
    ...config,
  });
};

export { createApiClient };

export type { AxiosInstance, AxiosResponse, AxiosRequestConfig };
=======
  }
}

/**
 * Create a configured axios instance
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});
>>>>>>> Stashed changes

/**
 * Type-safe API request function
 */
export const api = async <T = unknown>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  data?: unknown,
  config: ExtendedAxiosRequestConfig = {}
): Promise<T> => {
  try {
    const response: AxiosResponse<ApiResponse<T>> = await apiClient({
      url: endpoint,
      method,
      data,
      ...config,
    });

    if (!response.data.success) {
      const errorData = response.data as ApiErrorResponse;
      throw new ApiError(errorData.message || 'API request failed', {
        status: response.status,
        code: errorData.code,
        details: errorData.details,
      });
    }

    // At this point, we know it's a success response
    const successData = response.data as ApiSuccessResponse<T>;
    return successData.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data) {
        const errorData = error.response.data as ApiErrorResponse | undefined;
        throw new ApiError(errorData?.message || error.message, {
          status: error.response.status,
          code: errorData?.code,
          details: errorData?.details,
        });
      }
      throw new ApiError(error.message, { status: error.response?.status });
    }
    throw error instanceof Error ? error : new Error('An unknown error occurred');
  }
};

/**
 * Configure request/response interceptors
 */
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token to requests if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Handle unauthorized (e.g., redirect to login)
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

<<<<<<< Updated upstream
=======
export { apiClient };
>>>>>>> Stashed changes
export default api;
