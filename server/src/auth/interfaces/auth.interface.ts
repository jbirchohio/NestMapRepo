import { User } from './user.interface';

export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
  RESET_PASSWORD = 'reset_password',
  EMAIL_VERIFICATION = 'email_verification',
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'passwordHash' | 'refreshTokens'>;
}

export interface TokenPayload {
  jti: string;
  sub: string;
  iat: number;
  exp?: number; // Made optional since jsonwebtoken sets this when using expiresIn
  type: TokenType;
  role?: string;
  email?: string;
  userId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RequestPasswordResetResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}
