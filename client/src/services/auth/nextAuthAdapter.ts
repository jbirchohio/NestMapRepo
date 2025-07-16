import { getApiClient } from '../api/apiClient';
import { jwtDecode } from 'jwt-decode';

// Define types for API responses
interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  organization_id: number;
  iat: number;
  exp: number;
}

// Mock NextAuth session structure
export interface Session {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: number;
    accessToken: string;
  };
  expires: string;
}

// Local storage keys
const SESSION_KEY = 'nextauth.session';
const TOKEN_KEY = 'nextauth.token';

/**
 * NextAuth adapter for Vite projects
 * This provides a compatible interface for NextAuth functions in a non-Next.js environment
 */
class NextAuthAdapter {
  private session: Session | null = null;
  private refreshTokenPromise: Promise<Session | null> | null = null;

  constructor() {
    // Initialize from localStorage if available
    this.loadSessionFromStorage();
  }

  /**
   * Get the current session
   */
  async getSession(): Promise<Session | null> {
    // If we have a valid session, return it
    if (this.isSessionValid()) {
      return this.session;
    }

    // If we're already refreshing, wait for that to complete
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    // Try to refresh the token
    return this.refreshSession();
  }

  /**
   * Sign in with credentials
   */
  async signIn(credentials: { email: string; password: string }): Promise<Session | null> {
    try {
      const apiClient = getApiClient();
      const response = await apiClient.post<AuthResponse>('/auth/login', {
        email: credentials.email,
        password: credentials.password
      });

      if (!response || !response.access_token) {
        return null;
      }

      const decoded = jwtDecode<JwtPayload>(response.access_token);
      
      const session: Session = {
        user: {
          id: decoded.sub,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role,
          organizationId: decoded.organization_id,
          accessToken: response.access_token
        },
        expires: new Date(decoded.exp * 1000).toISOString()
      };

      // Save tokens and session
      this.saveTokenToStorage(response.refresh_token);
      this.saveSessionToStorage(session);
      this.session = session;

      return session;
    } catch (error) {
      console.error('Sign in error:', error);
      return null;
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    // Clear session and tokens
    this.session = null;
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }

  /**
   * Check if the current session is valid
   */
  private isSessionValid(): boolean {
    if (!this.session) return false;
    
    const expiryDate = new Date(this.session.expires);
    return expiryDate > new Date();
  }

  /**
   * Refresh the session using the refresh token
   */
  private async refreshSession(): Promise<Session | null> {
    // Set the promise so concurrent calls wait for the result
    this.refreshTokenPromise = this.performRefresh();
    const result = await this.refreshTokenPromise;
    this.refreshTokenPromise = null;
    return result;
  }

  /**
   * Perform the actual refresh token operation
   */
  private async performRefresh(): Promise<Session | null> {
    try {
      const refreshToken = localStorage.getItem(TOKEN_KEY);
      if (!refreshToken) {
        return null;
      }

      const apiClient = getApiClient();
      const response = await apiClient.post<AuthResponse>('/auth/refresh', {
        refreshToken
      });

      if (!response || !response.access_token) {
        return null;
      }

      const decoded = jwtDecode<JwtPayload>(response.access_token);
      
      const session: Session = {
        user: {
          id: decoded.sub,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role,
          organizationId: decoded.organization_id,
          accessToken: response.access_token
        },
        expires: new Date(decoded.exp * 1000).toISOString()
      };

      // Save new tokens and session
      if (response.refresh_token) {
        this.saveTokenToStorage(response.refresh_token);
      }
      this.saveSessionToStorage(session);
      this.session = session;

      return session;
    } catch (error) {
      console.error('Refresh token error:', error);
      // If refresh fails, clear the session
      this.signOut();
      return null;
    }
  }

  /**
   * Load session from localStorage
   */
  private loadSessionFromStorage(): void {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY);
      if (sessionData) {
        this.session = JSON.parse(sessionData);
      }
    } catch (error) {
      console.error('Error loading session from storage:', error);
      this.session = null;
    }
  }

  /**
   * Save session to localStorage
   */
  private saveSessionToStorage(session: Session): void {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Error saving session to storage:', error);
    }
  }

  /**
   * Save refresh token to localStorage
   */
  private saveTokenToStorage(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving token to storage:', error);
    }
  }
}

// Create a singleton instance
const nextAuthAdapter = new NextAuthAdapter();
export default nextAuthAdapter;
