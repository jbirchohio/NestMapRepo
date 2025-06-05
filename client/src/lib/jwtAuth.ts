/**
 * JWT-only Authentication System
 * Replaces Supabase authentication with custom JWT tokens
 */

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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data: AuthResponse = await response.json();
      
      this.token = data.token;
      this.user = data.user;
      
      localStorage.setItem('auth_token', this.token);
      
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
        body: JSON.stringify({ email, password, username })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const data: AuthResponse = await response.json();
      
      this.token = data.token;
      this.user = data.user;
      
      localStorage.setItem('auth_token', this.token);
      
      return { user: this.user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  signOut(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
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
    this.user = user;
    this.token = token;
    this.notifyListeners();
  }
}

export const jwtAuth = new JWTAuth();
export type { User };