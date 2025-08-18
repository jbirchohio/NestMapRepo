/**
 * JWT-only Authentication System
 * Uses httpOnly cookies for secure token storage
 */

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  displayName?: string;
  fullName?: string;
  avatarUrl?: string;
}

interface AuthResponse {
  user: User;
  message: string;
}

class JWTAuth {
  private user: User | null = null;
  private isLoading: boolean = true;

  constructor() {
    // Check auth status on initialization
    this.checkAuthStatus();
  }

  private async checkAuthStatus() {
    try {
      const response = await fetch('/api/auth/user', {
        method: 'GET',
        credentials: 'include' // Important: include cookies
      });

      if (response.ok) {
        const user = await response.json();
        this.user = user;
      } else {
        this.user = null;
      }
    } catch (error) {
      this.user = null;
    } finally {
      this.isLoading = false;
      this.notifyListeners();
    }
  }

  async signIn(email: string, password: string): Promise<{ user: User | null; error: Error | null }> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important: include cookies
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data: AuthResponse = await response.json();
      this.user = data.user;
      this.notifyListeners();

      return { user: this.user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  async signUp(email: string, password: string, username: string): Promise<{ user: User | null; error: Error | null }> {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important: include cookies
        body: JSON.stringify({ email, password, username })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const data: AuthResponse = await response.json();
      this.user = data.user;
      this.notifyListeners();

      return { user: this.user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  async signOut(): Promise<void> {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include' // Important: include cookies
      });
      
      if (!response.ok) {
        console.error('Logout failed on server:', response.status);
      }
    } catch (error) {
      console.error('Logout request failed:', error);
      // Even if logout fails, clear local state
    } finally {
      this.user = null;
      this.notifyListeners();
    }
  }

  getUser(): User | null {
    return this.user;
  }

  // No longer expose token since it's in httpOnly cookie
  getToken(): string | null {
    // Return a placeholder to maintain backward compatibility
    // The actual token is in httpOnly cookie and sent automatically
    return this.user ? 'authenticated' : null;
  }

  isAuthenticated(): boolean {
    return this.user !== null;
  }

  getIsLoading(): boolean {
    return this.isLoading;
  }

  // Auth state change listeners
  private listeners: Array<(user: User | null) => void> = [];

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.listeners.push(callback);
    
    // Call immediately with current state if not loading
    if (!this.isLoading) {
      callback(this.user);
    }

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

  // For social login callbacks
  async handleSocialAuth(): Promise<User | null> {
    await this.checkAuthStatus();
    return this.user;
  }

  // Refresh user data
  async refreshUser(): Promise<void> {
    await this.checkAuthStatus();
  }

  // Set auth data directly (for social auth)
  setAuth(token: string, user: User): void {
    // Token is stored in httpOnly cookie by the server
    // We just need to update the user state
    this.user = user;
    this.isLoading = false;
    this.notifyListeners();
  }
}

export const jwtAuth = new JWTAuth();
export type { User };