import type { 
  JwtPayload, 
  AccessTokenPayload, 
  RefreshTokenPayload, 
  PasswordResetTokenPayload, 
  EmailVerificationTokenPayload,
  TokenType,
  TokenPayload,
  TokenVerificationResult as SharedTokenVerificationResult
} from '../../../../shared/src/types/auth/jwt.js';
import type { UserRole } from '../../../../shared/src/types/auth/permissions.js';

// Re-export shared types
export type { 
  JwtPayload, 
  AccessTokenPayload, 
  RefreshTokenPayload, 
  PasswordResetTokenPayload, 
  EmailVerificationTokenPayload,
  TokenType,
  TokenPayload,
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
