import type { SignOptions } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
const { sign, verify, decode } = jwt;
import { redis } from '../db/redis.js';
import { logger } from './logger.js';
import { v4 as uuidv4 } from 'uuid';
import type { 
  TokenType, 
  AuthTokens, 
  TokenVerificationResult, 
  JwtPayload,
  AccessTokenPayload,
  RefreshTokenPayload,
  PasswordResetTokenPayload
} from '@shared/src/types/auth/jwt.js';
import type { UserRole } from '@shared/src/types/user/index.js';
// Type definitions for token verification results
type VerifyTokenResult<T = JwtPayload> = TokenVerificationResult<T>;

interface TokenGenerationResult {
  token: string;
  expiresAt: Date;
}

interface TokenStoreOptions {
  ttl: number;
  type: TokenType;
}
// Token secret keys from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-256-bit-secret';
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const JWT_PASSWORD_RESET_EXPIRES_IN = process.env.JWT_PASSWORD_RESET_EXPIRES_IN || '1h';
/**
 * Generate a cryptographically secure random token ID
 */
function generateTokenId(): string {
    return uuidv4();
}
/**
 * Generate a JWT token with the given payload and options
 */
async function storeToken(jti: string, userId: string, options: TokenStoreOptions): Promise<void> {
  if (options.type === 'refresh') {
    await redis.set(`refresh_token:${jti}`, userId, options.ttl);
  }
}

/**
 * Parses a time string like '15m', '7d', '1h' into seconds.
 * @param timeString The time string to parse.
 * @returns The number of seconds.
 */
function parseTimeString(timeString: string): number {
    const value = parseInt(timeString.slice(0, -1), 10);
    const unit = timeString.slice(-1).toLowerCase();

    if (isNaN(value)) {
        throw new Error(`Invalid time value in time string: "${timeString}"`);
    }

    switch (unit) {
        case 's':
            return value;
        case 'm':
            return value * 60;
        case 'h':
            return value * 3600;
        case 'd':
            return value * 86400;
        default:
            // Support for number-only strings (assumed to be seconds)
            if (!isNaN(parseInt(timeString, 10))) {
                return parseInt(timeString, 10);
            }
            throw new Error(`Unsupported time unit in time string: "${timeString}"`);
    }
}

export const generateToken = async <T extends TokenType>(
  userId: string, 
  email: string, 
  type: T,
  expiresIn: string | number,
  role: UserRole = 'user' as UserRole
): Promise<TokenGenerationResult> => {
    const jti = generateTokenId();
    const expiresInMs = typeof expiresIn === 'string'
      ? parseTimeString(expiresIn) * 1000
      : expiresIn * 1000;
    
    const expiresAt = new Date(Date.now() + expiresInMs);
    const iat = Math.floor(Date.now() / 1000);
    const exp = Math.floor(expiresAt.getTime() / 1000);
    
    // Create the appropriate payload based on token type
    let payload: JwtPayload;
    
    if (type === 'access') {
      payload = {
        jti,
        sub: userId,
        email,
        role,
        permissions: [], // Add actual permissions based on role
        iat,
        exp,
        type: 'access'
      } as AccessTokenPayload;
    } else if (type === 'refresh') {
      payload = {
        jti,
        sub: userId,
        type: 'refresh',
        iat,
        exp
      } as RefreshTokenPayload;
    } else if (type === 'password_reset') {
      payload = {
        jti,
        sub: userId,
        email,
        type: 'password_reset',
        iat,
        exp
      } as PasswordResetTokenPayload;
    } else {
      throw new Error(`Unsupported token type: ${type}`);
    }
    
    const token = sign(payload, JWT_SECRET, { 
      expiresIn: typeof expiresIn === 'string' ? expiresIn : `${expiresIn}s`,
      algorithm: 'HS256'
    } as SignOptions);
    
    // Store the token in Redis if needed
    const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    await storeToken(jti, userId, { ttl, type });
    return { token, expiresAt };
};
/**
 * Verify and decode a JWT token with enhanced security checks
 */
export const verifyToken = async <T extends JwtPayload = JwtPayload>(
  token: string, 
  expectedType?: TokenType
): Promise<VerifyTokenResult<T> | null> => {
    try {
      const decoded = verify(token, JWT_SECRET) as unknown as JwtPayload;
      
      // Verify token type if expected type is provided
      if (expectedType && decoded.type !== expectedType) {
        throw new Error(`Invalid token type. Expected ${expectedType}, got ${decoded.type}`);
      }
      
      // For refresh tokens, check if it's been revoked
      if (decoded.type === 'refresh') {
        const storedUserId = await redis.get(`refresh_token:${decoded.jti}`);
        if (!storedUserId || storedUserId !== decoded.sub) {
          throw new Error('Token has been revoked');
        }
      }
      
      return {
        valid: true,
        payload: decoded as T,
        expired: false
      };
    }
    catch (error: unknown) {
      if (!(error instanceof Error)) {
        logger.error('Unknown error type in verifyToken', { error });
        return null;
      }
      
      if (error.name === 'TokenExpiredError') {
        const payload = decode(token) as JwtPayload;
        if (!payload) return null;
        
        return {
          valid: false,
          payload: payload as T,
          expired: true,
          error: 'Token expired'
        };
      }
      
      logger.error('Token verification failed:', error);
      return null;
    }
};
/**
 * Generate a new access/refresh token pair
 */
export const generateAuthTokens = async (userId: string, email: string, role: UserRole = 'user'): Promise<AuthTokens> => {
    const accessToken = await generateToken(userId, email, 'access', JWT_ACCESS_EXPIRES_IN, role);
    const refreshToken = await generateToken(userId, email, 'refresh', JWT_REFRESH_EXPIRES_IN, role);
    
    return {
        accessToken: accessToken.token,
        refreshToken: refreshToken.token,
        expiresAt: accessToken.expiresAt.toISOString(),
        tokenType: 'Bearer'
    };
};


/**
 * Refresh an access token using a refresh token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<AuthTokens | null> => {
  // Verify the refresh token
  const verified = await verifyToken<RefreshTokenPayload>(refreshToken, 'refresh');
  if (!verified || !verified.payload || verified.expired) {
    return null;
  }
  
  const { payload } = verified;
  const userId = payload.sub;
  
  // Revoke the old refresh token
  if (payload.jti) {
    await redis.del(`refresh_token:${payload.jti}`);
  }
  
  // In a real app, you'd fetch the user's email and role from the database
  // For now, we'll use placeholder values
  const userEmail = 'user@example.com'; // Fetch from DB in production
  const userRole = 'user' as UserRole; // Fetch from DB in production
  
  // Generate new tokens
  return generateAuthTokens(userId, userEmail, userRole);
}
/**
 * Generate a password reset token
 */
export const generatePasswordResetToken = async (userId: string, email: string): Promise<{
  token: string;
  expiresAt: Date;
}> => {
    return generateToken(userId, email, 'password_reset', JWT_PASSWORD_RESET_EXPIRES_IN);
};
/**
 * Verify a password reset token
 */
interface PasswordResetTokenResult {
  userId: string;
  email: string;
  jti: string;
}

export const verifyPasswordResetToken = async (token: string): Promise<PasswordResetTokenResult | null> => {
  const result = await verifyToken<PasswordResetTokenPayload>(token, 'password_reset');
  if (!result || result.expired || !result.payload) {
    return null;
  }
  
  const payload = result.payload;
  if (!('email' in payload)) {
    return null;
  }
  
  return {
    userId: payload.sub,
    email: payload.email,
    jti: payload.jti
  };
};
/**
 * Revoke a token by its ID
 */
export const revokeToken = async (tokenId: string): Promise<void> => {
    await redis.del(`refresh_token:${tokenId}`);
};
/**
 * Revoke all tokens for a user
 */
export const revokeAllUserTokens = async (userId: string): Promise<void> => {
    // This would need a more efficient implementation in production
    // using Redis SCAN would be better for large numbers of tokens
    const keys = await redis.keys('refresh_token:*');
    for (const key of keys) {
        const storedUserId = await redis.get(key);
        if (storedUserId === userId) {
            await redis.del(key);
        }
    }
};
