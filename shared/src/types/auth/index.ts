import type { User } from '../user';

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
 * Authentication tokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
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
 * Authentication response
 */
export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
  // Additional fields from legacy types
  requiresTwoFactor?: boolean;
  tempToken?: string; // For 2FA flows
  // Add any other fields from legacy auth responses
}

/**
 * Type guard for AuthError
 */
export function isAuthError(error: unknown): error is AuthError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
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
