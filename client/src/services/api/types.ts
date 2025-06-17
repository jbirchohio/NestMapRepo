import { AxiosRequestConfig, AxiosResponse, CancelToken } from 'axios';

/**
 * Extended request configuration with our custom options
 */
export interface RequestConfig<D = any> extends Omit<AxiosRequestConfig<D>, 'cancelToken'> {
  /** Skip authentication for this request */
  skipAuth?: boolean;
  /** Skip global error handling for this request */
  skipErrorHandling?: boolean;
  /** Enable response caching */
  useCache?: boolean;
  /** Custom cache key (defaults to URL + method + params) */
  cacheKey?: string;
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTTL?: number;
  /** Enable request deduplication (default: true) */
  dedupe?: boolean;
  /** Abort controller signal for request cancellation */
  signal?: AbortSignal;
  /** Unique ID for request cancellation */
  requestId?: string;
  /** Number of retry attempts */
  retry?: number;
  /** Delay in milliseconds between retries */
  retryDelay?: number;
}

/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  timestamp?: string;
}

/**
 * Paginated response format
 */
export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Standard error response format
 */
export interface ApiErrorResponse {
  message: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
  timestamp?: string;
  path?: string;
}

/**
 * Request cache entry
 */
interface RequestCacheEntry<T = any> {
  timestamp: number;
  data: T;
}

// Request cache (in-memory)
const requestCache = new Map<string, RequestCacheEntry>();

// Default cache TTL (5 minutes)
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/**
 * Generate a cache key from request config
 */
export const getCacheKey = (config: RequestConfig): string => {
  if (config.cacheKey) return config.cacheKey;
  
  const { method, url, params, data } = config;
  return `${method?.toUpperCase()}:${url}?${JSON.stringify(params)}:${JSON.stringify(data)}`;
};

/**
 * Get a cached response if available and not expired
 */
export const getCachedResponse = <T>(config: RequestConfig): T | null => {
  if (!config.useCache) return null;
  
  const cacheKey = getCacheKey(config);
  const cached = requestCache.get(cacheKey);
  
  if (!cached) return null;
  
  const cacheTTL = config.cacheTTL ?? DEFAULT_CACHE_TTL;
  const isExpired = Date.now() - cached.timestamp > cacheTTL;
  
  if (isExpired) {
    requestCache.delete(cacheKey);
    return null;
  }
  
  return cached.data as T;
};

/**
 * Cache a response
 */
export const cacheResponse = <T>(
  config: RequestConfig,
  data: T
): void => {
  if (!config.useCache) return;
  
  const cacheKey = getCacheKey(config);
  requestCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
};

/**
 * Clear the request cache
 */
export const clearCache = (key?: string): void => {
  if (key) {
    requestCache.delete(key);
  } else {
    requestCache.clear();
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => ({
  size: requestCache.size,
  keys: Array.from(requestCache.keys())
});
