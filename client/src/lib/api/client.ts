import { ApiClient, type ApiConfig } from '@shared/api';
import { useAuth } from '@/state/contexts/AuthContext';

/**
 * Client-side API client that extends the base ApiClient
 */
export class ClientApiClient extends ApiClient {
  constructor() {
    super({
      baseURL: import.meta.env.VITE_API_URL || '/api',
      onUnauthenticated: () => {
        // Handle unauthenticated requests (e.g., redirect to login)
        const auth = useAuth.getState();
        if (auth.isAuthenticated) {
          auth.logout();
        }
      },
      onError: (error) => {
        // Global error handler
        console.error('API Error:', error);
      },
    });
  }

  protected override getAuthToken(): string | null {
    // Get token from auth state or local storage
    const auth = useAuth.getState();
    return auth.token || localStorage.getItem('auth_token');
  }

  protected override setAuthToken(token: string): void {
    // Store token in auth state and local storage
    const auth = useAuth.getState();
    auth.setToken(token);
    localStorage.setItem('auth_token', token);
  }

  protected override async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return null;

      const response = await this.post<{ accessToken: string }>('/auth/refresh', { refreshToken });
      if (response.accessToken) {
        this.setAuthToken(response.accessToken);
        return response.accessToken;
      }
      return null;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }
}

// Create a singleton instance of the API client
export const apiClient = new ClientApiClient();
