export type UserRole = 'super_admin' | 'admin' | 'manager' | 'member' | 'guest';

export type TokenType = 'access' | 'refresh' | 'password_reset' | 'api_key';

export interface TokenPayload {
  jti: string; // JWT ID
  sub: string; // User ID
  email: string;
  role: UserRole;
  type: TokenType;
  iat: number; // Issued at
  exp: number; // Expiration time
  organizationId?: string;
  sessionId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  organizationId?: string | null;
  sessionId?: string;
  permissions?: string[];
}

export interface TokenVerificationResult {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
  expired?: boolean;
}

export interface SessionData {
  userId: string;
  email: string;
  role: UserRole;
  organizationId?: string | null;
  userAgent: string;
  ipAddress: string;
  lastActive: Date;
  createdAt: Date;
}
