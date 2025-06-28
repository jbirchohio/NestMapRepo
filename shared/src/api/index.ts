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

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

class ApiError extends Error {
  status?: number;
  code?: string;
  details?: unknown;

  constructor(message: string, options: { status?: number; code?: string; details?: unknown } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
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

export { apiClient };
export default api;
