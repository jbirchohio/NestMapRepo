import jwt, { SignOptions, Algorithm, JwtPayload as JwtBasePayload } from 'jsonwebtoken';
import { logger } from './logger';
import { redis } from '../db/redis'; // Make sure to set up Redis client
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Rate limiting for token endpoints
const tokenRateLimiter = new RateLimiterMemory({
  points: 5, // 5 requests
  duration: 60 * 15, // Per 15 minutes by IP
});

declare module 'jsonwebtoken' {
  interface JwtPayload extends JwtBasePayload {
    jti?: string;
    type: TokenType;
    userId: string;
    email: string;
    role?: string;
  }
}

// Token blacklist management
const TOKEN_BLACKLIST_KEY_PREFIX = 'jwt_blacklist:';
const TOKEN_WHITELIST_KEY_PREFIX = 'jwt_whitelist:';

// Token types
type TokenType = 'access' | 'refresh' | 'password_reset' | 'api_key';

// Token interfaces
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenPayload {
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
    passwordReset: process.env.JWT_PASSWORD_RESET_SECRET || 'your-password-reset-secret-key',
    apiKey: process.env.API_KEY_SECRET || 'your-api-key-secret',
  },
  // Token expiration times in seconds
  expiresIn: {
    access: 15 * 60, // 15 minutes
    refresh: 7 * 24 * 60 * 60, // 7 days
    passwordReset: 3600, // 1 hour
    apiKey: 365 * 24 * 60 * 60, // 1 year
  },
  issuer: process.env.JWT_ISSUER || 'your-app-name',
  audience: process.env.JWT_AUDIENCE || 'your-app-client',
  algorithm: 'HS256' as Algorithm,
} as const;

// Token blacklist management
async function addToBlacklist(tokenId: string, expiresAt: number): Promise<void> {
  const ttl = Math.ceil((expiresAt - Date.now()) / 1000);
  if (ttl > 0) {
    await redis.setex(`${TOKEN_BLACKLIST_KEY_PREFIX}${tokenId}`, ttl, '1');
  }
}

async function isTokenBlacklisted(tokenId: string): Promise<boolean> {
  const result = await redis.exists(`${TOKEN_BLACKLIST_KEY_PREFIX}${tokenId}`);
  return result === 1;
}

// Whitelist management for refresh tokens
async function addToWhitelist(tokenId: string, userId: string, expiresIn: number): Promise<void> {
  await redis.setex(
    `${TOKEN_WHITELIST_KEY_PREFIX}${userId}:${tokenId}`,
    expiresIn,
    '1'
  );
}

async function isTokenWhitelisted(tokenId: string, userId: string): Promise<boolean> {
  const result = await redis.exists(`${TOKEN_WHITELIST_KEY_PREFIX}${userId}:${tokenId}`);
  return result === 1;
}

async function revokeTokenFamily(userId: string, tokenId: string): Promise<void> {
  // Find all refresh tokens for this user and delete them
  const keys = await redis.keys(`${TOKEN_WHITELIST_KEY_PREFIX}${userId}:*`);
  const pipeline = redis.pipeline();
  keys.forEach(key => pipeline.del(key));
  await pipeline.exec();
  
  // Add the current token to blacklist
  await addToBlacklist(tokenId, Math.floor(Date.now() / 1000) + JWT_CONFIG.expiresIn.refresh);
}

// Token generation utilities
function generateTokenId(): string {
  return crypto.randomBytes(16).toString('hex');
}

function getSecret(type: TokenType): string {
  switch (type) {
    case 'access':
      return JWT_CONFIG.secrets.access;
    case 'refresh':
      return JWT_CONFIG.secrets.refresh;
    case 'password_reset':
      return JWT_CONFIG.secrets.passwordReset;
    case 'api_key':
      return JWT_CONFIG.secrets.apiKey;
    default:
      throw new Error(`Invalid token type: ${type}`);
  }
}

// Rate limiting for token operations
export async function checkRateLimit(ip: string, type: 'login' | 'refresh' | 'password_reset'): Promise<{ allowed: boolean; headers: any }> {
  try {
    const rateLimiter = new RateLimiterMemory({
      points: type === 'login' ? 5 : type === 'refresh' ? 10 : 3,
      duration: type === 'login' || type === 'password_reset' ? 3600 : 60, // 1 hour or 1 minute
    });

    const result = await rateLimiter.consume(ip);
    
    return {
      allowed: true,
      headers: {
        'Retry-After': result.msBeforeNext / 1000,
        'X-RateLimit-Limit': rateLimiter.points,
        'X-RateLimit-Remaining': result.remainingPoints,
        'X-RateLimit-Reset': new Date(Date.now() + result.msBeforeNext).toISOString(),
      },
    };
  } catch (error) {
    return {
      allowed: false,
      headers: {
        'Retry-After': error.msBeforeNext / 1000,
        'X-RateLimit-Limit': error.points,
        'X-RateLimit-Remaining': 0,
        'X-RateLimit-Reset': new Date(Date.now() + error.msBeforeNext).toISOString(),
      },
    };
  }
}

// Token generation and validation functions

/**
 * Generate a new JWT token with enhanced security
 */
export async function generateToken(
  payload: Omit<TokenPayload, 'jti' | 'iat' | 'exp' | 'type'>,
  type: TokenType = 'access',
  options: { expiresIn?: number } = {}
): Promise<{ token: string; jti: string; expiresAt: number }> {
  const jti = generateTokenId();
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = options.expiresIn || JWT_CONFIG.expiresIn[type];
  const expiresAt = now + expiresIn;

  const tokenPayload: TokenPayload = {
    ...payload,
    jti,
    type,
    iat: now,
    exp: expiresAt,
  };

  const token = jwt.sign(tokenPayload, getSecret(type), {
    algorithm: JWT_CONFIG.algorithm,
    expiresIn,
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience,
  });

  // Add refresh tokens to whitelist
  if (type === 'refresh') {
    await addToWhitelist(jti, payload.userId, expiresIn);
  }

  return { token, jti, expiresAt };
}

/**
 * Verify and decode a JWT token with enhanced security checks
 */
export async function verifyToken(
  token: string,
  type: TokenType
): Promise<{ payload: TokenPayload; expired: boolean } | null> {
  try {
    // Check if token is blacklisted
    const decoded = jwt.decode(token) as TokenPayload | null;
    if (!decoded || !decoded.jti) {
      throw new Error('Invalid token format');
    }

    // Check token blacklist
    if (await isTokenBlacklisted(decoded.jti)) {
      throw new Error('Token has been revoked');
    }

    // For refresh tokens, check whitelist
    if (type === 'refresh' && !(await isTokenWhitelisted(decoded.jti, decoded.userId))) {
      throw new Error('Refresh token not found in whitelist');
    }

    // Verify token signature and expiration
    const payload = jwt.verify(token, getSecret(type), {
      algorithms: [JWT_CONFIG.algorithm],
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      ignoreExpiration: true, // We'll handle expiration manually
    }) as TokenPayload;

    // Verify token type matches
    if (payload.type !== type) {
      throw new Error(`Invalid token type: expected ${type}, got ${payload.type}`);
    }

    // Check expiration manually
    const now = Math.floor(Date.now() / 1000);
    const expired = payload.exp ? payload.exp <= now : true;

    return { payload, expired };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { payload: error.payload as TokenPayload, expired: true };
    }
    logger.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Generate a new access/refresh token pair
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
  // Generate refresh token first
  const refreshToken = await generateToken(
    {
      userId,
      email,
      role,
      type: 'refresh',
    },
    'refresh',
    { expiresIn: options.refreshExpiresIn || JWT_CONFIG.expiresIn.refresh }
  );

  // Then generate access token
  const accessToken = await generateToken(
    {
      userId,
      email,
      role,
      type: 'access',
    },
    'access',
    { expiresIn: JWT_CONFIG.expiresIn.access }
  );

  return {
    accessToken: accessToken.token,
    refreshToken: refreshToken.token,
    accessTokenExpiresAt: accessToken.expiresAt,
    refreshTokenExpiresAt: refreshToken.expiresAt,
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
  // Verify the refresh token
  const verified = await verifyToken(refreshToken, 'refresh');
  if (!verified || verified.expired) {
    throw new Error('Invalid or expired refresh token');
  }

  const { payload } = verified;

  // Revoke the old refresh token
  await revokeToken(payload.userId, payload.jti);

  // Generate new tokens
  return generateAuthTokens(payload.userId, payload.email, payload.role);
}

/**
 * Revoke a token
 */
export async function revokeToken(userId: string, tokenId: string): Promise<void> {
  // Add token to blacklist
  await addToBlacklist(tokenId, Math.floor(Date.now() / 1000) + JWT_CONFIG.expiresIn.refresh);
  
  // Remove from whitelist if it's a refresh token
  await redis.del(`${TOKEN_WHITELIST_KEY_PREFIX}${userId}:${tokenId}`);
}

/**
 * Revoke all tokens for a user (on password change, logout everywhere, etc.)
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  // Find all refresh tokens for this user
  const keys = await redis.keys(`${TOKEN_WHITELIST_KEY_PREFIX}${userId}:*`);
  const pipeline = redis.pipeline();
  
  // Add all refresh tokens to blacklist
  const now = Math.floor(Date.now() / 1000);
  keys.forEach(key => {
    const tokenId = key.split(':').pop();
    if (tokenId) {
      pipeline.setex(
        `${TOKEN_BLACKLIST_KEY_PREFIX}${tokenId}`,
        JWT_CONFIG.expiresIn.refresh,
        '1'
      );
    }
  });
  
  // Delete all whitelist entries
  keys.forEach(key => pipeline.del(key));
  
  await pipeline.exec();
}

/**
 * Generate a password reset token
 */
export async function generatePasswordResetToken(
  userId: string,
  email: string
): Promise<{ token: string; expiresAt: number }> {
  const { token, expiresAt } = await generateToken(
    {
      userId,
      email,
      type: 'password_reset',
    },
    'password_reset',
    { expiresIn: JWT_CONFIG.expiresIn.passwordReset }
  );

  return { token, expiresAt };
}

/**
 * Verify a password reset token
 */
export async function verifyPasswordResetToken(token: string): Promise<{
  userId: string;
  email: string;
  jti: string;
} | null> {
  const verified = await verifyToken(token, 'password_reset');
  if (!verified || verified.expired) {
    return null;
  }

  const { payload } = verified;
  return {
    userId: payload.userId,
    email: payload.email,
    jti: payload.jti,
  };
}

/**
 * Create a new JWT access token
 */
export function createJWT(payload: Omit<JwtPayload, 'exp' | 'iat'>): string {
  const signOptions: SignOptions = {
    expiresIn: Number(ACCESS_TOKEN_EXPIRY) || 900, // 15 minutes in seconds
    algorithm: 'HS256' as Algorithm
  };
  
  return jwt.sign(
    { ...payload, iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    signOptions
  );
}

/**
 * Generate a JWT token
 */
export function generateToken(
  payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>,
  type: TokenType,
  expiresIn: string | number = type === 'access' ? '15m' : type === 'refresh' ? '7d' : '1h'
): string {
  const secret = type === 'access' 
    ? JWT_SECRET
    : type === 'refresh' 
      ? JWT_REFRESH_SECRET 
      : JWT_PASSWORD_RESET_SECRET;

  const expiresInSeconds = typeof expiresIn === 'string' 
    ? (parseInt(expiresIn, 10) || 900) // Default to 15 minutes if parsing fails
    : expiresIn;

  const signOptions: SignOptions = {
    expiresIn: expiresInSeconds,
    algorithm: 'HS256' as Algorithm
  };

  return jwt.sign(
    { ...payload, type, iat: Math.floor(Date.now() / 1000) },
    secret,
    signOptions
  );
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string, type: TokenType): JwtPayload | null {
  const secret = type === 'access' 
    ? JWT_SECRET 
    : type === 'refresh' 
      ? JWT_REFRESH_SECRET 
      : JWT_PASSWORD_RESET_SECRET;

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    
    // Verify token type matches expected type
    if (decoded.type !== type) {
      logger.warn(`Token type mismatch: expected ${type}, got ${decoded.type}`);
      return null;
    }
    
    return decoded;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Token verification failed: ${errorMessage}`);
    return null;
  }
}

/**
 * Generate both access and refresh tokens
 */
export function generateAuthTokens(userId: string, email: string, role: string): TokenPair {
  const accessToken = generateToken(
    { userId, email, role },
    'access',
    ACCESS_TOKEN_EXPIRY
  );

  const refreshToken = generateToken(
    { userId, email, role },
    'refresh',
    REFRESH_TOKEN_EXPIRY
  );

  return { accessToken, refreshToken };
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): JwtPayload | null {
  return verifyToken(token, 'refresh');
}

/**
 * Generate a password reset token
 */
export function generatePasswordResetToken(userId: string, email: string): string {
  const signOptions: SignOptions = {
    expiresIn: 3600, // 1 hour in seconds
    algorithm: 'HS256' as Algorithm
  };

  return jwt.sign(
    { 
      userId, 
      email,
      type: 'password_reset' as const,
      iat: Math.floor(Date.now() / 1000) 
    },
    JWT_PASSWORD_RESET_SECRET,
    signOptions
  );
}

// The async verifyPasswordResetToken is already defined above
