/**
 * Standard JWT payload structure used across the application
 * This serves as the single source of truth for JWT token structure
 */

import { UserRole } from './permissions.js';
import type { User } from './user.js';

/**
 * Token types supported by the application
 */
export type TokenType = 'access' | 'refresh' | 'password_reset' | 'email_verification';

/**
 * Base JWT payload fields
 */
interface BaseJwtPayload {
  /** JWT ID - unique identifier for the token */
  jti: string;
  /** Subject - typically the user ID */
  sub: string;
  /** Issued At - when the token was issued (UNIX timestamp) */
  iat: number;
  /** Expiration Time - when the token expires (UNIX timestamp) */
  exp: number;
  /** Not Before - token is not valid before this time (UNIX timestamp) */
  nbf?: number;
  /** Token type */
  type: TokenType;
  /** User ID - for backward compatibility */
  userId?: string;
}

/**
 * Access token specific claims
 */
export interface AccessTokenPayload extends BaseJwtPayload {
  type: 'access';
  /** User's email address */
  email: string;
  /** User's role */
  role: UserRole;
  /** Organization ID the user belongs to */
  organization_id: string | null;
  /** List of permissions granted to the user */
  permissions: string[];
  /** User's display name */
  name?: string;
}

/**
 * Refresh token specific claims
 */
export interface RefreshTokenPayload extends BaseJwtPayload {
  type: 'refresh';
  /** Reference to the parent token's JTI */
  parent_jti?: string;
}

/**
 * Password reset token specific claims
 */
export interface PasswordResetTokenPayload extends BaseJwtPayload {
  type: 'password_reset';
  /** User's email address */
  email: string;
}

/**
 * Email verification token specific claims
 */
export interface EmailVerificationTokenPayload extends BaseJwtPayload {
  type: 'email_verification';
  /** User's email address */
  email: string;
}

/**
 * Union type of all possible JWT payloads
 */
export type JwtPayload =
  | AccessTokenPayload
  | RefreshTokenPayload
  | PasswordResetTokenPayload
  | EmailVerificationTokenPayload;

// Export TokenPayload as an alias for JwtPayload for backward compatibility
export type { JwtPayload as TokenPayload };

/**
 * Token verification result
 */
export interface TokenVerificationResult<T = JwtPayload> {
  valid: boolean;
  payload?: T;
  error?: string;
  expired?: boolean;
  code?: string;
}



/**
 * Token pair returned after successful authentication
 */
export interface AuthTokens {
  /** Access token for API authorization */
  access_token: string;
  /** Refresh token for obtaining new access tokens */
  refresh_token: string;
  /** When the access token expires (ISO timestamp) */
  expires_at: string;
  /** Token type, typically 'Bearer' */
  token_type: string;
}

/**
 * Extended auth response including user data
 */
export interface AuthResponse {
  /** The authenticated user */
  user: User;
  /** Authentication tokens */
  tokens: AuthTokens;
}
