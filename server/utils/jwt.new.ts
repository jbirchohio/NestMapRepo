import jwt, { SignOptions, Algorithm, JwtPayload as BaseJwtPayload, TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { logger } from './logger.js';
import { redis } from '../db/redis.js';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Token types
export type TokenType = 'access' | 'refresh' | 'password_reset' | 'api_key';

// Define our custom JWT payload type
export interface CustomJwtPayload {
  jti?: string;
  type: TokenType;
  userId: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
  [key: string]: any; // Allow additional properties
}

// Extend the base JWT payload with our custom fields
declare module 'jsonwebtoken' {
  interface JwtPayload extends CustomJwtPayload {}
}

// Token interfaces
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenPayload extends CustomJwtPayload {
  jti: string;
  userId: string;
  email: string;
  role?: string;
  type: TokenType;
  iat: number;
  exp: number;
}

// Configuration
const JWT_CONFIG = {
  // Use environment variables with secure defaults
  secrets: {
    access: process.env.JWT_SECRET || 'your-256-bit-secret-access-key-must-be-32-bytes',
    refresh: process.env.JWT_REFRESH_SECRET || 'your-256-bit-secret-refresh-key-must-be-32-bytes',
    password_reset: process.env.JWT_PASSWORD_RESET_SECRET || 'your-256-bit-secret-password-reset-key',
    api_key: process.env.JWT_API_KEY_SECRET || 'your-256-bit-secret-api-key',
  },
  // Token expiration times in seconds
  expiresIn: {
    access: 15 * 60, // 15 minutes
    refresh: 7 * 24 * 60 * 60, // 7 days
    password_reset: 3600, // 1 hour
    api_key: 365 * 24 * 60 * 60, // 1 year
  },
  issuer: process.env.JWT_ISSUER || 'nestmap-api',
  audience: process.env.JWT_AUDIENCE || 'nestmap-client',
  algorithm: 'HS256' as Algorithm,
} as const;

// Token blacklist management
const TOKEN_BLACKLIST_KEY_PREFIX = 'jwt_blacklist:';
const TOKEN_WHITELIST_KEY_PREFIX = 'jwt_whitelist:';

// Rate limiting for token endpoints
const tokenRateLimiter = new RateLimiterMemory({
  points: 5, // 5 requests
  duration: 60 * 15, // Per 15 minutes by IP
});

/**
 * Add a token to the blacklist
 */
async function addToBlacklist(tokenId: string, expiresAt: number): Promise<void> {
  const ttl = Math.ceil((expiresAt - Date.now()) / 1000);
  if (ttl > 0) {
    await redis.setex(`${TOKEN_BLACKLIST_KEY_PREFIX}${tokenId}`, ttl, '1');
  }
}

/**
 * Check if a token is blacklisted
 */
async function isTokenBlacklisted(tokenId: string): Promise<boolean> {
  const result = await redis.exists(`${TOKEN_BLACKLIST_KEY_PREFIX}${tokenId}`);
  return result === 1;
}

/**
 * Add a token to the whitelist
 */
async function addToWhitelist(tokenId: string, userId: string, expiresIn: number): Promise<void> {
  await redis.setex(
    `${TOKEN_WHITELIST_KEY_PREFIX}${userId}:${tokenId}`,
    expiresIn,
    '1'
  );
}

/**
 * Check if a token is whitelisted
 */
async function isTokenWhitelisted(tokenId: string, userId: string): Promise<boolean> {
  const result = await redis.exists(`${TOKEN_WHITELIST_KEY_PREFIX}${userId}:${tokenId}`);
  return result === 1;
}

/**
 * Generate a unique token ID
 */
function generateTokenId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Get the JWT secret for a specific token type
 */
function getSecret(type: TokenType): string {
  switch (type) {
    case 'access':
      return JWT_CONFIG.secrets.access;
    case 'refresh':
      return JWT_CONFIG.secrets.refresh;
    case 'password_reset':
      return JWT_CONFIG.secrets.password_reset;
    case 'api_key':
      return JWT_CONFIG.secrets.api_key;
    default:
      throw new Error(`Unknown token type: ${type}`);
  }
}

/**
 * Generate a new JWT token
 */
export async function generateToken(
  payload: Omit<TokenPayload, 'jti' | 'iat' | 'exp' | 'type'> & {
    userId: string;
    email: string;
  },
  type: TokenType = 'access',
  options: { expiresIn?: number } = {}
): Promise<{ token: string; jti: string; expiresAt: number }> {
  const jti = generateTokenId();
  const expiresIn = options.expiresIn || JWT_CONFIG.expiresIn[type];
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

  const tokenPayload: TokenPayload = {
    ...payload,
    type,
    jti,
    iat: Math.floor(Date.now() / 1000),
    exp: expiresAt,
  };

  const token = jwt.sign(tokenPayload, getSecret(type), {
    algorithm: JWT_CONFIG.algorithm,
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience,
    expiresIn,
  });

  return { token, jti, expiresAt: expiresAt * 1000 };
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(
  token: string,
  type: TokenType
): Promise<{ payload: TokenPayload; expired: boolean } | null> {
  try {
    const secret = getSecret(type);
    const payload = jwt.verify(token, secret, {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      algorithms: [JWT_CONFIG.algorithm],
    }) as TokenPayload;

    // Additional verification for token type
    if (payload.type !== type) {
      logger.warn(`Token type mismatch: expected ${type}, got ${payload.type}`);
      return null;
    }

    // Check if token is blacklisted
    if (payload.jti && (await isTokenBlacklisted(payload.jti))) {
      logger.warn('Token is blacklisted');
      return null;
    }

    return { payload, expired: false };
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      logger.warn('Token has expired');
      return { payload: (error as any).payload, expired: true };
    } else if (error instanceof JsonWebTokenError) {
      logger.warn('Invalid token:', error.message);
    } else {
      logger.error('Token verification failed:', error);
    }
    return null;
  }
}

/**
 * Generate access and refresh tokens
 */
export async function generateAuthTokens(
  userId: string,
  email: string,
  role: string = 'user',
  options: { refreshExpiresIn?: number } = {}
): Promise<{
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
  tokenType: string;
}> {
  const accessTokenResult = await generateToken(
    { userId, email, role },
    'access',
    { expiresIn: JWT_CONFIG.expiresIn.access }
  );

  const refreshTokenResult = await generateToken(
    { userId, email, role },
    'refresh',
    { expiresIn: options.refreshExpiresIn || JWT_CONFIG.expiresIn.refresh }
  );

  // Add refresh token to whitelist
  await addToWhitelist(
    refreshTokenResult.jti,
    userId,
    refreshTokenResult.expiresAt - Date.now()
  );

  return {
    accessToken: accessTokenResult.token,
    refreshToken: refreshTokenResult.token,
    accessTokenExpiresAt: accessTokenResult.expiresAt,
    refreshTokenExpiresAt: refreshTokenResult.expiresAt,
    tokenType: 'Bearer',
  };
}

/**
 * Refresh an access token using a refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
  tokenType: string;
} | null> {
  const result = await verifyToken(refreshToken, 'refresh');
  
  if (!result || !result.payload.jti) {
    return null;
  }

  const { payload } = result;
  
  // Verify refresh token is whitelisted
  if (!(await isTokenWhitelisted(payload.jti, payload.userId))) {
    logger.warn('Refresh token is not whitelisted');
    return null;
  }

  // Generate new tokens
  const tokens = await generateAuthTokens({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  });

  // Revoke the old refresh token
  await revokeToken(payload.userId, payload.jti);

  return tokens;
}

/**
 * Revoke a token
 */
export async function revokeToken(userId: string, tokenId: string): Promise<void> {
  // Add to blacklist with 24h TTL to handle clock skew
  await addToBlacklist(tokenId, Date.now() + 24 * 60 * 60 * 1000);
  
  // Remove from whitelist if it's a refresh token
  await redis.del(`${TOKEN_WHITELIST_KEY_PREFIX}${userId}:${tokenId}`);
}

/**
 * Revoke all tokens for a user
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  // Get all refresh tokens for the user
  const keys = await redis.keys(`${TOKEN_WHITELIST_KEY_PREFIX}${userId}:*`);
  
  // Add all to blacklist
  await Promise.all(
    keys.map(async (key) => {
      const tokenId = key.split(':').pop();
      if (tokenId) {
        await addToBlacklist(tokenId, Date.now() + 24 * 60 * 60 * 1000);
      }
    })
  );
  
  // Delete all refresh tokens
  if (keys.length > 0) {
    await redis.del(keys);
  }
}

/**
 * Generate a password reset token
 */
export async function generatePasswordResetToken(
  userId: string,
  email: string
): Promise<{ token: string; expiresAt: number }> {
  const { token, expiresAt } = await generateToken(
    { userId, email },
    'password_reset',
    { expiresIn: JWT_CONFIG.expiresIn.password_reset }
  );
  
  return { token, expiresAt };
}

/**
 * Verify a password reset token
 */
export async function verifyPasswordResetToken(
  token: string
): Promise<{ userId: string; email: string; jti: string } | null> {
  const result = await verifyToken(token, 'password_reset');
  
  if (!result || !result.payload.jti) {
    return null;
  }
  
  const { payload } = result;
  
  return {
    userId: payload.userId,
    email: payload.email,
    jti: payload.jti,
  };
}
