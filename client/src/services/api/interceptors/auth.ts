import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { TokenManager } from '@/utils/tokenManager';
import { SessionSecurity } from '@/utils/sessionSecurity';
import type { AuthTokens } from '@shared/types/auth/dto/index.js';

// Extended request config with our custom options
export interface AuthRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  skipAuth?: boolean;
  skipCsrf?: boolean;
}

// Token refresh callback type
type TokenRefreshCallback = (token: string) => void;

/**
 * Auth interceptor to handle JWT token management and refresh flow
 */
export class AuthInterceptor {
  private isRefreshing = false;
  private refreshSubscribers: TokenRefreshCallback[] = [];
  private tokenManager: TokenManager;
  private sessionSecurity: SessionSecurity;

  constructor() {
    this.tokenManager = TokenManager.getInstance();
    this.sessionSecurity = SessionSecurity.getInstance();
  }
  /**
   * Request interceptor to add auth token
   */
  public onRequest = (
    config: InternalAxiosRequestConfig & AuthRequestConfig
  ): InternalAxiosRequestConfig => {
    // Skip auth if explicitly requested
    if (config.skipAuth) {
      return config;
    }

    // Get the current access token
    const accessToken = this.tokenManager.getAccessToken();
    
    // Add auth header if token exists
    if (accessToken) {
      config.headers.set('Authorization', `Bearer ${accessToken}`);
    }

    // Add CSRF token if required and available
    if (!config.skipCsrf) {
      const csrfToken = this.sessionSecurity.getCSRFToken();
      if (csrfToken) {
        config.headers.set('X-CSRF-Token', csrfToken);
      }
    }

    return config;
  };
  /**
   * Queue requests during token refresh
   */
  private onTokenRefreshed = (token: string): void => {
    this.refreshSubscribers.forEach(callback => callback(token));
    this.refreshSubscribers = [];
  };

  /**
   * Response interceptor to handle 401 errors and token refresh
   */
  public onResponseError = async (error: any): Promise<any> => {
    const originalRequest = error.config as AuthRequestConfig;
    
    // Skip if request should skip auth
    if (originalRequest.skipAuth) {
      return Promise.reject(error);
    }

    // If it's not a 401 or we've already retried, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If we're already refreshing the token, queue the request
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.refreshSubscribers.push((token: string) => {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(this.axios(originalRequest));
        });
      });
    }

    // Mark that we're refreshing the token
    originalRequest._retry = true;
    this.isRefreshing = true;

    try {
      // Try to refresh the token
      const refreshToken = this.tokenManager.getRefreshToken();
      if (!refreshToken) {
        await this.handleAuthFailure();
        return Promise.reject(error);
      }

      const response = await this.tokenManager.refreshToken(refreshToken);
      
      if (!response) {
        await this.handleAuthFailure();
        return Promise.reject(new Error('Failed to refresh token'));
      }

      // Update the auth header and retry the original request
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
      
      // Process queued requests
      this.onTokenRefreshed(response.accessToken);
      
      // Retry the original request
      return this.axios(originalRequest);
    } catch (refreshError) {
      await this.handleAuthFailure();
      return Promise.reject(refreshError);
    } finally {
      this.isRefreshing = false;
    }
  };

  /**
   * Handle authentication failure (e.g., redirect to login)
   */
  private async handleAuthFailure(): Promise<void> {
    // Clear tokens and session data
    this.tokenManager.clearTokens();
    this.sessionSecurity.clearSession();
    
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
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
        }
        catch (refreshError) {
            // Clear auth state and notify subscribers of failure
            this.authToken = null;
            this.notifySubscribers(null);
            // Reject with the original error
            return Promise.reject(error);
        }
        finally {
            this.isRefreshing = false;
        }
    };
    /**
     * Notify all subscribers with the new token
     */
    private notifySubscribers(token: string | null): void {
        if (token) {
            this.refreshSubscribers.forEach(callback => callback(token));
        }
        else {
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
