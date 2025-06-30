import { ApiClient } from '@shared/schema/api';
import { useAuth } from '@/state/contexts/AuthContext';
import type { ApiConfig, ApiClientOptions } from './types';

/**
 * Client-side API client that extends the base ApiClient
 */
export class ClientApiClient extends ApiClient {
  private refreshPromise: Promise<string | null> | null = null;

  constructor(options: ApiClientOptions) {
    super({
      baseURL: options.baseURL,
      timeout: options.timeout ?? 30000, // 30s default timeout
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Add request interceptor for auth
    this.instance.interceptors.request.use(
      (config) => {
        // Skip auth if explicitly disabled
        if ((config as ApiConfig).auth === false) {
          return config;
        }

        // Add auth token if available
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for token refresh
    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If the error is 401 and we haven't already tried to refresh
        if (error.response?.status === 401 && 
            !originalRequest._retry && 
            (originalRequest as ApiConfig).retryOnAuthFailure !== false) {
          
          originalRequest._retry = true;
          
          try {
            // Only make one refresh request at a time
            this.refreshPromise = this.refreshPromise || this.refreshToken();
            const newToken = await this.refreshPromise;
            this.refreshPromise = null;
            
            if (newToken) {
              // Update the auth header and retry the original request
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.instance(originalRequest);
            }
          } catch (refreshError) {
            // If refresh fails, clear auth and notify
            this.clearAuth();
            if (options.onUnauthenticated) {
              options.onUnauthenticated();
            }
            return Promise.reject(refreshError);
          }
          
          // If we get here, token refresh failed
          this.clearAuth();
          if (options.onUnauthenticated) {
            options.onUnauthenticated();
          }
        }
        
        // For other errors, pass through
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get the current auth token
   */
  protected getAuthToken(): string | null {
    try {
      // First try to get from auth state
      const auth = useAuth.getState();
      if (auth.token) {
        return auth.token;
      }
      
      // Fall back to localStorage
      return localStorage.getItem('auth_token');
    } catch (error) {
      console.warn('Failed to get auth token:', error);
      return null;
    }
  }

  /**
   * Set the auth token
   */
  protected setAuthToken(token: string): void {
    try {
      // Update auth state
      const auth = useAuth.getState();
      auth.setToken(token);
      
      // Also store in localStorage for persistence
      localStorage.setItem('auth_token', token);
    } catch (error) {
      console.warn('Failed to set auth token:', error);
    }
  }

  /**
   * Clear auth state
   */
  private clearAuth(): void {
    try {
      const auth = useAuth.getState();
      auth.logout();
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    } catch (error) {
      console.warn('Failed to clear auth:', error);
    }
  }

  /**
   * Refresh the auth token
   */
  protected async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.post<{ accessToken: string }>('/auth/refresh', { refreshToken });
      if (response.data?.accessToken) {
        this.setAuthToken(response.data.accessToken);
        return response.data.accessToken;
      }
      
      throw new Error('Invalid refresh response');
    } catch (error) {
      console.error('Failed to refresh token:', error);
      this.clearAuth();
      return null;
    }
  }
}

// Create a singleton instance of the API client
export const apiClient = new ClientApiClient({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  onUnauthenticated: () => {
    const auth = useAuth.getState();
    if (auth.isAuthenticated) {
      auth.logout();
    }
  },
  onError: (error) => {
    console.error('API Error:', error);
  },
});
