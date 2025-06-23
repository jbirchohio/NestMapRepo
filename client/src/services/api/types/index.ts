import { AxiosRequestConfig, AxiosResponse, AxiosError, CancelToken, Method } from 'axios';
/**
 * Extended request configuration with custom options
 * @template T - Expected response type
 * @template D - Request data type
 */
export interface RequestConfig<T = any, D = any> extends Omit<AxiosRequestConfig<D>, 'cancelToken' | 'headers' | 'method'> {
    /** Request headers */
    headers?: Record<string, string>;
    /** Skip authentication for this request */
    skipAuth?: boolean;
    /** Skip global error handling for this request */
    skipErrorHandling?: boolean;
    /** Enable response caching */
    useCache?: boolean;
    /** Custom cache key */
    cacheKey?: string;
    /** Cache TTL in milliseconds */
    cacheTTL?: number;
    /** Enable request deduplication */
    dedupe?: boolean;
    /** Cancel token or boolean to auto-generate one */
    cancelToken?: CancelToken | boolean;
    /** Request method */
    method?: Method;
    /** Request ID for cancellation */
    requestId?: string;
    /** Number of retry attempts */
    retry?: number;
    /** Retry delay in milliseconds */
    retryDelay?: number;
    /** On upload progress callback */
    onUploadProgress?: (progressEvent: ProgressEvent) => void;
    /** On download progress callback */
    onDownloadProgress?: (progressEvent: ProgressEvent) => void;
    /** Response type override */
    responseType?: 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream';
    /** Metadata for request tracking */
    meta?: Record<string, any>;
}
/**
 * Standard API response format
 * @template T - Response data type
 */
export interface ApiResponse<T = any> {
    /** Response data */
    data: T;
    /** Optional message from the server */
    message?: string;
    /** Indicates if the request was successful */
    success: boolean;
    /** Server timestamp */
    timestamp?: string;
    /** Optional error code for error responses */
    code?: string;
    /** Optional validation errors */
    errors?: Record<string, string[]>;
}
/**
 * Paginated response format
 * @template T - Type of items in the data array
 */
export interface PaginatedResponse<T = any> {
    /** Array of items */
    data: T[];
    /** Total number of items */
    total: number;
    /** Current page number */
    page: number;
    /** Number of items per page */
    limit: number;
    /** Total number of pages */
    totalPages: number;
    /** URL to the next page if available */
    nextPage?: string;
    /** URL to the previous page if available */
    prevPage?: string;
    /** Sorting information */
    sort?: {
        field: string;
        order: 'asc' | 'desc';
    };
}
/**
 * Standard error response format
 */
export interface ApiErrorResponse {
    /** Error message */
    message: string;
    /** Error code for programmatic handling */
    code?: string;
    /** HTTP status code */
    statusCode?: number;
    /** Additional error details */
    details?: Record<string, unknown>;
    /** Server timestamp */
    timestamp?: string;
    /** API path that caused the error */
    path?: string;
    /** Validation errors if any */
    errors?: Record<string, string[]>;
    /** Whether the request was retried */
    retried?: boolean;
}
/**
 * Request interceptor type
 */
export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
/**
 * Response interceptor type
 */
export type ResponseInterceptor<T = any> = (response: AxiosResponse<ApiResponse<T>>) => AxiosResponse<ApiResponse<T>> | Promise<AxiosResponse<ApiResponse<T>>>;
/**
 * Error interceptor type
 */
export type ErrorInterceptor = (error: AxiosError<ApiErrorResponse>) => Promise<never>;
