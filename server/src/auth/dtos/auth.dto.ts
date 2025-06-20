import { z } from 'zod';

// Common validations
const emailSchema = z.string()
  .min(1, 'Email is required')
  .email('Invalid email address')
  .toLowerCase()
  .trim();

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .max(100, 'Password must be at most 100 characters');

const tokenSchema = z.string()
  .min(1, 'Token is required');

// Request DTOs
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const refreshTokenSchema = z.object({
  refreshToken: tokenSchema
});

export const logoutSchema = z.object({
  refreshToken: tokenSchema.optional()
});

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: tokenSchema,
  newPassword: passwordSchema,
});

// Types
export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
export type LogoutDto = z.infer<typeof logoutSchema>;
export type RequestPasswordResetDto = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

// User roles as const for type safety
export const UserRoles = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member',
  GUEST: 'guest'
} as const;

export type UserRole = typeof UserRoles[keyof typeof UserRoles];

// Response DTOs
export interface UserResponse {
  id: string;
  email: string;
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
  user: UserResponse;
}

// Token related types
export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: TokenType;
  jti: string;
  iat?: number;
  exp?: number;
  aud?: string;
  iss?: string;
  sub?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
}

export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh'
}

// Error response type
export interface ErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  timestamp?: string;
  path?: string;
}

// Type guards
export function isErrorResponse(error: unknown): error is ErrorResponse {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    'message' in error
  );
}
