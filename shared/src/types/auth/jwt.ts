import type { User, UserRole } from '../user/index.js';
import type { AuthTokens } from './dto/auth-response.dto.js';
import type { AuthErrorCode } from './auth.js';

export type { AuthTokens } from './dto/auth-response.dto.js';

/** Supported JWT token types */
export type TokenType =
  | 'access'
  | 'refresh'
  | 'password_reset'
  | 'email_verification';

/** Base fields present in all JWT payloads */
export interface BaseJwtPayload {
  jti: string;
  sub: string;
  iat?: number;
  exp?: number;
  nbf?: number;
  type: TokenType;
  /** Legacy field for backward compatibility */
  userId?: string;
  organizationId?: string | null;
  permissions?: string[];
  email?: string;
}

/** Access token specific claims */
export interface AccessTokenPayload extends BaseJwtPayload {
  type: 'access';
  email: string;
  role: UserRole;
  organizationId?: string | null;
  /** Legacy field */
  organization_id?: string | null;
  permissions: string[];
  name?: string;
}

/** Refresh token specific claims */
export interface RefreshTokenPayload extends BaseJwtPayload {
  type: 'refresh';
  parentJti?: string;
  /** Legacy field */
  parent_jti?: string;
}

/** Password reset token specific claims */
export interface PasswordResetTokenPayload extends BaseJwtPayload {
  type: 'password_reset';
  email: string;
}

/** Email verification token specific claims */
export interface EmailVerificationTokenPayload extends BaseJwtPayload {
  type: 'email_verification';
  email: string;
}

/** Union of all possible JWT payload types */
export type JwtPayload =
  | AccessTokenPayload
  | RefreshTokenPayload
  | PasswordResetTokenPayload
  | EmailVerificationTokenPayload;

/** Result returned from token verification helpers */
export type TokenVerificationResult<T extends BaseJwtPayload> =
  | {
      valid: true;
      payload: T;
      expired: false;
      error?: never;
      code?: never;
    }
  | {
      valid: false;
      payload?: never;
      expired: boolean;
      error: string;
      code: AuthErrorCode;
    };

/** Response object returned during authentication */
export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
  requiresTwoFactor?: boolean;
  tempToken?: string;
}
