// Base JWT payload interface extending standard JWT claims
interface BaseJwtPayload {
  iss?: string; // Issuer
  sub?: string; // Subject (user ID)
  aud?: string | string[]; // Audience
  exp?: number; // Expiration time
  nbf?: number; // Not before
  iat?: number; // Issued at
  jti?: string; // JWT ID
  key: string; // Required key for our implementation
  [key: string]: unknown; // Allow additional properties
}

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'member' | 'guest';
export type TokenType = 'access' | 'refresh' | 'password_reset';

// Custom JWT payload with required role
interface CustomJwtPayload extends BaseJwtPayload {
  role: UserRole;
}

// Token payload interface with all required fields
export interface TokenPayload extends CustomJwtPayload {
  sub: string; // User ID (required)
  email: string; // User email (required)
  jti: string; // Token ID (required)
  type: TokenType; // Token type (required)
  role: UserRole; // User role (required)
  organizationId?: string; // Optional organization ID
  iat: number; // Issued at timestamp (required)
  exp?: number; // Expiration timestamp (optional, set by JWT library)
}

export interface TokenVerificationResult<T = TokenPayload> {
  valid: boolean;
  payload?: T;
  error?: string;
  expired?: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface JwtConfig {
  secret: string;
  issuer: string;
  audience: string;
  accessExpiresIn: string | number;
  refreshExpiresIn: string | number;
  passwordResetExpiresIn: string | number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
}

