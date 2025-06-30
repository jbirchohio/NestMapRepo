import type { ApiConfig, ApiError } from '@shared/schema/types/api';
import { API_ENDPOINTS } from '../../constants/api-endpoints.js';

export { API_ENDPOINTS };

// Re-export React Query utilities

// Export a function to initialize React Query integration
export async function initializeReactQuery() {
  try {
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const { ReactQueryDevtools } = await import('@tanstack/react-query-devtools');
    
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes
          retry: 1,
        },
      },
    });

    return {
      QueryClient,
      QueryClientProvider,
      ReactQueryDevtools,
      queryClient,
    };
  } catch (error) {
    console.warn('React Query not found. Some features will be disabled.', error);
    return null;
  }
}

// Re-export React Query hooks with proper types
export { createQueryHook, createMutationHook } from './react-query';

export interface RequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  params?: Record<string, string | number | boolean | undefined>;
  data?: unknown;
  timeout?: number;
  signal?: AbortSignal;
}

/**
 * Default API configuration
 */
const defaultConfig: ApiConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Include cookies in requests
};

/**
 * Create an API client with the given base URL and default config
 */
function createApiClient(baseURL: string, config: ApiConfig = {}) {
  const apiConfig: ApiConfig = {
    ...defaultConfig,
    ...config,
    headers: {
      ...defaultConfig.headers,
      ...config.headers,
    },
  };

  async function request<T = unknown>(
    endpoint: string,
    method: string,
    data?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const controller = new AbortController();
    const signal = options.signal || controller.signal;
    
    // Set up timeout
    if (options.timeout) {
      setTimeout(() => controller.abort(), options.timeout);
    }

    // Build URL with query parameters
    const url = new URL(endpoint, baseURL);
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }

    try {
      const response = await fetch(url.toString(), {
        ...apiConfig,
        ...options,
        method,
        signal,
        headers: {
          ...apiConfig.headers,
          ...(data ? { 'Content-Type': 'application/json' } : {}),
          ...options.headers,
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      return handleApiResponse<T>(response);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        const abortError: ApiError = new Error('Request was aborted');
        abortError.code = 'ABORT_ERROR';
        throw abortError;
      }
      throw error;
    }
  }

  return {
    get: <T = unknown>(endpoint: string, options?: RequestOptions) =>
      request<T>(endpoint, 'GET', undefined, options),
    
    post: <T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions) =>
      request<T>(endpoint, 'POST', data, options),
    
    put: <T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions) =>
      request<T>(endpoint, 'PUT', data, options),
    
    patch: <T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions) =>
      request<T>(endpoint, 'PATCH', data, options),
    
    delete: <T = void>(endpoint: string, options?: RequestOptions) =>
      request<T>(endpoint, 'DELETE', undefined, options),
  };
}

// Create default API client instance
export const api = createApiClient('', defaultConfig);

/**
 * Handle API response and error handling
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  
  try {
    const data = isJson ? await response.json().catch(() => ({})) : await response.text();
    
    if (!response.ok) {
      const error: ApiError = new Error(
        isJson && data.message ? data.message : response.statusText
      );
      
      error.status = response.status;
      error.code = isJson ? data.code : undefined;
      error.details = isJson ? data : { message: 'Non-JSON error response' };
      
      // Handle common error statuses
      if (response.status === 401) {
        // Handle unauthorized (e.g., redirect to login)
        // You might want to add your auth logic here
        console.warn('Unauthorized request - redirecting to login');
      } else if (response.status === 403) {
        error.message = 'You do not have permission to perform this action';
      } else if (response.status === 404) {
        error.message = 'The requested resource was not found';
      } else if (response.status >= 500) {
        error.message = 'An unexpected server error occurred';
      }
      
      throw error;
    }
    
    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      const abortError: ApiError = new Error('Request was aborted');
      abortError.code = 'ABORT_ERROR';
      throw abortError;
    }
    
    // If we have a response but couldn't parse JSON
    if (response && !isJson) {
      const error: ApiError = new Error('Invalid JSON response from server');
      error.status = response.status;
      error.code = 'INVALID_JSON';
      throw error;
    }
    
    throw error;
  }
}

/**
 * Create type-safe API methods for a resource
 */
export function createResourceApi<T>(resource: string) {
  return {
    /**
     * Fetch a list of resources or a single resource by ID
     */
    get: <R = T>(id?: string | number, options?: RequestOptions) => {
      const url = id ? `${resource}/${id}` : resource;
      return api.get<R>(url, options);
    },
    
    /**
     * Create a new resource
     */
    create: <R = T>(data: unknown, options?: RequestOptions) =>
      api.post<R>(resource, data, options),
    
    /**
     * Update a resource by ID (full update)
     */
    update: <R = T>(id: string | number, data: unknown, options?: RequestOptions) =>
      api.put<R>(`${resource}/${id}`, data, options),
    
    /**
     * Partially update a resource by ID
     */
    patch: <R = T>(id: string | number, data: unknown, options?: RequestOptions) =>
      api.patch<R>(`${resource}/${id}`, data, options),
    
    /**
     * Delete a resource by ID
     */
    delete: (id: string | number, options?: RequestOptions) =>
      api.delete<void>(`${resource}/${id}`, options),
  };
}

// Type definitions for React Query hooks
type UseQueryOptions<TData, TError> = {
  queryKey: unknown[];
  queryFn: (context: any) => Promise<TData>;
  enabled?: boolean;
  retry?: boolean | number;
  staleTime?: number;
  cacheTime?: number;
  refetchOnMount?: boolean | 'always';
  refetchOnWindowFocus?: boolean | 'always';
  refetchOnReconnect?: boolean | 'always';
  refetchInterval?: number | false;
  refetchIntervalInBackground?: boolean;
  onSuccess?: (data: TData) => void;
  onError?: (error: TError) => void;
  onSettled?: (data: TData | undefined, error: TError | null) => void;
};

type UseQueryResult<TData, TError> = {
  data: TData | undefined;
  error: TError | null;
  isError: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isIdle: boolean;
  status: 'idle' | 'loading' | 'error' | 'success';
  isFetching: boolean;
  refetch: () => Promise<{ data?: TData; error: TError | null }>;
};

// Export React Query hooks with dynamic imports
export function useQuery<TData = unknown, TError = Error>(
  options: UseQueryOptions<TData, TError>
): UseQueryResult<TData, TError> {
  try {
    const { useQuery: useQueryFn } = require('@tanstack/react-query') as {
      useQuery: <T, E = Error>(opts: UseQueryOptions<T, E>) => UseQueryResult<T, E>;
    };
    return useQueryFn(options);
  } catch (error) {
    console.warn('React Query not found. useQuery will return default values.');
    return {
      data: undefined,
      error: null,
      isError: false,
      isLoading: false,
      isSuccess: false,
      isIdle: true,
      status: 'idle',
      isFetching: false,
      refetch: () => Promise.resolve({ data: undefined, error: null }),
    };
  }
};

type UseMutationOptions<TData, TError, TVariables> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables, context: unknown) => void;
  onError?: (error: TError, variables: TVariables, context: unknown) => void;
  onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables, context: unknown) => void;
  onMutate?: (variables: TVariables) => Promise<unknown> | unknown;
  retry?: boolean | number;
};

type UseMutationResult<TData, TError, TVariables> = {
  data: TData | undefined;
  error: TError | null;
  isError: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isIdle: boolean;
  status: 'idle' | 'loading' | 'error' | 'success';
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  reset: () => void;
};

export function useMutation<TData = unknown, TVariables = void, TError = Error>(
  options: UseMutationOptions<TData, TError, TVariables>
): UseMutationResult<TData, TError, TVariables> {
  try {
    const { useMutation: useMutationFn } = require('@tanstack/react-query') as {
      useMutation: <T, E = Error, V = void>(opts: UseMutationOptions<T, E, V>) => UseMutationResult<T, E, V>;
    };
    return useMutationFn(options);
  } catch (error) {
    console.warn('React Query not found. useMutation will return no-op functions.');
    return {
      mutate: () => {},
      mutateAsync: () => Promise.resolve(undefined as unknown as TData),
      reset: () => {},
      isError: false,
      isLoading: false,
      isSuccess: false,
      isIdle: true,
      error: null,
      data: undefined,
      status: 'idle' as const,
    };
  }
};
