import { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ApiErrorResponse, RequestConfig } from '../types';
import { ApiError } from '../utils/error';

// Default retry configuration
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryOn: [408, 429, 500, 502, 503, 504],
  shouldRetry: (error: AxiosError) => {
    // Don't retry if it's a cancellation or a request that doesn't exist
    if (error.code === 'ECONNABORTED' || !error.config) {
      return false;
    }
    
    // Don't retry if retry is explicitly disabled
    const config = error.config as RequestConfig;
    if (config.retry === 0) {
      return false;
    }
    
    // Retry network errors and 5xx/429 responses
    return (
      !error.response ||
      (error.response.status >= 500 && error.response.status <= 599) ||
      error.response.status === 429 ||
      error.response.status === 408
    );
  },
};

/**
 * Retry interceptor to handle request retries with exponential backoff
 */
export class RetryInterceptor {
  private defaultConfig: typeof DEFAULT_RETRY_CONFIG;

  constructor(config: Partial<typeof DEFAULT_RETRY_CONFIG> = {}) {
    this.defaultConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Request interceptor to add retry config
   */
  public onRequest = (config: AxiosRequestConfig & RequestConfig): AxiosRequestConfig => {
    // Initialize retry config if not provided
    if (config.retry === undefined) {
      config.retry = this.defaultConfig.maxRetries;
    }
    
    if (config.retryDelay === undefined) {
      config.retryDelay = this.defaultConfig.retryDelay;
    }
    
    return config;
  };

  /**
   * Response error interceptor to handle retries
   */
  public onResponseError = async (error: AxiosError): Promise<AxiosResponse> => {
    const config = error.config as RequestConfig & { _retryCount?: number };
    
    // Initialize retry count if not set
    if (config._retryCount === undefined) {
      config._retryCount = 0;
    }

      // Check if we should retry the request
    if (!this.shouldRetry({ error, config })) {
      return Promise.reject(ApiError.fromAxiosError(error as AxiosError<ApiErrorResponse, any>));
    }

    // Calculate delay with exponential backoff
    const delay = this.calculateRetryDelay(config);
    
    // Increment retry count
    config._retryCount++;
    
    // Return a promise that resolves after the delay
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Retrying request (${config._retryCount}/${config.retry}) to ${config.url}`);
        resolve(this.retryRequest(config));
      }, delay);
    });
  };

  /**
   * Check if a request should be retried
   */
  private shouldRetry = (params: { error: AxiosError; config: RequestConfig & { _retryCount?: number } }): boolean => {
    const { error, config } = params;
    
    // Don't retry if retry is explicitly disabled
    if (config.retry === 0) {
      return false;
    }
    
    // Check if we've exceeded max retries
    if (config._retryCount && config.retry && config._retryCount >= config.retry) {
      return false;
    }
    
    // Use the default shouldRetry function from config
    return this.defaultConfig.shouldRetry(error);
  };

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(config: RequestConfig & { _retryCount?: number }): number {
    if (!config._retryCount) return 0;
    
    const baseDelay = config.retryDelay || this.defaultConfig.retryDelay;
    const backoff = Math.pow(2, config._retryCount - 1) * baseDelay;
    const jitter = Math.random() * baseDelay;
    
    return Math.min(backoff + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Retry a request with the given config
   */
  private async retryRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
    // Create a new axios instance to avoid mutating the original config
    const axios = (await import('axios')).default;
    return axios(config);
  }
}
