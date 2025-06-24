/**
 * Core authentication types and utilities
 * This file serves as the main entry point for auth-related types
 */

import type { AuthTokens, JwtPayload, TokenType } from './jwt.js';
import type { UserRole } from './permissions.js';
import type { AuthUser, UserProfile, UserSettings } from './user.js';

/**
 * Authentication state
 */
export interface AuthState {
  /** Current authenticated user */
  user: AuthUser | null;
  /** Whether authentication is in progress */
  loading: boolean;
  /** Whether the initial auth check is complete */
  initialized: boolean;
  /** Any authentication error that occurred */
  error: string | null;
  /** Authentication tokens */
  tokens: {
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
  };
}

/**
 * Authentication context type
 */
export interface AuthContextType extends AuthState {
  /** Sign in with email and password */
  signIn: (credentials: { email: string; password: string }) => Promise<void>;
  
  /** Sign up with email and password */
  signUp: (data: {
    email: string;
    password: string;
    username: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<void>;
  
  /** Sign out the current user */
  signOut: () => Promise<void>;
  
  /** Refresh the access token */
  refreshToken: () => Promise<boolean>;
  
  /** Check if the user is authenticated */
  isAuthenticated: () => boolean;
  
  /** Check if the user has a specific permission */
  hasPermission: (permission: string) => boolean;
  
  /** Check if the user has a specific role */
  hasRole: (role: UserRole | UserRole[]) => boolean;
  
  /** Update the current user's profile */
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  
  /** Update the current user's settings */
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  
  /** Request a password reset */
  requestPasswordReset: (email: string) => Promise<void>;
  
  /** Reset password with a token */
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  
  /** Change the current user's password */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  
  /** Verify the current user's email */
  verifyEmail: (token: string) => Promise<void>;
  
  /** Resend email verification */
  resendVerificationEmail: () => Promise<void>;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  /** Whether to use secure cookies (recommended for production) */
  useSecureCookies: boolean;
  
  /** Cookie domain */
  cookieDomain?: string;
  
  /** Cookie name for the access token */
  accessTokenCookieName: string;
  
  /** Cookie name for the refresh token */
  refreshTokenCookieName: string;
  
  /** Access token expiration time in seconds */
  accessTokenExpiresIn: number;
  
  /** Refresh token expiration time in seconds */
  refreshTokenExpiresIn: number;
  
  /** Whether to enable refresh token rotation */
  enableRefreshTokenRotation: boolean;
  
  /** Whether to require email verification */
  requireEmailVerification: boolean;
  
  /** Password reset token expiration time in seconds */
  passwordResetTokenExpiresIn: number;
  
  /** Email verification token expiration time in seconds */
  emailVerificationTokenExpiresIn: number;
}

/**
 * Default authentication configuration
 */
export const defaultAuthConfig: AuthConfig = {
  useSecureCookies: process.env.NODE_ENV === 'production',
  accessTokenCookieName: 'access_token',
  refreshTokenCookieName: 'refresh_token',
  accessTokenExpiresIn: 15 * 60, // 15 minutes
  refreshTokenExpiresIn: 7 * 24 * 60 * 60, // 7 days
  enableRefreshTokenRotation: true,
  requireEmailVerification: true,
  passwordResetTokenExpiresIn: 24 * 60 * 60, // 24 hours
  emailVerificationTokenExpiresIn: 7 * 24 * 60 * 60, // 7 days
};

/**
 * Authentication error codes
 */
export enum AuthErrorCode {
  // General errors
  UNKNOWN_ERROR = 'AUTH/UNKNOWN_ERROR',
  INVALID_CREDENTIALS = 'AUTH/INVALID_CREDENTIALS',
  UNAUTHORIZED = 'AUTH/UNAUTHORIZED',
  FORBIDDEN = 'AUTH/FORBIDDEN',
  NOT_FOUND = 'AUTH/NOT_FOUND',
  VALIDATION_ERROR = 'AUTH/VALIDATION_ERROR',
  
  // Token errors
  INVALID_TOKEN = 'AUTH/INVALID_TOKEN',
  EXPIRED_TOKEN = 'AUTH/EXPIRED_TOKEN',
  TOKEN_REVOKED = 'AUTH/TOKEN_REVOKED',
  TOKEN_MISMATCH = 'AUTH/TOKEN_MISMATCH',
  
  // User errors
  USER_NOT_FOUND = 'AUTH/USER_NOT_FOUND',
  USER_DISABLED = 'AUTH/USER_DISABLED',
  EMAIL_ALREADY_EXISTS = 'AUTH/EMAIL_ALREADY_EXISTS',
  EMAIL_NOT_VERIFIED = 'AUTH/EMAIL_NOT_VERIFIED',
  INVALID_PASSWORD = 'AUTH/INVALID_PASSWORD',
  PASSWORD_TOO_WEAK = 'AUTH/PASSWORD_TOO_WEAK',
  PASSWORD_RESET_REQUIRED = 'AUTH/PASSWORD_RESET_REQUIRED',
  
  // Rate limiting
  TOO_MANY_REQUESTS = 'AUTH/TOO_MANY_REQUESTS',
  TOO_MANY_FAILED_ATTEMPTS = 'AUTH/TOO_MANY_FAILED_ATTEMPTS',
  
  // Provider errors
  PROVIDER_ERROR = 'AUTH/PROVIDER_ERROR',
  PROVIDER_NOT_CONFIGURED = 'AUTH/PROVIDER_NOT_CONFIGURED',
  PROVIDER_ACCOUNT_NOT_LINKED = 'AUTH/PROVIDER_ACCOUNT_NOT_LINKED',
}

/**
 * Authentication error class
 */
export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
    public readonly details?: Record<string, any>,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'AuthError';
    
    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError);
    }
  }
  
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack,
    };
  }
}

/**
 * Check if an error is an AuthError
 */
export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

/**
 * Create a new AuthError
 */
export function createAuthError(
  code: AuthErrorCode,
  message: string,
  details?: Record<string, any>,
  originalError?: Error
): AuthError {
  return new AuthError(code, message, details, originalError);
}
