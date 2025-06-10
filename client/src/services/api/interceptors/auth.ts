import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { getAuthToken, refreshAuthToken } from '@/lib/auth';
import { RequestConfig } from '../types';
import { ApiError } from '../utils/error';

/**
 * Auth interceptor to handle token management
 */
export class AuthInterceptor {
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];
  private authToken: string | null = null;

  /**
   * Get the current auth token
   */
  private getAuthToken(): string | null {
    if (!this.authToken) {
      this.authToken = getAuthToken();
    }
    return this.authToken;
  }

  /**
   * Set the auth token
   */
  public setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  /**
   * Request interceptor to add auth token
   */
  public onRequest = (config: AxiosRequestConfig & RequestConfig): AxiosRequestConfig => {
    // Skip auth if explicitly requested
    if (config.skipAuth) {
      return config;
    }

    const token = this.getAuthToken();
    
    // Add auth header if token exists
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  };

  /**
   * Response interceptor to handle 401 errors and token refresh
   */
  public onResponseError = async (error: any): Promise<any> => {
    const originalRequest = error.config as AxiosRequestConfig & RequestConfig & { _retry?: boolean };
    
    // If it's not a 401 or we've already retried, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If we're already refreshing the token, add this request to the queue
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.refreshSubscribers.push((token: string) => {
          // Update the auth header and retry the request
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(this.retryRequest(originalRequest));
        });
      });
    }

    // Mark that we're refreshing the token
    originalRequest._retry = true;
    this.isRefreshing = true;

    try {
      // Try to refresh the token
      const newToken = await refreshAuthToken();
      
      if (!newToken) {
        throw new Error('Failed to refresh token');
      }

      // Update the auth token
      this.setAuthToken(newToken);
      
      // Update the original request with the new token
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newToken}`;

      // Notify all subscribers with the new token
      this.notifySubscribers(newToken);
      
      // Retry the original request
      return this.retryRequest(originalRequest);
    } catch (refreshError) {
      // Clear auth state and notify subscribers of failure
      this.authToken = null;
      this.notifySubscribers(null);
      
      // Reject with the original error
      return Promise.reject(error);
    } finally {
      this.isRefreshing = false;
    }
  };

  /**
   * Notify all subscribers with the new token
   */
  private notifySubscribers(token: string | null): void {
    if (token) {
      this.refreshSubscribers.forEach(callback => callback(token));
    } else {
      // If token is null, clear all subscribers
      this.refreshSubscribers = [];
    }
  }

  /**
   * Retry a request with the given config
   */
  private async retryRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
    // Create a new axios instance to avoid mutating the original config
    const axios = (await import('axios')).default;
    return axios({
      ...config,
      // Clear the retry flag
      _retry: false
    });
  }
}
