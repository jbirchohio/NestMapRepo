import type { AxiosResponse } from 'axios';
import type { RequestConfig, ApiResponse } from '@shared/types/api';

// Request cache entry
interface RequestCacheEntry<T = any> {
  /** When the cache entry was created */
  timestamp: number;
  /** When the cache entry expires */
  expiresAt: number;
  /** Cached response data */
  data: T;
}

// Request cache (in-memory)
const requestCache = new Map<string, RequestCacheEntry>();

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
 * Cache a response
 */
export const cacheResponse = <T>(
  config: RequestConfig,
  data: T,
  headers: Record<string, string> = {}
): void => {
  if (!config.useCache) return;
  
  const cacheKey = generateCacheKey(config);
  const cacheTTL = config.cacheTTL ?? 5 * 60 * 1000; // 5 minutes default
  
  requestCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + cacheTTL,
  });
};

/**
 * Cancel an ongoing request
 */
const cancelTokens = new Map<string, AbortController>();
export const cancelRequest = (requestId: string, message?: string): void => {
  const controller = cancelTokens.get(requestId);
  if (controller) {
    controller.abort(message);
    cancelTokens.delete(requestId);
  }
};

/**
 * Create a cancel token for a request
 */
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
    },
  };
};
