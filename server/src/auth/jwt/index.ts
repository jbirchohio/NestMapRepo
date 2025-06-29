import jwt, { type SignOptions, type JwtPayload as JsonWebTokenPayload } from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import ms, { type StringValue } from 'ms';
const { sign, verify, decode } = jwt;
import { v4 as uuidv4 } from 'uuid';
import { redisClient as redis } from '../../../../db/redis.js';
import { logger } from '../../../../utils/logger.js';

// Import utility functions
import {
  generateTokenId,
  generateRandomString,
  createJwtToken,
  verifyJwtToken,
  getExpirationTime,
  hashToken,
  isTokenBlacklisted,
  createTokenVerificationResult
} from './utils.js';

// Import types
import type { 
  JwtConfig,
  ExtendedAuthTokens
} from './types.js';

// Import shared JWT types
import type {
  JwtPayload,
  AccessTokenPayload,
  RefreshTokenPayload,
  PasswordResetTokenPayload,
  EmailVerificationTokenPayload,
  TokenType,
  TokenVerificationResult as JwtTokenVerificationResult
} from '../../../../shared/src/types/auth/jwt.js';

// Import UserRole and getPermissionsForRole
import { UserRole, getPermissionsForRole } from '../../../../shared/src/types/auth/permissions.js';

// Import constants
import {
  TOKEN_BLACKLIST_PREFIX,
  REFRESH_TOKEN_PREFIX,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  PASSWORD_RESET_EXPIRY,
  EMAIL_VERIFICATION_EXPIRY
} from './constants.js';

// Token expiration times are now imported from constants.js

/**
 * JWT configuration with default values
 */
const defaultJwtConfig: JwtConfig = {
  secret: process.env.JWT_SECRET || 'your-256-bit-secret',
  issuer: process.env.JWT_ISSUER || 'nestmap-api',
  audience: process.env.JWT_AUDIENCE || 'nestmap-client',
  accessExpiresIn: Number(process.env.JWT_ACCESS_EXPIRES_IN) || '15m',
  refreshExpiresIn: Number(process.env.JWT_REFRESH_EXPIRES_IN) || '7d',
  passwordResetExpiresIn: Number(process.env.JWT_PASSWORD_RESET_EXPIRES_IN) || '1h',
  emailVerificationExpiresIn: Number(process.env.JWT_EMAIL_VERIFICATION_EXPIRES_IN) || '24h',
};



/**
 * Generates a JWT token with enhanced security features
 * @param payload - The token payload (excluding jti, iat, exp which are auto-generated)
 * @param secret - Optional custom secret (defaults to JWT_SECRET from config)
 * @param expiresIn - Optional expiration time (defaults to access token expiry)
 * @returns Object containing the token and its expiration date
 */
/**
 * Safely converts an expiresIn value to a string in a format that jsonwebtoken expects
 * @param expiresIn - The expiration time as a StringValue, number, or undefined
 * @returns A string in the format expected by jsonwebtoken (e.g., '1h', '7d')
 */
function normalizeExpiresIn(expiresIn: string | number | undefined): StringValue {
  if (expiresIn === undefined) {
    return '15m';
  }
  
  if (typeof expiresIn === 'number') {
    // Convert seconds to a string with 's' suffix
    return `${expiresIn}s` as StringValue;
  }
  
  // Already a string in the correct format
  return expiresIn as StringValue;
}

export async function generateToken<T extends JwtPayload>(
  payload: Omit<T, 'jti' | 'iat' | 'exp'>,
  secret: string = defaultJwtConfig.secret,
  expiresIn: string | number | undefined = defaultJwtConfig.accessExpiresIn
): Promise<{ token: string; expiresAt: Date; payload: T }> {
  const jti = generateTokenId();
  
  // Normalize the expiresIn value
  const normalizedExpiresIn = normalizeExpiresIn(expiresIn);
  const exp = getExpirationTime(normalizedExpiresIn);
  
  // Create the token payload with required JWT fields
  const tokenPayload = { 
    ...payload, 
    jti, 
    exp, 
    iat: Math.floor(Date.now() / 1000) 
  } as T;

  // Generate the JWT token
  const token = createJwtToken(
    tokenPayload,
    secret,
    { 
      expiresIn: normalizedExpiresIn,
      issuer: defaultJwtConfig.issuer,
      audience: defaultJwtConfig.audience,
      algorithm: 'HS256',
      noTimestamp: false
    }
  );

  return { 
    token, 
    expiresAt: new Date(exp * 1000),
    payload: tokenPayload
  };
}

/**
 * Generate a secure random token for password reset
 * @returns Object containing the hashed token and its expiration
 */
export function generatePasswordResetToken(): { token: string; hashedToken: string; expires: Date } {
  const token = generateRandomString(40);
  const hashedToken = hashToken(token);
  const expires = new Date(Date.now() + 3600000); // 1 hour
  
  return { token, hashedToken, expires };
}

/**
 * Decodes a JWT token
 */
export function decodeToken<T extends JwtPayload = JwtPayload>(token: string): T | null {
  try {
    return verifyJwtToken<T>(token, defaultJwtConfig.secret, {
      issuer: defaultJwtConfig.issuer,
      audience: defaultJwtConfig.audience,
    });
  } catch (error) {
    logger.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * Verifies a JWT token with enhanced security checks
 * @param token - The JWT token to verify
 * @param type - The expected token type (access, refresh, etc.)
 * @param secret - Optional custom secret (defaults to JWT_SECRET from config)
 * @returns Token verification result with payload if valid
 */
export async function verifyToken<T extends JwtPayload>(
  token: string,
  type?: TokenType,
  secret: string = defaultJwtConfig.secret
): Promise<JwtTokenVerificationResult<T>> {
  if (!token) {
    return createTokenVerificationResult<T>(
      false,
      undefined as unknown as T, // Type assertion to satisfy TypeScript
      'No token provided',
      'MISSING_TOKEN'
    );
  }

  // Check token format
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    return createTokenVerificationResult<T>(
      false,
      undefined as unknown as T,
      'Invalid token format',
      'INVALID_TOKEN_FORMAT'
    );
  }

  // Verify token signature and decode payload
  const verifiedPayload = verifyJwtToken<T>(token, secret, {
    issuer: defaultJwtConfig.issuer,
    audience: defaultJwtConfig.audience,
    algorithms: ['HS256']
  });

  if (!verifiedPayload) {
    return createTokenVerificationResult<T>(
      false,
      undefined as unknown as T,
      'Invalid token signature',
      'INVALID_SIGNATURE'
    );
  }

  // Check token type
  if (type && verifiedPayload.type !== type) {
    return createTokenVerificationResult<T>(
      false,
      verifiedPayload as T,
      `Invalid token type. Expected ${type}, got ${verifiedPayload.type}`,
      'INVALID_TOKEN_TYPE'
    );
  }

  // Check if token is blacklisted
  const isBlacklisted = await isTokenBlacklisted(verifiedPayload.jti);
  if (isBlacklisted) {
    return createTokenVerificationResult<T>(
      false,
      verifiedPayload as T,
      'Token has been revoked',
      'TOKEN_REVOKED'
    );
  }

  // Additional security checks
  const now = Math.floor(Date.now() / 1000);
  
  // Check issued at time (iat)
  if (verifiedPayload.iat && verifiedPayload.iat > now + 60) { // Allow 1 minute clock skew
    return createTokenVerificationResult<T>(
      false,
      verifiedPayload as T,
      'Token issued in the future',
      'TOKEN_ISSUED_IN_FUTURE'
    );
  }

  // Check not before time (nbf) if present
  if (verifiedPayload.nbf && verifiedPayload.nbf > now) {
    return createTokenVerificationResult<T>(
      false,
      verifiedPayload as T,
      'Token not yet valid',
      'TOKEN_NOT_YET_VALID'
    );
  }

  // If we got here, the token is valid
  return createTokenVerificationResult<T>(true, verifiedPayload as T);
}

/**
 * Blacklists a token by its ID
 * @param tokenId - The JWT ID (jti) to blacklist
 * @param expiresInSeconds - How long the blacklist entry should last (default: 7 days)
 */
export const blacklistToken = async (
    tokenId: string, 
    expiresInSeconds: number = 7 * 24 * 60 * 60 // Default 7 days
): Promise<void> => {
    if (!tokenId) {
        logger.warn('Attempted to blacklist empty token ID');
        return;
    }
    
    try {
        await redis.set(
            `${TOKEN_BLACKLIST_PREFIX}${tokenId}`,
            '1',
            'EX',
            expiresInSeconds
        );
        logger.debug(`Token blacklisted: ${tokenId}`);
    } catch (error) {
        logger.error('Error blacklisting token:', error);
        throw new Error('Failed to blacklist token');
    }
};

/**
 * Revokes a refresh token by its ID and cleans up associated Redis entries
 * @param tokenId - The JWT ID (jti) of the refresh token to revoke
 * @returns Promise that resolves when the token is fully revoked
 */
export const revokeRefreshToken = async (tokenId: string): Promise<void> => {
    if (!tokenId) {
        logger.warn('Attempted to revoke empty refresh token ID');
        return;
    }
    
    try {
        // First, get the user info to find the user ID
        const userInfoKey = `refresh_token:${tokenId}`;
        const userInfoStr = await redis.get(userInfoKey);
        
        // Delete the refresh token info from Redis
        await redis.del(userInfoKey);
        
        // If we have user info, clean up the user's token set
        if (userInfoStr) {
            try {
                const userInfo = JSON.parse(userInfoStr);
                if (userInfo.userId) {
                    const userTokensKey = `user:${userInfo.userId}:refresh_tokens`;
                    await redis.srem(userTokensKey, tokenId);
                }
            } catch (parseError) {
                logger.warn('Failed to parse user info when revoking token:', parseError);
            }
        }
        
        // Also blacklist the token to prevent any further use
        await blacklistToken(tokenId);
        
        logger.debug(`Successfully revoked refresh token: ${tokenId}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error revoking refresh token ${tokenId}:`, error);
        throw new Error(`Failed to revoke refresh token: ${errorMessage}`);
    }
};

/**
 * Revokes all refresh tokens for a specific user and cleans up associated Redis entries
 * @param userId - The user ID whose tokens should be revoked
 * @returns Promise that resolves when all tokens are revoked
 */
export const revokeAllUserRefreshTokens = async (userId: string): Promise<void> => {
    if (!userId) {
        logger.warn('Attempted to revoke tokens for empty user ID');
        return;
    }
    
    try {
        logger.debug(`Revoking all refresh tokens for user ${userId}`);
        
        // Get all refresh token IDs for this user
        const userTokensKey = `user:${userId}:refresh_tokens`;
        const tokenIds = await redis.smembers(userTokensKey);
        
        if (tokenIds.length === 0) {
            logger.debug(`No refresh tokens found for user ${userId}`);
            return;
        }
        
        logger.debug(`Found ${tokenIds.length} refresh tokens to revoke for user ${userId}`);
        
        // Delete all refresh token info from Redis
        const deletePromises = tokenIds.map(async (tokenId) => {
            const userInfoKey = `refresh_token:${tokenId}`;
            await redis.del(userInfoKey).catch(err => {
                logger.warn(`Failed to delete refresh token info for ${tokenId}:`, err);
            });
            
            // Blacklist each token
            await blacklistToken(tokenId).catch(err => {
                logger.warn(`Failed to blacklist token ${tokenId}:`, err);
            });
            
            return tokenId;
        });
        
        // Wait for all deletions to complete
        const deletedTokenIds = (await Promise.all(deletePromises)).filter(Boolean);
        
        // Clear the user's refresh tokens set
        await redis.del(userTokensKey);
        
        logger.info(`Successfully revoked ${deletedTokenIds.length} refresh tokens for user ${userId}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error revoking all refresh tokens for user ${userId}:`, error);
        throw new Error(`Failed to revoke all refresh tokens: ${errorMessage}`);
    }
};

/**
 * Cleans up expired tokens from Redis
 * This should be run periodically (e.g., via a scheduled job)
 */
export const cleanupExpiredTokens = async (): Promise<{ removed: number }> => {
    try {
        // Redis automatically expires keys with TTL, but we can clean up any that might be left
        // This is more of a safety net
        let removed = 0;
        
        // Clean up blacklisted tokens
        const blacklistKeys = await redis.keys(`${TOKEN_BLACKLIST_PREFIX}*`);
        for (const key of blacklistKeys) {
            const ttl = await redis.ttl(key);
            if (ttl === -2) { // -2 means key doesn't exist (already expired)
                await redis.del(key);
                removed++;
            }
        }
        
        // Clean up refresh tokens
        const refreshTokenKeys = await redis.keys(`${REFRESH_TOKEN_PREFIX}*`);
        for (const key of refreshTokenKeys) {
            const ttl = await redis.ttl(key);
            if (ttl === -2) { // -2 means key doesn't exist (already expired)
                await redis.del(key);
                removed++;
            }
        }
        
        logger.info(`Cleaned up ${removed} expired tokens`);
        return { removed };
    } catch (error) {
        logger.error('Error cleaning up expired tokens:', error);
        throw new Error('Failed to clean up expired tokens');
    }
};

/**
 * Generates an access and refresh token pair
 * @param userId - The user ID
 * @param email - The user's email
 * @param role - The user's role (default: 'user')
 * @param organizationId - Optional organization ID
 * @returns Object containing access and refresh tokens with their expiration dates
 */

export async function generateTokenPair(
  userId: string,
  email: string,
  role: UserRole = UserRole.MEMBER,
  organizationId?: string
): Promise<ExtendedAuthTokens> {
  // Generate access token
  const { token: accessToken, expiresAt, payload: accessPayload } = await generateToken<AccessTokenPayload>({
    sub: userId, // Standard JWT subject claim
    userId, // For backward compatibility
    email,
    role,
    organization_id: organizationId || null,
    permissions: getPermissionsForRole(role),
    type: 'access' as const
  }, defaultJwtConfig.secret, normalizeExpiresIn(defaultJwtConfig.accessExpiresIn));

  // Generate refresh token with reference to access token
  const refreshTokenId = generateTokenId();
  
  // Create the refresh token payload without the jti field (it will be added by generateToken)
  const refreshTokenPayload: Omit<RefreshTokenPayload, 'jti' | 'iat' | 'exp'> = {
    sub: userId, // Standard JWT subject claim
    userId, // For backward compatibility
    type: 'refresh' as const,
    parent_jti: accessPayload.jti
  };
  
  // Store additional user info in Redis for refresh token validation
  const userInfo = { 
    userId, // Include userId for reference
    email, 
    role, 
    organization_id: organizationId || null,
    created_at: new Date().toISOString()
  };
  
  // Get the refresh token expiration time, defaulting to 7 days if not specified
  const refreshExpiresIn = defaultJwtConfig.refreshExpiresIn || '7d';
  
  // Calculate TTL in seconds for Redis
  const ttl = Math.floor((getExpirationTime(refreshExpiresIn) * 1000 - Date.now()) / 1000);
  
  // Store user info with the refresh token ID
  await redis.setex(
    `refresh_token:${refreshTokenId}`,
    ttl,
    JSON.stringify(userInfo)
  );
  
  // Maintain a set of refresh tokens for this user
  const userTokensKey = `user:${userId}:refresh_tokens`;
  await redis.sadd(userTokensKey, refreshTokenId);
  await redis.expire(userTokensKey, ttl);
  
  // Generate the actual refresh token
  const { token: refreshToken, expiresAt: refreshExpiresAt } = await generateToken<RefreshTokenPayload>(
    refreshTokenPayload,
    defaultJwtConfig.secret,
    normalizeExpiresIn(refreshExpiresIn)
  );

  // Calculate expiresIn in seconds
  const expiresIn = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

  return {
    accessToken,
    refreshToken,
    expiresIn,
    tokenType: 'Bearer',
    accessTokenExpiresAt: expiresAt,
    refreshTokenExpiresAt: refreshExpiresAt
  };
};

/**
 * Refreshes an access token using a valid refresh token
 * @param refreshToken - The refresh token
 * @returns New auth tokens or null if refresh token is invalid
 */
export const refreshAccessToken = async (refreshToken: string): Promise<ExtendedAuthTokens | null> => {
    try {
        // Verify the refresh token
        const result = await verifyToken<RefreshTokenPayload>(refreshToken, 'refresh');
        
        if (!result.valid || !result.payload) {
            logger.warn('Invalid refresh token provided for refresh');
            return null;
        }

        // Extract user ID and token ID from the refresh token
        const userId = result.payload.sub;
        const tokenId = result.payload.jti;
        
        if (!userId || !tokenId) {
            logger.warn('Refresh token missing required fields');
            return null;
        }

        // Get user info from Redis
        const userInfoKey = `refresh_token:${tokenId}`;
        const userInfoStr = await redis.get(userInfoKey);
        
        if (!userInfoStr) {
            logger.warn('User info not found in Redis for refresh token');
            return null;
        }
        
        const userInfo = JSON.parse(userInfoStr);
        const { email, role, organization_id } = userInfo;
        
        const tokens = await generateTokenPair(userId, email, role, organization_id);
        
        // Revoke the old refresh token
        if (result.payload.jti) {
            await revokeRefreshToken(result.payload.jti).catch(err => {
                logger.error('Failed to revoke old refresh token:', err);
            });
        }
    
        return tokens;
    } catch (error) {
        logger.error('Error refreshing access token:', error);
        return null;
    }
};

/**
 * Logs out a user by revoking their current refresh token and cleaning up associated data
 * @param refreshToken - The refresh token to revoke
 * @returns Promise that resolves when the token is fully revoked and cleaned up
 */
export const logout = async (refreshToken: string): Promise<void> => {
    if (!refreshToken) {
        logger.warn('No refresh token provided for logout');
        return;
    }
    
    try {
        logger.debug('Starting logout process');
        
        // Decode the token to get the jti and verify it's a refresh token
        const decoded = decodeToken<RefreshTokenPayload>(refreshToken);
        if (!decoded?.jti) {
            logger.warn('Invalid refresh token provided for logout - missing jti');
            return;
        }
        
        if (decoded.type !== 'refresh') {
            logger.warn('Invalid token type provided for logout - expected refresh token');
            return;
        }
        
        const tokenId = decoded.jti;
        logger.debug(`Processing logout for token ID: ${tokenId}`);
        
        // Get user info before deleting it
        const userInfoKey = `refresh_token:${tokenId}`;
        const userInfoStr = await redis.get(userInfoKey);
        
        // Delete the refresh token info from Redis
        await redis.del(userInfoKey).catch(err => {
            logger.warn(`Failed to delete refresh token info from Redis: ${err.message}`);
        });
        
        // If we have user info, clean up the user's token set
        if (userInfoStr) {
            try {
                const userInfo = JSON.parse(userInfoStr);
                if (userInfo.userId) {
                    const userTokensKey = `user:${userInfo.userId}:refresh_tokens`;
                    await redis.srem(userTokensKey, tokenId);
                }
            } catch (parseError) {
                logger.warn('Failed to parse user info during logout:', parseError);
            }
        }
        
        // Revoke the refresh token (blacklist it)
        await revokeRefreshToken(tokenId);
        
        logger.info(`Successfully logged out user with token ID: ${tokenId}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error during logout:', error);
        // Don't throw, as this might be called in a cleanup context
        // but log the error for debugging
        if (error instanceof Error) {
            logger.error(`Logout error details: ${errorMessage}`, { stack: error.stack });
        }
    }
};

/**
 * Logs out all sessions for a specific user by revoking all their refresh tokens
 * and cleaning up associated Redis entries
 * @param userId - The ID of the user to log out
 * @returns Promise that resolves when all sessions are revoked
 */
export const logoutAllSessions = async (userId: string): Promise<void> => {
    if (!userId) {
        logger.warn('No user ID provided to logoutAllSessions');
        return;
    }
    
    try {
        logger.debug(`Logging out all sessions for user ${userId}`);
        
        // First, get all refresh tokens for this user
        // Note: This assumes you have a way to track user -> token mappings in Redis
        // If not, you might need to scan all refresh_token:* keys and check their user IDs
        const userTokensKey = `user:${userId}:refresh_tokens`;
        const tokenIds = await redis.smembers(userTokensKey);
        
        if (tokenIds.length === 0) {
            logger.debug(`No active sessions found for user ${userId}`);
            return;
        }
        
        logger.debug(`Found ${tokenIds.length} active sessions for user ${userId}`);
        
        // Delete all refresh token info from Redis
        const deletePromises = tokenIds.map(async (tokenId) => {
            const userInfoKey = `refresh_token:${tokenId}`;
            await redis.del(userInfoKey).catch(err => {
                logger.warn(`Failed to delete refresh token info for ${tokenId}:`, err);
            });
        });
        
        // Wait for all deletions to complete
        await Promise.all(deletePromises);
        
        // Clear the user's refresh tokens set
        await redis.del(userTokensKey);
        
        // Revoke all refresh tokens for this user
        await revokeAllUserRefreshTokens(userId);
        
        logger.info(`Successfully logged out all sessions for user ${userId}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error logging out all sessions for user ${userId}:`, error);
        throw new Error(`Failed to log out all sessions: ${errorMessage}`);
    }
};
/**
 * Revoke all tokens for a user
 * @deprecated Use session management instead
 */
export const revokeAllUserTokens = async (_userId: string): Promise<void> => {
    logger.warn('revokeAllUserTokens is deprecated. Use session management instead.');
    // Implementation would depend on how sessions are stored
};

// Export utility functions
export {
  createJwtToken,
  verifyJwtToken,
  createTokenVerificationResult,
  hashToken,
  isTokenBlacklisted,
  getExpirationTime,
  generateTokenId,
  generateRandomString
} from './utils.js';

// Export JWT constants
export const JWT_CONSTANTS = {
  ACCESS_TOKEN_EXPIRY: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  REFRESH_TOKEN_EXPIRY: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  PASSWORD_RESET_EXPIRY: process.env.JWT_PASSWORD_RESET_EXPIRES_IN || '1h',
  EMAIL_VERIFICATION_EXPIRY: process.env.JWT_EMAIL_VERIFICATION_EXPIRES_IN || '24h',
  TOKEN_BLACKLIST_PREFIX: 'jwt:blacklist:',
  REFRESH_TOKEN_PREFIX: 'refresh_token:'
} as const;

// Export the JWT utility functions
const jwtUtils = {
    // Core token functions
    generateToken,
    verifyToken,
    decodeToken,
    blacklistToken,
    revokeRefreshToken,
    revokeAllUserRefreshTokens,
    
    // Token management
    generateTokenPair,
    refreshAccessToken,
    generatePasswordResetToken,
    generateRandomString,
    
    // Session management
    logout,
    logoutAllSessions,
    cleanupExpiredTokens,
    
    // Configuration
    config: defaultJwtConfig,
};

export type JwtUtils = typeof jwtUtils;
export default jwtUtils;
