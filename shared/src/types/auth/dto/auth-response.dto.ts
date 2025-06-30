import { User } from '../../user/index.js';

export interface AuthTokens {
  /** JWT access token */
  accessToken: string;
  
  /** Refresh token for obtaining new access tokens */
  refreshToken: string;
  
  /** When the access token expires (ISO string) */
  expiresAt: string;
  
  /** Token type (always 'Bearer') */
  tokenType: 'Bearer';
  
  /** When the access token expires (Date object) */
  accessTokenExpiresAt: Date;
  
  /** When the refresh token expires (Date object) */
  refreshTokenExpiresAt: Date;
}

export interface AuthResponse {
  /** Authenticated user information */
  user: User;
  
  /** Authentication tokens */
  tokens: AuthTokens;
}
