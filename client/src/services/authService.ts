import apiClient from './api/apiClient';
import type { AxiosError } from 'axios';
import type { 
  LoginDto, 
  RegisterDto,
  ResetPasswordDto,
} from '@shared/schema/types/auth/dto';
import type { AuthResponse } from '@shared/schema/types/auth/jwt';
import type { AuthUser } from '@shared/schema/types/auth/user';
import { AuthError, AuthErrorCode } from '@shared/schema/types/auth/auth';
import { TokenManager } from '@/utils/tokenManager';



/**
 * Type guard for AuthUser
 * Validates if an object matches the AuthUser interface
 */
const isAuthUser = (user: unknown): user is AuthUser => {
  if (typeof user !== 'object' || user === null) return false;
  const u = user as Record<string, unknown>;
  return (
    typeof u['id'] === 'string' &&
    typeof u['email'] === 'string' &&
    typeof u['role'] === 'string' &&
    ((u['organizationId'] === null || typeof u['organizationId'] === 'string') ||
      (u['organization_id'] === null || typeof u['organization_id'] === 'string'))
  );
};

export class AuthService {
  private tokenManager: TokenManager;

  constructor() {
    this.tokenManager = TokenManager.getInstance();
  }

  /**
   * Authenticates a user with email and password
   * @param credentials - Login credentials
   * @returns Authenticated user data or null if login fails
   * @throws {AuthError} When authentication fails
   */
  async login(credentials: LoginDto): Promise<AuthUser> {
    try {
      const response = await apiClient.post<AuthResponse>(
        '/auth/login',
        credentials,
        { skipAuth: true }
      );
      
      if (!response) {
        throw new AuthError(
          AuthErrorCode.VALIDATION_ERROR,
          'Invalid response format from server'
        );
      }
      
      const { user, tokens } = response.data.data;

      if (!user || !tokens) {
        throw new AuthError(
          AuthErrorCode.VALIDATION_ERROR,
          'Invalid response format from server'
        );
      }

      if (!isAuthUser(user)) {
        throw new AuthError(
          AuthErrorCode.VALIDATION_ERROR,
          'Invalid user data received from server'
        );
      }

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new AuthError(
          AuthErrorCode.INVALID_TOKEN,
          'Invalid tokens received from server'
        );
      }

      this.tokenManager.setTokens(tokens.access_token, tokens.refresh_token);
      return user;
    } catch (error) {
      console.error('Login failed:', error);
      if (error instanceof AuthError) {
        throw error;
      }
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as AxiosError<{ error?: { message?: string } }>;
        throw new AuthError(
          AuthErrorCode.INVALID_CREDENTIALS,
          axiosError.response?.data?.error?.message || 'Login failed. Please check your credentials and try again.'
        );
      }
      throw new AuthError(
        AuthErrorCode.UNKNOWN_ERROR,
        'An unexpected error occurred during login. Please try again.'
      );
    }
  }

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<AuthUser> {
    try {
      const response = await apiClient.post<AuthResponse>(
        '/auth/register',
        registerDto,
        { skipAuth: true }
      );
      
      if (!response?.data?.data) {
        throw new AuthError(
          AuthErrorCode.VALIDATION_ERROR,
          'Invalid response format from server'
        );
      }
      
      const { user, tokens } = response.data.data;

      if (!user || !tokens) {
        throw new AuthError(
          AuthErrorCode.VALIDATION_ERROR,
          'Invalid response format from server'
        );
      }

      if (!isAuthUser(user)) {
        throw new AuthError(
          AuthErrorCode.VALIDATION_ERROR,
          'Invalid user data received from server'
        );
      }

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new AuthError(
          AuthErrorCode.INVALID_TOKEN,
          'Invalid tokens received from server'
        );
      }

      this.tokenManager.setTokens(tokens.access_token, tokens.refresh_token);
      return user;
    } catch (error) {
      console.error('Registration failed:', error);
      
      if (error instanceof AuthError) {
        throw error;
      }

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as AxiosError<{ error?: { message?: string } }>;
        throw new AuthError(
          AuthErrorCode.VALIDATION_ERROR,
          axiosError.response?.data?.error?.message || 'Registration failed. Please check your information and try again.'
        );
      }
      
      throw new AuthError(
        AuthErrorCode.UNKNOWN_ERROR,
        'An unexpected error occurred during registration. Please try again.'
      );
    }
  }

  /**
   * Logs out the current user by revoking tokens and clearing local state
   * @param allDevices - If true, revokes all sessions for the user
   */
  async logout(allDevices: boolean = false): Promise<void> {
    try {
      // Try to revoke the refresh token on the server
      await apiClient.post(
        `/auth/logout${allDevices ? '-all' : ''}`,
        undefined,
        { skipAuth: true, withCredentials: true }
      );
    } catch (error) {
      console.error('Logout API error (proceeding with client cleanup):', error);
      // Continue with client-side cleanup even if server logout fails
    } finally {
      // Always clear tokens and reset state
      this.tokenManager.clearTokens();
    }
  }

  /**
   * Refreshes the access token using the refresh token
   * @returns New access token or null if refresh fails
   * @throws {AuthError} When token refresh fails
   */
  async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = this.tokenManager.getRefreshToken();
      if (!refreshToken) {
        throw new AuthError(
          AuthErrorCode.UNAUTHORIZED,
          'No refresh token available'
        );
      }

      const response = await apiClient.post<{ access_token: string }>(
        '/auth/refresh',
        { refresh_token: refreshToken },
        { skipAuth: true, withCredentials: true }
      );
      
      if (!response?.access_token) {
        throw new AuthError(
          AuthErrorCode.INVALID_TOKEN,
          'No access token received in refresh response'
        );
      }
      
      const { access_token } = response;

      if (!access_token) {
        throw new AuthError(
          AuthErrorCode.INVALID_TOKEN,
          'No access token received in refresh response'
        );
      }

      // Update the stored access token
      this.tokenManager.setTokens(access_token, refreshToken);
      return access_token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      
      // Clear tokens if refresh fails with token-related errors
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as AxiosError<{ error?: { code?: string } }>;
        const errorCode = axiosError.response?.data?.error?.code;
        
        if (errorCode === 'INVALID_TOKEN' || errorCode === 'EXPIRED_TOKEN') {
          this.tokenManager.clearTokens();
        }
        
        throw new AuthError(
          errorCode as AuthErrorCode || AuthErrorCode.UNAUTHORIZED,
          'Your session has expired. Please log in again.'
        );
      }
      
      if (error instanceof AuthError) {
        throw error;
      }
      
      throw new AuthError(
        AuthErrorCode.UNKNOWN_ERROR,
        'Failed to refresh authentication. Please log in again.'
      );
    }
  }

  /**
   * Get the current user's profile
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const response = await apiClient.get<{ user: AuthUser }>('/auth/me');
      
      if (!response?.user) {
        throw new AuthError(
          AuthErrorCode.USER_NOT_FOUND,
          'No user data found in response'
        );
      }

      const user = response.user;
      
      if (!isAuthUser(user)) {
        throw new AuthError(
          AuthErrorCode.VALIDATION_ERROR,
          'Invalid user data received from server'
        );
      }

      return user;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      
      // Clear tokens if unauthorized
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as AxiosError<{ error?: { code?: string } }>;
        const errorCode = axiosError.response?.status;
        
        if (errorCode === 401) {
          this.tokenManager.clearTokens();
          throw new AuthError(
            AuthErrorCode.UNAUTHORIZED,
            'Your session has expired. Please log in again.'
          );
        }
      }
      
      if (error instanceof AuthError) {
        throw error;
      }
      
      throw new AuthError(
        AuthErrorCode.UNKNOWN_ERROR,
        'Failed to fetch user profile. Please try again.'
      );
    }
  }



  /**
   * Request a password reset
   * @param email The user's email address
   * @param resetUrl Optional URL to include in the reset email
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        '/auth/request-password-reset',
        { email },
        { skipAuth: true }
      );
      
      if (!response?.success) {
        throw new AuthError(
          AuthErrorCode.UNKNOWN_ERROR,
          response.message || 'Failed to request password reset. Please try again.'
        );
      }
    } catch (error) {
      console.error('Password reset request failed:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as AxiosError<{ error?: { message?: string } }>;
        const errorMessage = axiosError.response?.data?.error?.message || 
                           axiosError.message || 
                           'Failed to request password reset. Please try again.';
        
        throw new AuthError(
          AuthErrorCode.UNKNOWN_ERROR,
          errorMessage
        );
      }
      
      if (error instanceof AuthError) {
        throw error;
      }
      
      throw new AuthError(
        AuthErrorCode.UNKNOWN_ERROR,
        'An unexpected error occurred. Please try again.'
      );
    }
  }

  /**
   * Reset password with token
   * @param resetPasswordDto The reset password data
   * @returns The authenticated user or null if not authenticated
   * @throws {AuthError} If password reset fails
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<AuthUser | null> {
    try {
      const response = await apiClient.put<{ 
        success: boolean; 
        message: string; 
        user?: AuthUser 
      }>(
        '/auth/reset-password',
        resetPasswordDto,
        { skipAuth: true }
      );
      
      if (!response) {
        throw new AuthError(
          AuthErrorCode.VALIDATION_ERROR,
          'Invalid response format from server'
        );
      }
      
      const { user } = response.data;

      if (!user) {
        throw new AuthError(
          AuthErrorCode.USER_NOT_FOUND,
          'No user data in reset password response'
        );
      }

      if (!isAuthUser(user)) {
        throw new AuthError(
          AuthErrorCode.VALIDATION_ERROR,
          'Invalid user data received from server'
        );
      }

      return user;
    } catch (error) {
      console.error('Password reset failed:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as AxiosError<{ error?: { message?: string; code?: string } }>;
        const errorCode = axiosError.response?.data?.error?.code as AuthErrorCode;
        
        throw new AuthError(
          errorCode || AuthErrorCode.UNKNOWN_ERROR,
          axiosError.response?.data?.error?.message || 
            'Failed to reset password. The link may have expired or is invalid.'
        );
      }
      
      if (error instanceof AuthError) {
        throw error;
      }
      
      throw new AuthError(
        AuthErrorCode.UNKNOWN_ERROR,
        'An unexpected error occurred while resetting your password. Please try again.'
      );
    }
  }

}

// Create and export a singleton instance
export const authService = new AuthService();

// Re-export types for convenience
export type { AuthError, AuthErrorCode } from '@shared/schema/types/auth/auth';
export type { AuthUser, AuthResponse } from '@shared/schema/types/auth';
export type { LoginDto, RegisterDto, RequestPasswordResetDto, ResetPasswordDto } from '@shared/schema/types/auth/dto';
