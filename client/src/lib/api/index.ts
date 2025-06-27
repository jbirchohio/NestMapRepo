import { apiRequest, ApiRequestOptions, ApiError } from '../queryClient';
import { API_ENDPOINTS } from '../constants';
import { QueryClient, QueryKey, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// Log levels for API client
const LogLevel = {
  NONE: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
} as const;

type LogLevel = typeof LogLevel[keyof typeof LogLevel];

// Current log level (can be configured)
let currentLogLevel: LogLevel = LogLevel.DEBUG;

/**
 * Set the log level for the API client
 */
export function setApiLogLevel(level: LogLevel) {
  currentLogLevel = level;
}

/**
 * Log a message if the current log level is at least the specified level
 */
function log(level: LogLevel, message: string, data?: unknown) {
  if (currentLogLevel < level) return;
  
  const timestamp = new Date().toISOString();
  const levelStr = Object.entries(LogLevel).find(([_, v]) => v === level)?.[0] || 'LOG';
  
  const logMessage = `[${timestamp}] [${levelStr}] ${message}`;
  
  if (level === LogLevel.ERROR) {
    console.error(logMessage, data || '');
  } else if (level === LogLevel.WARN) {
    console.warn(logMessage, data || '');
  } else if (level === LogLevel.INFO) {
    console.info(logMessage, data || '');
  } else {
    console.log(logMessage, data || '');
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Extended API configuration options
 */
interface ApiConfig extends Omit<ApiRequestOptions, 'method' | 'url' | 'params'> {
  /** Query parameters for the request */
  params?: Record<string, string | number | boolean | undefined>;
  
  /** Abort signal for cancelling the request */
  signal?: AbortSignal;
  
  /** Response type (default: 'json') */
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
}

/**
 * Make a type-safe API request with proper error handling and logging
 * This is a thin wrapper around the base apiRequest function
 * that adds endpoint resolution, logging, and some convenience features
 */
export async function api<T = unknown>(
  endpoint: keyof typeof API_ENDPOINTS | string,
  method: HttpMethod = 'GET',
  data?: unknown,
  config: Omit<ApiConfig, 'data'> = {}
): Promise<T> {
  const requestId = Math.random().toString(36).substring(2, 9);
  const { params = {}, signal, responseType = 'json', ...restConfig } = config;
  
  // Resolve the endpoint URL
  const baseUrl = API_ENDPOINTS[endpoint as keyof typeof API_ENDPOINTS] || endpoint;
  const url = new URL(baseUrl, window.location.origin);
  
  // Log request details
  log(LogLevel.DEBUG, `[${requestId}] API Request`, {
    method,
    url: url.toString(),
    endpoint,
    params,
    data,
    ...(signal && { aborted: signal.aborted }),
  });
  
  const startTime = performance.now();
  
  try {
    const response = await apiRequest<T>({
      method,
      url: baseUrl,
      data,
      params,
      signal,
      responseType,
      ...restConfig,
      // Add request ID to headers for tracing
      headers: {
        ...(restConfig.headers || {}),
        'X-Request-ID': requestId,
      },
    });
    
    const duration = Math.round(performance.now() - startTime);
    
    // Log successful response
    log(LogLevel.DEBUG, `[${requestId}] API Response (${duration}ms)`, {
      status: 200,
      url: url.toString(),
      response: response,
    });
    
    return response;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    const apiError = error as ApiError;
    
    // Log error response
    log(LogLevel.ERROR, `[${requestId}] API Error (${duration}ms)`, {
      url: url.toString(),
      status: apiError.status,
      code: apiError.code,
      message: apiError.message,
      ...(apiError.details && { details: apiError.details }),
      ...(apiError.stack && { stack: apiError.stack }),
    });
    
    // Re-throw the error for the caller to handle
    throw error;
  }
}

/**
 * Create a type-safe API client for a specific resource
 * This provides a more convenient interface for common CRUD operations
 */
export function createApiClient<T = unknown, TCreate = T, TUpdate = Partial<TCreate>>(resource: string) {
  const baseUrl = `/${resource}`;
  
  return {
    /**
     * Get all items (with optional pagination)
     */
    async getAll(params?: Record<string, unknown>, config?: Omit<ApiConfig, 'params'>) {
      return api<T[]>(baseUrl, 'GET', undefined, { ...config, params });
    },
    
    /**
     * Get a single item by ID
     */
    async getById(id: string | number, config?: ApiConfig) {
      return api<T>(`${baseUrl}/${id}`, 'GET', undefined, config);
    },
    
    /**
     * Create a new item
     */
    async create(data: TCreate, config?: Omit<ApiConfig, 'data'>) {
      return api<T>(baseUrl, 'POST', data, config);
    },
    
    /**
     * Update an existing item
     */
    async update(id: string | number, data: TUpdate, config?: Omit<ApiConfig, 'data'>) {
      return api<T>(`${baseUrl}/${id}`, 'PUT', data, config);
    },
    
    /**
     * Partially update an existing item
     */
    async patch(id: string | number, data: Partial<TUpdate>, config?: Omit<ApiConfig, 'data'>) {
      return api<T>(`${baseUrl}/${id}`, 'PATCH', data, config);
    },
    
    /**
     * Delete an item
     */
    async delete(id: string | number, config?: ApiConfig) {
      return api<void>(`${baseUrl}/${id}`, 'DELETE', undefined, config);
    },
  };
}

/**
 * Create a type-safe query hook using React Query
 * This provides a standardized way to fetch data with proper typing
 */
export function createQueryHook<TData = unknown, TError = ApiError>(
  key: string | [string, ...unknown[]],
  fetcher: () => Promise<TData>,
  options: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> = {}
) {
  const queryKey = Array.isArray(key) ? key : [key];
  
  return {
    queryKey,
    useQuery: (queryOptions: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> = {}) => {
      return useQuery<TData, TError>({
        queryKey,
        queryFn: fetcher,
        ...options,
        ...queryOptions,
      });
    },
  };
}

/**
 * Create a type-safe mutation hook using React Query
 * This provides a standardized way to perform mutations with proper typing
 */
export function createMutationHook<TData = unknown, TVariables = void, TError = ApiError>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> = {}
) {
  return () => useMutation<TData, TError, TVariables>(mutationFn, options);
}

/**
 * Helper to create API query hooks for a resource
 * This combines createApiClient with createQueryHook for a more ergonomic API
 */
export function createResourceHooks<T = unknown, TCreate = T, TUpdate = Partial<TCreate>>(
  resource: string
) {
  const api = createApiClient<T, TCreate, TUpdate>(resource);
  
  return {
    // Query hooks
    useGetAll: (params?: Record<string, unknown>, options = {}) => {
      const queryKey = [resource, params];
      const { useQuery } = createQueryHook<T[]>(
        queryKey,
        () => api.getAll(params),
        options
      );
      return useQuery();
    },
    
    useGetById: (id: string | number, options = {}) => {
      const queryKey = [resource, id];
      const { useQuery } = createQueryHook<T>(
        queryKey,
        () => api.getById(id),
        {
          enabled: !!id, // Only run the query if we have an ID
          ...options,
        }
      );
      return useQuery();
    },
    
    // Mutation hooks
    useCreate: (options = {}) => {
      return useMutation<T, ApiError, TCreate>(
        (data) => api.create(data),
        options
      );
    },
    
    useUpdate: (options = {}) => {
      return useMutation<T, ApiError, { id: string | number; data: TUpdate }>(
        ({ id, data }) => api.update(id, data),
        options
      );
    },
    
    usePatch: (options = {}) => {
      return useMutation<T, ApiError, { id: string | number; data: Partial<TUpdate> }>(
        ({ id, data }) => api.patch(id, data),
        options
      );
    },
    
    useDelete: (options = {}) => {
      return useMutation<void, ApiError, string | number>(
        (id) => api.delete(id),
        options
      );
    },
  };
}
        typeof errorData === 'object' && errorData !== null && 'message' in errorData
          ? String((errorData as { message: unknown }).message)
          : 'An error occurred'
      );
      error.status = response.status;
      error.code = (errorData as { code?: string })?.code;
      error.details = errorData;
      throw error;
    }

    // No content
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      const abortError: ApiError = new Error('Request was aborted');
      abortError.code = 'ABORT_ERROR';
      throw abortError;
    }
    throw error;
  }
}

/**
 * Create type-safe API methods for a resource
 */
export function createApiClient<T>(resource: string) {
  return {
    get: <R = T>(id?: string | number, config?: Omit<ApiConfig, 'data'>) => {
      const url = id ? `${resource}/${id}` : resource;
      return api<R>(url, 'GET', undefined, config);
    },
    create: <R = T>(data: unknown, config?: Omit<ApiConfig, 'data'>) =>
      api<R>(resource, 'POST', data, config),
    update: <R = T>(id: string | number, data: unknown, config?: Omit<ApiConfig, 'data'>) =>
      api<R>(`${resource}/${id}`, 'PUT', data, config),
    patch: <R = T>(id: string | number, data: unknown, config?: Omit<ApiConfig, 'data'>) =>
      api<R>(`${resource}/${id}`, 'PATCH', data, config),
    delete: (id: string | number, config?: Omit<ApiConfig, 'data'>) =>
      api<void>(`${resource}/${id}`, 'DELETE', undefined, config),
  };
}

/**
 * Create a type-safe query hook using React Query
 */
export function createQueryHook<TData, TError = ApiError>(
  key: string | [string, ...unknown[]],
  fetcher: () => Promise<TData>,
  options: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> = {}
) {
  return function useCustomQuery() {
    return useQuery<TData, TError>({
      queryKey: Array.isArray(key) ? key : [key],
      queryFn: fetcher,
      ...options,
    });
  };
}

/**
 * Create a type-safe mutation hook using React Query
 */
export function createMutationHook<TData = unknown, TVariables = void, TError = ApiError>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> = {}
) {
  return function useCustomMutation() {
    return useMutation<TData, TError, TVariables>({
      mutationFn,
      ...options,
    });
  };
}
