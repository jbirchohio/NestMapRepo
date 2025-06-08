import { Algorithm } from 'jsonwebtoken';

// Token types
export type TokenType = 'access' | 'refresh' | 'password_reset' | 'api_key';

// Token expiration times in seconds
export const TOKEN_EXPIRATION = {
  access: 15 * 60, // 15 minutes
  refresh: 7 * 24 * 60 * 60, // 7 days
  passwordReset: 3600, // 1 hour
  apiKey: 365 * 24 * 60 * 60, // 1 year
} as const;

// Token configuration
export const JWT_CONFIG = {
  issuer: process.env.JWT_ISSUER || 'nestmap-api',
  audience: process.env.JWT_AUDIENCE || 'nestmap-client',
  algorithm: 'HS256' as Algorithm,
} as const;

// Environment validation
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];

// Validate required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const getJwtSecret = (type: TokenType): string => {
  switch (type) {
    case 'access':
      return process.env.JWT_SECRET!;
    case 'refresh':
      return process.env.JWT_REFRESH_SECRET!;
    case 'password_reset':
      return process.env.JWT_PASSWORD_RESET_SECRET || process.env.JWT_SECRET!;
    case 'api_key':
      return process.env.API_KEY_SECRET || process.env.JWT_SECRET!;
    default:
      throw new Error(`Invalid token type: ${type}`);
  }
};
