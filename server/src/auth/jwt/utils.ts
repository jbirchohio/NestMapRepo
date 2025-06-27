import { sign, verify, decode, type SignOptions, type VerifyOptions } from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { redisClient as redis } from '../../../utils/redis.js';
import { logger } from '../../../utils/logger.js';
import type { JwtPayload } from '../../../../shared/src/types/auth/jwt.js';
import type { 
  JwtConfig,
  ExtendedAuthTokens,
  TokenVerificationResult
} from './types.js';

// Import constants
import { 
  TOKEN_BLACKLIST_PREFIX, 
  REFRESH_TOKEN_PREFIX 
} from './constants.js';

/**
 * Generate a cryptographically secure random token ID
 */
export function generateTokenId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Generate a secure random string of a given length
 */
export function generateRandomString(length: number = 32): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

/**
 * Generate a secure hash of a token for storage
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Check if a token is blacklisted
 */
export async function isTokenBlacklisted(tokenId: string): Promise<boolean> {
  try {
    const result = await redis.get(`${TOKEN_BLACKLIST_PREFIX}${tokenId}`);
    return result !== null;
  } catch (error) {
    logger.error('Error checking token blacklist:', error);
    return true; // Fail securely by treating as blacklisted if we can't verify
  }
}

/**
 * Get the expiration time in seconds from now
 */
export function getExpirationTime(expiresIn: string | number): number {
  if (typeof expiresIn === 'number') {
    return Math.floor(Date.now() / 1000) + expiresIn;
  }
  
  // Handle string format like '1h', '2d', etc.
  const match = expiresIn.toString().match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid expiresIn format: ${expiresIn}`);
  }
  
  const [, value, unit] = match;
  const numValue = parseInt(value, 10);
  
  switch (unit) {
    case 's': return Math.floor(Date.now() / 1000) + numValue;
    case 'm': return Math.floor(Date.now() / 1000) + (numValue * 60);
    case 'h': return Math.floor(Date.now() / 1000) + (numValue * 60 * 60);
    case 'd': return Math.floor(Date.now() / 1000) + (numValue * 60 * 60 * 24);
    default: throw new Error(`Unsupported time unit: ${unit}`);
  }
}

/**
 * Create a JWT token with the given payload and options
 */
export function createJwtToken(
  payload: Record<string, any>,
  secret: string,
  options: SignOptions = {}
): string {
  return sign(payload, secret, {
    ...options,
    algorithm: 'HS256', // Always use HS256 for HMAC with SHA-256
    jwtid: payload.jti || uuidv4(),
    issuer: options.issuer,
    audience: options.audience,
    subject: payload.sub,
    expiresIn: options.expiresIn,
  });
}

/**
 * Verify a JWT token with the given secret and options
 */
export function verifyJwtToken<T extends JwtPayload>(
  token: string,
  secret: string,
  options: {
    issuer?: string;
    audience?: string | string[];
    subject?: string;
    algorithms?: string[];
  } = {}
): T | null {
  try {
    const decoded = verify(token, secret, {
      ...options,
      algorithms: options.algorithms as any, // Type assertion since jsonwebtoken's types are more restrictive
      ignoreExpiration: false,
    }) as T;
    
    return decoded;
  } catch (error) {
    logger.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Create a standardized token verification result
 */
export function createTokenVerificationResult<T = JwtPayload>(
  valid: boolean,
  payload?: T,
  error?: string,
  code?: string
): TokenVerificationResult<T> {
  // Determine if the error is an expiration error
  const isExpired = error?.toLowerCase().includes('expired') || false;
  const errorCode = code || (isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN');
  
  return {
    valid,
    payload,
    error,
    expired: isExpired,
    code: errorCode
  } as TokenVerificationResult<T>;
}
