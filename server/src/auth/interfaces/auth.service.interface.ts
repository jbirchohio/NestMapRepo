import { UserRole } from '../jwt/types.js';

/**
 * Auth Service Interface
 * Defines the contract for authentication service implementations
 */

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
    firstName?: string | null;
    lastName?: string | null;
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
   * Validate user credentials
   */
  validateUser(email: string, password: string): Promise<{ 
    id: string; 
    email: string; 
    role: string;
    firstName?: string | null;
    lastName?: string | null;
    organizationId?: string | null;
  } | null>;

  /**
   * Generate new access and refresh tokens
   */
  generateTokens(
    user: { id: string; email: string; role: string; },
    ipAddress: string,
    userAgent?: string
  ): Promise<LoginResponse>;

  /**
   * Verify a JWT token
   */
  verifyToken(
    token: string,
    type?: string
  ): Promise<{ userId: string; email: string; role: string }>;

  /**
   * Request a password reset
   */
  requestPasswordReset(email: string): Promise<{ success: boolean }>;

  /**
   * Reset user password using a valid token
   */
  resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }>;
  
  // Token management - using the more specific implementation from above
  // generateTokens is already defined with proper types above
  
  // User management - revokeAllSessions is already defined above
  
  // Utility methods - verifyToken is already defined above
}
