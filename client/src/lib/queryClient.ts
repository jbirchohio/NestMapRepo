import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { 
  ApiResponse, 
  ApiErrorCode, 
  ApiErrorResponse, 
  isApiErrorResponse,
  createErrorResponse,
  PaginationParams
} from '@shared/types/api';

/**
 * Extended error type that includes HTTP status and additional metadata
 */
export interface ApiError extends Error {
  /** HTTP status code */
  status?: number;
  
  /** Error code */
  code?: string;
  
  /** Additional error details */
  details?: unknown;
  
  /** Original response object (if available) */
  response?: Response;
}

/**
 * Options for API requests
 */
export interface ApiRequestOptions<T = unknown> {
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  
  /** Request URL */
  url: string;
  
  /** Request data (for POST/PUT/PATCH) */
  data?: unknown;
  
  /** Request headers */
  headers?: Record<string, string>;
  
  /** Abort signal for cancelling the request */
  signal?: AbortSignal;
  
  /** Whether to include credentials (cookies) in the request */
  credentials?: RequestCredentials;
  
  /** Query parameters (for GET requests) */
  params?: Record<string, string | number | boolean | undefined>;
  
  /** Response type (default: 'json') */
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
}

/**
 * Make a type-safe API request with standardized error handling
 * @param options Request options
 * @returns Promise that resolves to the response data
 * @throws {ApiError} If the request fails
 */
export async function apiRequest<T = unknown>(
  options: ApiRequestOptions
): Promise<T> {
  const { 
    method, 
    url, 
    data, 
    headers: customHeaders = {}, 
    signal,
    credentials = 'include',
    params,
    responseType = 'json'
  } = options;

  try {
    // Build URL with query parameters
    const urlObj = new URL(url, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          urlObj.searchParams.append(key, String(value));
        }
      });
    }

    // Set up headers
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(data && method !== 'GET' && { 'Content-Type': 'application/json' }),
      ...customHeaders,
    };
    
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token && !headers.Authorization) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers,
      credentials,
      signal,
      body: data && method !== 'GET' ? JSON.stringify(data) : undefined,
    };
    
    // Make the request
    const response = await fetch(urlObj.toString(), requestOptions);
    
    // Handle non-2xx responses
    if (!response.ok) {
      let errorData: ApiErrorResponse | string;
      
      try {
        // Try to parse error response as JSON
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          errorData = await response.json();
        } else {
          errorData = await response.text();
        }
      } catch (e) {
        // If parsing fails, use status text
        errorData = response.statusText || 'Unknown error';
      }
      
      // Create a standardized error
      const error: ApiError = new Error(
        typeof errorData === 'object' 
          ? errorData.message || 'API request failed'
          : errorData
      );
      
      error.status = response.status;
      error.code = typeof errorData === 'object' ? errorData.code : undefined;
      error.details = typeof errorData === 'object' ? errorData.details : errorData;
      error.response = response;
      
      // Handle specific error cases
      if (response.status === 401) {
        // Handle unauthorized (e.g., redirect to login)
        // You might want to add a global auth handler here
        console.warn('Unauthorized request - user may need to log in');
      }
      
      throw error;
    }
    
    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as unknown as T;
    }
    
    // Parse successful response based on response type
    switch (responseType) {
      case 'json':
        try {
          return await response.json() as T;
        } catch (e) {
          // If JSON parsing fails but we have a 2xx status, return as text
          if (response.bodyUsed) {
            return undefined as unknown as T;
          }
          return (await response.text()) as unknown as T;
        }
      case 'text':
        return (await response.text()) as unknown as T;
      case 'blob':
        return (await response.blob()) as unknown as T;
      case 'arraybuffer':
        return (await response.arrayBuffer()) as unknown as T;
      default:
        throw new Error(`Unsupported response type: ${responseType}`);
    }
  } catch (error) {
    // Handle network errors, aborted requests, etc.
    if (error instanceof DOMException && error.name === 'AbortError') {
      const abortError: ApiError = new Error('Request was aborted');
      abortError.code = 'ABORT_ERROR';
      throw abortError;
    }
}
/**
 * Behavior for handling unauthorized (401) responses
 */
export type UnauthorizedBehavior = 'returnNull' | 'throw' | 'redirect';

/**
 * Options for query functions
 */
export interface QueryFnOptions<T = unknown> {
  /** How to handle 401 Unauthorized responses */
  on401?: UnauthorizedBehavior;
  
  /** Abort signal for the request */
  signal?: AbortSignal;
  
  /** Additional metadata */
  meta?: {
    /** Custom headers for the request */
    headers?: Record<string, string>;
    
    /** Whether to include credentials (cookies) */
    credentials?: RequestCredentials;
    
    /** Additional request options */
    [key: string]: unknown;
  };
  
  /** Custom error handler */
  onError?: (error: ApiError) => void;
}

/**
 * Creates a query function for React Query that uses our API client
 */
export const getQueryFn = <T = unknown>({
  on401 = 'throw',
  signal,
  meta = {},
  onError,
}: Partial<QueryFnOptions<T>> = {}): QueryFunction<T> => 
  async ({ queryKey, signal: querySignal, meta: queryMeta }) => {
    const [endpoint, params] = queryKey as [string, Record<string, unknown>?];
    const mergedMeta = { ...meta, ...(queryMeta as object) };
    
    try {
      // Make the API request
      const response = await apiRequest<ApiResponse<T>>({
        method: 'GET',
        url: endpoint,
        params: params as Record<string, string | number | boolean | undefined>,
        signal: signal || querySignal || undefined,
        credentials: mergedMeta.credentials,
        headers: {
          ...(mergedMeta.headers as Record<string, string> || {}),
        },
      });
      
      // Handle API response
      if (response && 'success' in response) {
        if (response.success) {
          return response.data;
        } else {
          // Handle API error response
          const error = new Error(response.message || 'API request failed') as ApiError;
          error.code = response.code;
          error.details = response.details;
          throw error;
        }
      }
      
      return response as unknown as T;
    } catch (error) {
      const apiError = error as ApiError;
      
      // Call custom error handler if provided
      if (onError) {
        onError(apiError);
      }
      
      // Handle 401 Unauthorized based on behavior
      if (apiError.status === 401) {
        switch (on401) {
          case 'returnNull':
            return null as unknown as T;
          case 'redirect':
            // Redirect to login or handle unauthorized access
            // You might want to implement this based on your auth flow
            console.warn('Unauthorized access - redirecting to login');
            // Example: window.location.href = '/login';
            break;
          case 'throw':
          default:
            // Re-throw the error for React Query to handle
            throw apiError;
        }
      }
      
      // Re-throw the error for React Query to handle
      throw apiError;
    }
  };
/**
 * Default query function that will be used for all queries
 * This wraps getQueryFn with default options
 */
const defaultQueryFn: QueryFunction = async (context) => {
  const { queryKey, signal, meta } = context;
  const queryFn = getQueryFn({
    signal,
    meta: meta as QueryFnOptions['meta'],
    on401: 'redirect', // Default behavior for unauthorized requests
  });
  
  return queryFn({
    queryKey,
    signal,
    meta,
  } as Parameters<typeof queryFn>[0]);
};

/**
 * Global error handler for React Query
 */
const queryErrorHandler = (error: unknown) => {
  const apiError = error as ApiError;
  
  // Log the error for debugging
  console.error('Query error:', {
    message: apiError.message,
    code: apiError.code,
    status: apiError.status,
    details: apiError.details,
  });
  
  // You could add more sophisticated error handling here,
  // like showing a toast notification or redirecting to an error page
};

/**
 * Default options for React Query queries
 */
const defaultQueryOptions = {
  queryFn: defaultQueryFn,
  refetchOnWindowFocus: false, // Don't refetch when window regains focus
  refetchOnMount: true, // Refetch when component mounts
  refetchOnReconnect: true, // Refetch when network reconnects
  retry: (failureCount: number, error: unknown) => {
    const apiError = error as ApiError;
    
    // Don't retry for 4xx errors (except 408, 429, 500-504)
    if (apiError.status && apiError.status >= 400 && apiError.status < 500) {
      // Retry on rate limits (429) and timeouts (408)
      if ([408, 429].includes(apiError.status)) {
        return failureCount < 3; // Retry a few times for rate limits/timeouts
      }
      return false; // Don't retry other 4xx errors
    }
    
    // Retry up to 3 times for other errors
    return failureCount < 3;
  },
  staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh for this duration
  cacheTime: 10 * 60 * 1000, // 10 minutes - keep unused/inactive data in cache for this duration
  retryDelay: (attemptIndex: number) => 
    Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff with max 30s
  onError: queryErrorHandler,
} as const;

/**
 * Default options for React Query mutations
 */
const defaultMutationOptions = {
  onError: (error: unknown) => {
    const apiError = error as ApiError;
    
    // Log the error for debugging
    console.error('Mutation error:', {
      message: apiError.message,
      code: apiError.code,
      status: apiError.status,
      details: apiError.details,
    });
    
    // You could add more sophisticated error handling here,
    // like showing a toast notification
  },
  retry: (failureCount: number, error: unknown) => {
    const apiError = error as ApiError;
    
    // Don't retry for 4xx errors (except 408, 429, 500-504)
    if (apiError.status && apiError.status >= 400 && apiError.status < 500) {
      // Retry on rate limits (429) and timeouts (408)
      if ([408, 429].includes(apiError.status)) {
        return failureCount < 2; // Retry once for rate limits/timeouts
      }
      return false; // Don't retry other 4xx errors
    }
    
    // Retry up to 2 times for other errors
    return failureCount < 2;
  },
} as const;

/**
 * React Query client instance with default options
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: defaultQueryOptions,
    mutations: defaultMutationOptions,
  },
});

/**
 * Helper function to create a query key with proper typing
 */
export function createQueryKey<T extends unknown[]>(
  key: string,
  ...params: T
): [string, ...T] {
  return [key, ...params];
}

/**
 * Helper function to create a mutation key with proper typing
 */
export function createMutationKey<T extends unknown[]>(
  key: string,
  ...params: T
): [string, ...T] {
  return [key, ...params];
}
