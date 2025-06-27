import type { User } from '../user';
import type { AuthTokens } from './jwt';

/**
 * Standardized authentication error codes
 */
export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_taken'
  | 'invalid_token'
  | 'token_expired'
  | 'unauthorized'
  | 'forbidden'
  | 'validation_error'
  | 'rate_limited'
  | 'account_locked'
  | 'AUTH/UNKNOWN_ERROR'
  | 'AUTH/INVALID_CREDENTIALS'
  | 'AUTH/UNAUTHORIZED'
  | 'AUTH/FORBIDDEN'
  | 'AUTH/NOT_FOUND'
  | 'AUTH/VALIDATION_ERROR'
  | 'AUTH/INVALID_TOKEN'
  | 'AUTH/EXPIRED_TOKEN'
  | 'AUTH/TOKEN_REVOKED'
  | 'AUTH/TOKEN_MISMATCH'
  | 'AUTH/USER_NOT_FOUND'
  | 'AUTH/USER_DISABLED'
  | 'AUTH/EMAIL_ALREADY_EXISTS'
  | 'AUTH/EMAIL_NOT_VERIFIED'
  | 'AUTH/INVALID_PASSWORD'
  | 'AUTH/PASSWORD_TOO_WEAK'
  | 'AUTH/PASSWORD_RESET_REQUIRED'
  | 'AUTH/TOO_MANY_REQUESTS'
  | 'AUTH/TOO_MANY_FAILED_ATTEMPTS'
  | 'AUTH/PROVIDER_ERROR'
  | 'AUTH/PROVIDER_NOT_CONFIGURED'
  | 'AUTH/PROVIDER_ACCOUNT_NOT_LINKED'
  | string; // Allow for custom error codes

/**
 * Standardized authentication error response
 */
export interface AuthError {
  code: AuthErrorCode | string; // Allow both AuthErrorCode and string for backward compatibility
  message: string;
  details?: Record<string, unknown>;
  statusCode?: number;
  status?: number; // Alias for statusCode for backward compatibility
}

/**
 * Error class used by legacy code paths
 */
export class AuthErrorException extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'AuthError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthErrorException);
    }
  }

  toJSON(): AuthError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      statusCode: this['statusCode' as never],
    };
  }
}

export function createAuthError(
  code: AuthErrorCode,
  message: string,
  details?: Record<string, unknown>,
  originalError?: Error,
): AuthErrorException {
  return new AuthErrorException(code, message, details, originalError);
}

/**
 * User role and permission types
 */
export type UserRole = 'user' | 'admin' | 'moderator' | 'superadmin' | string;
export type Permission = string;

/**
 * JWT payload interface
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: UserRole;
  permissions?: string[];
  tenantId?: string;
  organization_id?: string | null;
  permissions?: Permission[];
  iat?: number; // Issued at
  exp?: number; // Expiration time
  [key: string]: unknown; // Allow additional claims
}

/**
 * Authentication user type that extends the base User
 */
export interface AuthUser extends Omit<User, 'role' | 'permissions'> {
  role: UserRole;
  permissions: Permission[];
  accessToken?: string;
  refreshToken?: string;
  tenantId?: string;
  organization_id?: string | null;
  // Add any additional fields from legacy types
  [key: string]: unknown; // Allow for additional properties
}

/**
 * Minimal authentication state used by front-end contexts
 */
export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  tokens: {
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
  };
}

/**
 * Legacy context methods retained for compatibility
 */
export interface AuthContextType extends AuthState {
  signIn(credentials: { email: string; password: string }): Promise<void>;
  signUp(data: {
    email: string;
    password: string;
    username: string;
    firstName?: string;
    lastName?: string;
  }): Promise<void>;
  signOut(): Promise<void>;
  refreshToken(): Promise<boolean>;
  isAuthenticated(): boolean;
  hasPermission(permission: string): boolean;
  hasRole(role: UserRole | UserRole[]): boolean;
  updateProfile(updates: Partial<Record<string, unknown>>): Promise<void>;
  updateSettings(updates: Partial<Record<string, unknown>>): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  verifyEmail(token: string): Promise<void>;
  resendVerificationEmail(): Promise<void>;
}

export interface AuthConfig {
  useSecureCookies: boolean;
  cookieDomain?: string;
  accessTokenCookieName: string;
  refreshTokenCookieName: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  enableRefreshTokenRotation: boolean;
  requireEmailVerification: boolean;
  passwordResetTokenExpiresIn: number;
  emailVerificationTokenExpiresIn: number;
}

export const defaultAuthConfig: AuthConfig = {
  useSecureCookies: process.env.NODE_ENV === 'production',
  accessTokenCookieName: 'access_token',
  refreshTokenCookieName: 'refresh_token',
  accessTokenExpiresIn: 15 * 60,
  refreshTokenExpiresIn: 7 * 24 * 60 * 60,
  enableRefreshTokenRotation: true,
  requireEmailVerification: true,
  passwordResetTokenExpiresIn: 24 * 60 * 60,
  emailVerificationTokenExpiresIn: 7 * 24 * 60 * 60,
};

/**
 * Login DTO (Data Transfer Object)
 */
export interface LoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
  tenantId?: string; // Added from legacy types
  deviceInfo?: Record<string, unknown>; // For device fingerprinting
}

/**
 * Register DTO (Data Transfer Object)
 */
export interface RegisterDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  // Additional fields from legacy types
  phone?: string;
  inviteToken?: string;
  metadata?: Record<string, unknown>;
  // Add any other fields from legacy register DTOs
  [key: string]: unknown; // Allow additional fields
}


/**
 * Type guard for AuthError
 */
export function isAuthError(error: unknown): error is AuthError {
  return (
    error instanceof AuthErrorException ||
    (typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error)
  );
}

/**
 * Session security information
 */
export interface SessionSecurity {
  isLocked: boolean;
  failedAttempts: number;
  lastFailedAttempt?: Date;
  lockUntil?: Date;
}

/**
 * Two-factor authentication configuration
 */
export interface TwoFactorConfig {
  enabled: boolean;
  method?: 'authenticator' | 'sms' | 'email';
  phoneNumber?: string;
  secret?: string;
  recoveryCodes?: string[];
}

/**
 * Password reset request DTO
 */
export interface RequestPasswordResetDto {
  email: string;
  resetUrl: string;
}

/**
 * Reset password DTO
 */
export interface ResetPasswordDto {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Change password DTO
 */
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Type guard for AuthUser
 */
export function isAuthUser(user: unknown): user is AuthUser {
  return (
    typeof user === 'object' &&
    user !== null &&
    'id' in user &&
    'email' in user &&
    'role' in user
  );
}

export * from './jwt';
export * from './custom-request';
