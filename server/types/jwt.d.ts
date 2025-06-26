import 'express';
import type {
  JwtPayload,
  TokenType,
  AuthTokens as SharedAuthTokens,
  User,
  TokenPayload,
  UserRole
} from '@shared/types/auth';

export type { TokenType, TokenPayload, UserRole };

export interface JWTUser extends JwtPayload {
  // Add any additional fields specific to Express User
  displayName?: string;
  organizationId?: string | null;
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

export interface AuthTokens extends Omit<SharedAuthTokens, 'expires_at' | 'token_type'> {
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  tokenType: string;
}

export interface AuthResponse extends AuthTokens {
  user: Pick<User, 'id' | 'email' | 'name' | 'role' | 'organization_id'>;
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
