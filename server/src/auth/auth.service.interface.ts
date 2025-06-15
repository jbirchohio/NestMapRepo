/**
 * Auth Service Interface
 * Defines the contract for authentication service implementations
 */
import { UserRole } from '../types';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    organizationId?: string | null;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface IAuthService {
  /**
   * Authenticate a user and generate tokens
   */
  login(loginData: LoginRequest, ip: string, userAgent: string): Promise<LoginResponse>;

  /**
   * Refresh access token using a valid refresh token
   */
  refreshToken(data: RefreshTokenRequest, ip: string, userAgent: string): Promise<LoginResponse>;

  /**
   * Logout a user by revoking their tokens
   */
  logout(refreshToken: string, authHeader?: string): Promise<void>;

  /**
   * Revoke all sessions for a user
   */
  revokeAllSessions(userId: string): Promise<void>;

  /**
   * Request a password reset for a user
   */
  requestPasswordReset(email: string): Promise<void>;

  /**
   * Reset a user's password using a valid reset token
   */
  resetPassword(token: string, newPassword: string): Promise<void>;
}
