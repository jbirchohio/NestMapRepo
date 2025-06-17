import { AxiosResponse } from 'axios';
import { RequestConfig, ApiResponse } from '../types';

// Request cache entry
interface RequestCacheEntry<T = any> {
  /** When the cache entry was created */
  timestamp: number;
  /** When the cache entry expires */
  expiresAt: number;
  /** Cached response data */
  data: T;
  /** ETag for conditional requests */
  etag?: string;
  /** Last-Modified header for conditional requests */
  lastModified?: string;
}

// Request deduplication map
const pendingRequests = new Map<string, Promise<AxiosResponse>>();

// Request cache (in-memory)
const requestCache = new Map<string, RequestCacheEntry>();

// Default cache TTL (5 minutes)
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/**
 * Generate a cache key from request config
 */
export const generateCacheKey = (config: RequestConfig): string => {
  if (config.cacheKey) return config.cacheKey;
  
  const { method = 'GET', url, params = {}, data } = config;
  const paramsStr = JSON.stringify(params);
  const dataStr = data ? JSON.stringify(data) : '';
  
  return `${method.toUpperCase()}:${url}?${paramsStr}:${dataStr}`;
};

/**
 * Get a cached response if available and not expired
 */
export const getCachedResponse = <T>(config: RequestConfig): T | null => {
  if (!config.useCache) return null;
  
  const cacheKey = generateCacheKey(config);
  const cached = requestCache.get(cacheKey);
  
  if (!cached) return null;
  
  const isExpired = Date.now() > cached.expiresAt;
  
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
  data: T,
  headers: Record<string, string> = {}
): void => {
  if (!config.useCache) return;
  
  const cacheKey = generateCacheKey(config);
  const cacheTTL = config.cacheTTL ?? DEFAULT_CACHE_TTL;
  
  requestCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + cacheTTL,
    etag: headers['etag'],
    lastModified: headers['last-modified']
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

/**
 * Create a cancel token for a request
 */
const cancelTokens = new Map<string, AbortController>();

export const createCancelToken = (requestId: string) => {
  // Cancel any existing request with the same ID
  cancelRequest(requestId);

  const controller = new AbortController();
  cancelTokens.set(requestId, controller);
  return {
    signal: controller.signal,
    cancel: (message = 'Request cancelled') => {
      controller.abort(message);
      cancelTokens.delete(requestId);
    }
  };
};

/**
 * Cancel an ongoing request
 */
export const cancelRequest = (requestId: string, message?: string): void => {
  const controller = cancelTokens.get(requestId);
  if (controller) {
    controller.abort(message);
    cancelTokens.delete(requestId);
  }
};

/**
 * Clear all pending requests
 */
export const clearPendingRequests = (message?: string): void => {
  cancelTokens.forEach((controller, requestId) => {
    controller.abort(message);
    cancelTokens.delete(requestId);
  });
};

/**
 * Handle request deduplication
 */
export const handleDeduplication = <T>(
  config: RequestConfig,
  requestFn: () => Promise<AxiosResponse<ApiResponse<T>>>
): Promise<AxiosResponse<ApiResponse<T>>> => {
  const requestKey = generateCacheKey(config);
  
  // If deduplication is enabled and we have a pending request with the same key,
  // return the existing promise instead of making a new request
  if (config.dedupe !== false && pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey)! as Promise<AxiosResponse<ApiResponse<T>>>;
  }
  
  // Create the request promise
  const requestPromise = requestFn().finally(() => {
    // Clean up the pending request when it's done
    if (pendingRequests.get(requestKey) === requestPromise) {
      pendingRequests.delete(requestKey);
    }
  });
  
  // Store the promise in the pending requests map
  if (config.dedupe !== false) {
    pendingRequests.set(requestKey, requestPromise);
  }
  
  return requestPromise;
};
