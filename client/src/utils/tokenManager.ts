import { jwtDecode } from 'jwt-decode';
import { NavigateFunction } from 'react-router-dom';
import { SecureCookie } from './cookies';
import config from '@/config/env';

// Constants
const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Extend Window interface to include __tokenManager
declare global {
  interface Window {
    __tokenManager?: TokenManager;
  }
}

// JWT Payload type
export interface JwtPayload {
  exp: number;
  iat: number;
  sub: string;
  [key: string]: unknown;
}

export interface DecodedToken {
  exp: number;
  iat: number;
  sub: string;
  type?: string;
  scope?: string;
}

// Show toast notification function
const showToast = (options: { 
  title: string; 
  description: string; 
  variant?: 'default' | 'destructive' 
}) => {
  // This is a placeholder - the actual implementation should be imported from your UI library
  console.log(`[Toast] ${options.title}: ${options.description}`);
};

export class TokenManager {
  private static instance: TokenManager | null = null;
  private accessToken: string | null = null;
  private tokenRefreshTimeout: NodeJS.Timeout | null = null;
  private refreshToken: string | null = null;
  private tokenRotationTimeout: NodeJS.Timeout | null = null;
  private refreshPromise: Promise<string | null> | null = null;
  private isRefreshing = false;
  private navigate: NavigateFunction | null = null;

  private constructor(navigate: NavigateFunction | null) {
    // Initialize instance variables
    this.navigate = navigate;
    this.refreshToken = SecureCookie.get(REFRESH_TOKEN_KEY) || null;
    this.accessToken = SecureCookie.get(TOKEN_KEY) || null;
    
    // Start token rotation if we have a refresh token
    if (this.refreshToken) {
      const decoded = this.getDecodedToken();
      if (decoded?.exp) {
        const expiresIn = (decoded.exp * 1000) - Date.now();
        this.startTokenRotation(expiresIn);
      }
    }
    
    // Store the instance in window for debugging
    if (typeof window !== 'undefined') {
      window.__tokenManager = this;
    }
    this.navigate = navigate;
    // Initialize with tokens from storage if available
    this.refreshToken = SecureCookie.get(REFRESH_TOKEN_KEY);
    
    // Start token rotation if we have a refresh token
    if (this.refreshToken) {
      this.startTokenRotation(config.TOKEN_ROTATION_INTERVAL);
    }
    
    // Store the instance in window for debugging
    if (typeof window !== 'undefined') {
      window.__tokenManager = this;
    }
  }

  public static getInstance(navigate?: NavigateFunction): TokenManager {
    if (!TokenManager.instance) {
      if (!navigate && typeof window !== 'undefined') {
        throw new Error('Navigate function is required for TokenManager initialization');
      }
      TokenManager.instance = new TokenManager(navigate || null);
    } else if (navigate && !TokenManager.instance.navigate) {
      // Update navigate function if a new one is provided
      TokenManager.instance.navigate = navigate;
    }
    return TokenManager.instance;
  }

  public static clearInstance(): void {
    TokenManager.instance = null;
  }

  public hasValidToken(): boolean {
    if (!this.accessToken) return false;
    try {
      const decoded: DecodedToken = jwtDecode(this.accessToken);
      const now = Date.now() / 1000;
      return decoded.exp > now;
    } catch (error) {
      return false;
    }
  }

  public getAccessToken(): string | null {
    return SecureCookie.get(TOKEN_KEY);
  }

  public getRefreshToken(): string | null {
    return this.refreshToken;
  }
  
  public isAuthenticated(): boolean {
    if (!this.accessToken) return false;
    try {
      const decoded = jwtDecode<{ exp: number }>(this.accessToken);
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp > now;
    } catch (error) {
      return false;
    }
  }
  
  public getTokenExpiration(): number | null {
    if (!this.accessToken) return null;
    const decoded = this.decodeToken(this.accessToken);
    return decoded ? decoded.exp * 1000 : null; // Convert to milliseconds
  }

  public setTokens(accessToken: string, refreshToken: string): void {
    try {
      // Store tokens in memory
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      
      // Store tokens in cookies
      SecureCookie.set(TOKEN_KEY, accessToken, {
        secure: config.SECURE_COOKIE_OPTIONS.secure,
        sameSite: config.SECURE_COOKIE_OPTIONS.sameSite,
        maxAge: config.SESSION_TIMEOUT / 1000, // Convert to seconds
      });
      
      SecureCookie.set(REFRESH_TOKEN_KEY, refreshToken, {
        secure: config.SECURE_COOKIE_OPTIONS.secure,
        sameSite: config.SECURE_COOKIE_OPTIONS.sameSite,
        maxAge: config.SESSION_TIMEOUT / 1000, // Convert to seconds
      });
      
      // Start token rotation
      const decoded = jwtDecode<JwtPayload>(accessToken);
      const expiresIn = (decoded.exp - Math.floor(Date.now() / 1000)) * 1000;
      this.startTokenRotation(expiresIn);
    } catch (error) {
      console.error('Error setting tokens:', error);
      this.clearTokens();
      throw error;
    }
  }

  public destroyTokens(): void {
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
    }
    if (this.tokenRotationTimeout) {
      clearTimeout(this.tokenRotationTimeout);
    }
    this.accessToken = null;
    this.refreshToken = null;
    this.isRefreshing = false;
    this.refreshPromise = null;
    this.clearStoredTokens();
  }

  public async refreshTokens(): Promise<string | null> {
    if (!this.refreshToken) {
      return null;
    }

    // If already refreshing, return the existing promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    
    try {
      // Import api dynamically to avoid circular dependency
      const { default: apiClient } = await import('@/services/api/apiClient');
      
      this.refreshPromise = apiClient
      .post<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
        refreshToken: this.refreshToken,
      })
      .then((response) => {
        this.setTokens(response.accessToken, response.refreshToken);
        return response.accessToken;
      })
        .catch((error) => {
          this.handleTokenError(error, 'Failed to refresh token');
          throw error;
        })
        .finally(() => {
          this.isRefreshing = false;
          this.refreshPromise = null;
        });

      return this.refreshPromise;
    } catch (error) {
      this.isRefreshing = false;
      this.refreshPromise = null;
      throw error;
    }
  }

  // Handle token-related errors
  private handleTokenError(error: unknown, message: string = 'Authentication error'): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${message}:`, errorMessage);
    this.clearTokens();
    
    // Only navigate if we have a navigation function
    if (this.navigate) {
      try {
        this.navigate('/login');
      } catch (navError) {
        console.error('Navigation error:', navError);
      }
    }
    
    // Show error to user
    if (typeof window !== 'undefined') {
      showToast({
        title: 'Session Expired',
        description: 'Your session has expired. Please log in again.',
        variant: 'destructive',
      });
    }
  }

  public clearTokens(): void {
    this.refreshToken = null;
    this.stopTokenRotation();
    
    // Clear tokens from storage
    SecureCookie.remove(TOKEN_KEY, {
      path: '/',
      secure: config.SECURE_COOKIE_OPTIONS.secure,
      sameSite: config.SECURE_COOKIE_OPTIONS.sameSite
    });
    
    SecureCookie.remove(REFRESH_TOKEN_KEY, {
      path: '/',
      secure: config.SECURE_COOKIE_OPTIONS.secure,
      sameSite: config.SECURE_COOKIE_OPTIONS.sameSite
    });
    
    // Clear from localStorage/sessionStorage if they were used as fallback
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_KEY);
      window.sessionStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
      window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }

  private clearStoredTokens(): void {
    // Clear from cookies
    SecureCookie.remove(TOKEN_KEY);
    SecureCookie.remove(REFRESH_TOKEN_KEY);
    
    // Clear from localStorage/sessionStorage if they were used as fallback
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_KEY);
      window.sessionStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
      window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }

  public getTokenState(): {
    accessToken: string | null;
    refreshToken: string | null;
    isValid: boolean;
    expiresIn: number;
  } {
    const expiresIn = this.getTokenExpiration() ? this.getTokenExpiration()! - Date.now() : 0;
    
    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      isValid: this.isAuthenticated(),
      expiresIn
    };
  }

  public isTokenValid(): boolean {
    return this.isAuthenticated();
  }

  public getDecodedToken(): DecodedToken | null {
    if (!this.accessToken) return null;
    try {
      return jwtDecode<DecodedToken>(this.accessToken);
    } catch (error) {
      return null;
    }
  }

  public getTokenType(): string {
    const decoded = this.getDecodedToken();
    return decoded ? decoded.type || 'access' : 'unknown';
  }

  public getTokenScope(): string[] {
    const decoded = this.getDecodedToken();
    return decoded ? (decoded.scope || '').split(' ') : [];
  }

  // Start token rotation
  private startTokenRotation(expiresIn: number): void {
    this.stopTokenRotation();
    
    // Calculate rotation time (rotate before expiration)
    const rotationTime = Math.max(
      expiresIn - config.REFRESH_TOKEN_THRESHOLD,
      config.TOKEN_REFRESH_INTERVAL
    );
    
    this.tokenRotationTimeout = setTimeout(() => {
      this.rotateToken().catch(error => {
        console.error('Token rotation error:', error);
        this.handleTokenError(error, 'Token rotation failed');
      });
    }, rotationTime);
  }

  // Stop token rotation
  private stopTokenRotation(): void {
    if (this.tokenRotationTimeout) {
      clearTimeout(this.tokenRotationTimeout);
      this.tokenRotationTimeout = null;
    }
    
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
      this.tokenRefreshTimeout = null;
    }
    
    this.isRefreshing = false;
    this.refreshPromise = null;
  }
  
  // Rotate the access token using the refresh token
  private async rotateToken(): Promise<void> {
    if (!this.refreshToken || this.isRefreshing) {
      return;
    }
    
    this.isRefreshing = true;
    
    try {
      // Import the API client dynamically to avoid circular dependencies
      const { default: api } = await import('@/services/api/apiClient');
      
      const response = await api.post<{ accessToken: string }>(
        '/auth/refresh',
        { refreshToken: this.refreshToken }
      );
      
      if (response?.accessToken) {
        this.setTokens(response.accessToken, this.refreshToken);
      } else {
        throw new Error('Invalid token response');
      }
    } catch (error) {
      console.error('Token rotation failed:', error);
      this.handleTokenError(error, 'Session expired');
    } finally {
      this.isRefreshing = false;
    }
  }

  // Clean up resources when the TokenManager is no longer needed
  public destroy(): void {
    this.stopTokenRotation();
    this.clearTokens();
    
    if (process.env.NODE_ENV === 'development') {
      delete window.__tokenManager;
    }
    
    TokenManager.instance = null;
  }
  
  private decodeToken(token: string): { exp: number } | null {
    try {
      return jwtDecode<{ exp: number }>(token);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  public getUserId(): string {
    const token = SecureCookie.get('access_token');
    if (!token) return '';

    try {
      const decoded = jwtDecode<{ sub: string }>(token);
      return decoded.sub;
    } catch (error) {
      return '';
    }
  }

}
