import type { 
  AxiosRequestConfig, 
  AxiosResponse, 
  InternalAxiosRequestConfig,
  AxiosError,
  AxiosInstance
} from 'axios';
import { TokenManager } from '@/utils/tokenManager';
import { SecureCookie } from '@/utils/cookies';

// Extended request config with our custom options
declare module 'axios' {
  interface AxiosRequestConfig {
    _retry?: boolean;
    skipAuth?: boolean;
    skipCsrf?: boolean;
  }
}

type AuthRequestConfig = AxiosRequestConfig & {
  _retry?: boolean;
  skipAuth?: boolean;
  skipCsrf?: boolean;
};

// Using shared AuthTokens type instead of local interface

// Token refresh callback type
type TokenRefreshCallback = (token: string) => void;

/**
 * Auth interceptor to handle JWT token management and refresh flow
 */
export class AuthInterceptor {
  private isRefreshing = false;
  private refreshSubscribers: TokenRefreshCallback[] = [];
  private tokenManager: TokenManager;
  private axiosInstance: AxiosInstance | null = null;

  /**
   * Set the axios instance for making requests during token refresh
   */
  public setAxiosInstance(axiosInstance: AxiosInstance): void {
    this.axiosInstance = axiosInstance;
  }

  constructor() {
    // Initialize with a no-op navigate function since we'll handle navigation in handleAuthFailure
    const noopNavigate = () => {};
    this.tokenManager = TokenManager.getInstance(noopNavigate);
  }
  /**
   * Request interceptor to add auth token and handle CSRF protection
   */
  public onRequest = (
    config: InternalAxiosRequestConfig & AuthRequestConfig
  ): InternalAxiosRequestConfig => {
    // Create a new config object to avoid mutating the original
    const newConfig = { ...config };
    
    // Skip auth if explicitly requested
    if (newConfig.skipAuth) {
      return newConfig;
    }

    // Initialize headers if they don't exist
    const headers = newConfig.headers || {};
    
    // Get the current access token
    const accessToken = this.tokenManager.getAccessToken();
    
    // Add auth header if token exists
    if (accessToken) {
      // Use bracket notation to safely set the header
      (headers as Record<string, unknown>)['Authorization'] = `Bearer ${accessToken}`;
    }

    // Add CSRF token if required and available
    if (!newConfig.skipCsrf) {
      const csrfToken = SecureCookie.get('X-CSRF-Token');
      if (csrfToken) {
        (headers as Record<string, unknown>)['X-CSRF-Token'] = csrfToken;
      }
    }
    
    // Assign the headers back to the config
    newConfig.headers = headers;

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
  public onResponseError = async (error: unknown): Promise<AxiosResponse> => {
    // Skip if not an axios error or no config
    if (!isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }

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
        this.refreshSubscribers.push(async (token: string) => {
          try {
            const newConfig = {
              ...originalRequest,
              headers: {
                ...originalRequest.headers,
                Authorization: `Bearer ${token}`
              },
              _retry: true
            };
            const response = await this.makeRequest(newConfig);
            resolve(response);
          } catch (err) {
            reject(err);
          }
        });
      });
    }

    // Mark that we're refreshing the token
    this.isRefreshing = true;
    
    try {
      // Get a new token using the refresh token
      const newToken = await this.tokenManager.refreshTokens();
      
      if (!newToken) {
        throw new Error('Failed to refresh token: No token received');
      }

      // Process any queued requests with the new token
      this.onTokenRefreshed(newToken);

      // Update the authorization header for the original request
      const newConfig = {
        ...originalRequest,
        headers: {
          ...originalRequest.headers,
          Authorization: `Bearer ${newToken}`
        },
        _retry: true
      };

      // Retry the original request
      return this.makeRequest(newConfig);
    } catch (error) {
      // Clear tokens on refresh failure
      this.tokenManager.clearTokens();
      
      // Redirect to login or handle unauthorized state
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      
      return Promise.reject(error);
    } finally {
      this.isRefreshing = false;
    }
  };



  /**
   * Make a request with the given config
   */
  private async makeRequest(config: AuthRequestConfig): Promise<AxiosResponse> {
    if (!this.axiosInstance) {
      throw new Error('Axios instance not set. Call setAxiosInstance() first.');
    }
    return this.axiosInstance(config);
  }
}

/**
 * Type guard to check if an error is an AxiosError
 */
function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}
