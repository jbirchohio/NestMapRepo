import type { UserResponse } from './user-response.dto.js';

export interface AuthResponse {
  /** Authentication token */
  accessToken: string;
  /** Refresh token for getting new access tokens */
  refreshToken: string;
  /** Token expiration time in seconds */
  expiresIn: number;
  /** Token type (usually 'Bearer') */
  tokenType: string;
  /** Authenticated user data */
  user: UserResponse;
}

/** Response type for endpoints that return user data without a refresh token */
export type AuthResponseWithoutRefreshToken = Omit<AuthResponse, 'refreshToken'>;

/** Response type for successful login/refresh token */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}
