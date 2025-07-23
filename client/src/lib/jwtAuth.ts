/**
 * JWT-only Authentication System
 * Uses the API client for authentication requests
 */
import { getApiClient } from '../services/api/apiClient';

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  organization_id: number;
}

interface AuthResponse {
  user: User;
  token: string;
}

class JWTAuth {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
    if (this.token) {
      this.loadUserFromToken();
    }
  }

  private loadUserFromToken() {
    if (!this.token) return;
    
    try {
      // Decode JWT payload (basic decode without verification - server will verify)
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      this.user = {
        id: payload.id,
        email: payload.email,
        username: payload.username,
        role: payload.role,
        organization_id: payload.organization_id
      };
    } catch (error) {
      console.warn('Failed to decode token:', error);
      this.signOut();
    }
  }

  async signIn(email: string, password: string): Promise<{ user: User | null; error: Error | null }> {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const apiClient = getApiClient();
      const response = await apiClient.post<AuthResponse>('/auth/login', {
        email: email.trim(),
        password: password.trim()
      });
      
      // The response data should already be typed as AuthResponse
      const authData = response;
      
      if (!authData || !authData.token || !authData.user) {
        throw new Error('Invalid authentication response format');
      }
      
      // Validate token format
      const tokenParts = authData.token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      // Update auth state
      this.token = authData.token;
      this.user = authData.user;
      
      // Store token securely
      if (this.token) {
        localStorage.setItem('auth_token', this.token);
      }
      
      // Update application state and notify listeners
      this.updateAuthState(this.user, this.token);
      
      return { user: this.user, error: null };
      
    } catch (error) {
      // Clear any partial auth state on error
      this.signOut();
      
      // Normalize error response
      const normalizedError = error instanceof Error 
        ? error 
        : new Error('Login failed. Please try again.');
        
      return { 
        user: null, 
        error: normalizedError
      };
    }
  }

  async signUp(email: string, password: string, username: string): Promise<{ user: User | null; error: Error | null }> {
    try {
      const apiClient = getApiClient();
      const response = await apiClient.post<{ data: AuthResponse }>('/auth/register', {
        email,
        password,
        username
      });
      
      const responseData = response.data;
      if (!responseData) {
        throw new Error('No response data received');
      }
      
      // The actual response structure from the API
      const authData = (responseData as any).data || responseData;
      if (!authData.token || !authData.user) {
        throw new Error('Invalid response format from server');
      }
      
      this.token = authData.token;
      this.user = authData.user;
      
      if (this.token) {
        localStorage.setItem('auth_token', this.token);
        this.updateAuthState(this.user, this.token);
      }
      
      return { user: this.user, error: null };
    } catch (error) {
      this.updateAuthState(null, null);
      return { 
        user: null, 
        error: error instanceof Error ? error : new Error('Registration failed') 
      };
    }
  }

  signOut(): void {
    // Clear all auth-related data
    this.token = null;
    this.user = null;
    
    // Remove token from storage
    localStorage.removeItem('auth_token');
    
    // Notify listeners and update state
    this.updateAuthState(null, null);
    
    // Clear any pending requests
    // Note: This would require access to the API client's cancelSources
    // which should be implemented in the API client
  }

  getUser(): User | null {
    return this.user;
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return this.token !== null && this.user !== null;
  }

  // Auth state change listeners
  private listeners: Array<(user: User | null) => void> = [];

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.user));
  }

  // Update internal state and notify listeners
  private updateAuthState(user: User | null, token: string | null) {
    // Only update if state has actually changed
    if (this.user !== user || this.token !== token) {
      this.user = user;
      this.token = token;
      
      // Update axios default headers if needed
      // This would be handled by the API client's interceptor
      
      // Notify all listeners
      this.notifyListeners();
      
      // Additional cleanup if logging out
      if (!token) {
        // Clear any cached data or perform other cleanup
      }
    }
  }
}

// Create and export a single instance
const jwtAuth = new JWTAuth();
export { jwtAuth };

export type { User };
