import type { 
  JwtPayload, 
  AccessTokenPayload, 
  RefreshTokenPayload, 
  PasswordResetTokenPayload, 
  EmailVerificationTokenPayload,
  TokenType,
  TokenVerificationResult as SharedTokenVerificationResult
} from '@shared/schema/types/auth/jwt.js';
import type { UserRole } from '@shared/schema/types/auth/permissions.js';

// Re-export shared types
export type { 
  JwtPayload, 
  AccessTokenPayload, 
  RefreshTokenPayload, 
  PasswordResetTokenPayload, 
  EmailVerificationTokenPayload,
  TokenType,
  SharedTokenVerificationResult as TokenVerificationResult
};

// Re-export UserRole as type-only
export type { UserRole };

export interface JwtConfig {
  secret: string;
  issuer: string;
  audience: string;
  accessExpiresIn: string | number;
  refreshExpiresIn: string | number;
  passwordResetExpiresIn: string | number;
  emailVerificationExpiresIn: string | number;
}

export interface ExtendedAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}
