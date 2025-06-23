import 'express';
import type { UserRole } from '../src/auth/types';
export { UserRole } from '../src/auth/types';

export interface JWTUser {
  userId: string;  // Changed from number to string for UUID consistency
  email: string;
  role: UserRole;
  organizationId: string;  // Changed from optional number to required string
  displayName?: string;
  jti: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface User extends JWTUser {}

    interface Request {
      user?: User;
      token?: string;
    }
  }
}

export type TokenType = 'access' | 'refresh' | 'password_reset' | 'email_verification';

export interface TokenPayload {
  jti: string;
  type: TokenType;
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  tokenType: string;
}

export interface AuthResponse extends AuthTokens {
  user: {
    id: string;
    email: string;
    username: string;
    role: UserRole;
  };
}

export interface PasswordResetTokenResult {
  userId: string;
  email: string;
  jti: string;
}

export interface VerifyTokenResult {
  payload: TokenPayload;
  expired: boolean;
}
