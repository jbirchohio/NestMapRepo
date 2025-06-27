import type { User, UserRole } from '../user';

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
  iat: number;
  exp: number;
  nbf?: number;
  type: TokenType;
  /** Legacy field for backward compatibility */
  userId?: string;
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

/** Union of all JWT payload variants */
export type JwtPayload =
  | AccessTokenPayload
  | RefreshTokenPayload
  | PasswordResetTokenPayload
  | EmailVerificationTokenPayload;

/** Alias maintained for legacy imports */
export type TokenPayload = JwtPayload;

/** Result returned from token verification helpers */
export interface TokenVerificationResult<T = JwtPayload> {
  valid: boolean;
  payload?: T;
  error?: string;
  expired?: boolean;
  code?: string;
}

/** Token pair returned after successful authentication */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  tokenType: string;
  /** Legacy snake_case fields */
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  token_type?: string;
}

/** Response object returned during authentication */
export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
  requiresTwoFactor?: boolean;
  tempToken?: string;
}

