import { apiClient } from './api/apiClient';
import type {
  LoginDto,
  RegisterDto,
  AuthResponse,
  UserResponse,
  AuthError,
  RefreshTokenDto
} from '@shared/types/auth/dto';
import { TokenManager } from '@/utils/tokenManager';

export class AuthService {
  private tokenManager: TokenManager;

  constructor() {
    this.tokenManager = TokenManager.getInstance();
  }

  /**
   * Login with email and password
   */
  async login(loginDto: LoginDto): Promise<UserResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', loginDto);
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      // Store tokens
      if (response.data?.tokens) {
        this.tokenManager.setTokens(response.data.tokens);
      }

      return response.data.user;
    } catch (error) {
      console.error('Login failed:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<UserResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', registerDto);
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      // Store tokens
      if (response.data?.tokens) {
        this.tokenManager.setTokens(response.data.tokens);
      }

      return response.data.user;
    } catch (error) {
      console.error('Registration failed:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    try {
      // Call the logout endpoint
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
      // Continue with local cleanup even if the server request fails
    } finally {
      // Clear local tokens and session data
      this.tokenManager.clearTokens();
    }
  }

  /**
   * Refresh the access token
   */
  async refreshToken(): Promise<void> {
    try {
      const refreshToken = this.tokenManager.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post<AuthResponse>('/auth/refresh-token', {
        refreshToken
      } as RefreshTokenDto);

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Update stored tokens
      if (response.data?.tokens) {
        this.tokenManager.setTokens(response.data.tokens);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Get the current user's profile
   */
  async getCurrentUser(): Promise<UserResponse | null> {
    try {
      const response = await apiClient.get<{ user: UserResponse }>('/auth/me');
      return response.data?.user || null;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    
    if (typeof error === 'object' && error !== null) {
      const authError = error as { message?: string; error?: string };
      if (authError.message) {
        return new Error(authError.message);
      }
      if (authError.error) {
        return new Error(authError.error);
      }
    }
    
    return new Error('An unknown authentication error occurred');
  }
}

// Create and export a singleton instance
export const authService = new AuthService();

export type { AuthError } from '@shared/types/auth/dto';
