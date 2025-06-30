/**
 * Defines standard authentication error codes.
 * Using a const object for better compatibility with isolatedModules.
 */
export const AuthErrorCode = {
  // Token Errors
  INVALID_TOKEN: 'auth/invalid-token',
  EXPIRED_TOKEN: 'auth/expired-token',
  TOKEN_REVOKED: 'auth/token-revoked',
  MISSING_TOKEN: 'auth/missing-token',
  
  // User Errors
  USER_NOT_FOUND: 'auth/user-not-found',
  EMAIL_EXISTS: 'auth/email-already-in-use',
  INVALID_CREDENTIALS: 'auth/invalid-credentials',
  ACCOUNT_DISABLED: 'auth/account-disabled',
  ACCOUNT_LOCKED: 'auth/account-locked',

  // Permission Errors
  INSUFFICIENT_PERMISSIONS: 'auth/insufficient-permissions',
  
  // Two-Factor Auth Errors
  TFA_REQUIRED: 'auth/tfa-required',
  INVALID_TFA_CODE: 'auth/invalid-tfa-code',

  // General Errors
  UNKNOWN_ERROR: 'auth/unknown-error',
} as const;

export type AuthErrorCode = typeof AuthErrorCode[keyof typeof AuthErrorCode];

/**
 * Interface for a structured authentication error.
 */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
  details?: Record<string, any>;
}

/**
 * A custom error class for authentication exceptions.
 * This can be instantiated and thrown in the application.
 */
export class AuthErrorException extends Error implements AuthError {
  public code: AuthErrorCode;
  public details?: Record<string, any>;

  constructor(code: AuthErrorCode, message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'AuthErrorException';
    this.code = code;
    this.details = details;

    // This is for maintaining the correct prototype chain in TypeScript
    Object.setPrototypeOf(this, AuthErrorException.prototype);
  }
}
