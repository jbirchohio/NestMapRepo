import jwt, { type SignOptions } from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import type { StringValue } from 'ms';
const { sign, verify, decode } = jwt;
import { v4 as uuidv4 } from 'uuid';
import { redisClient as redis } from '../../../utils/redis.ts';
import { logger } from '../../../utils/logger.ts';
import type { 
  UserRole, 
  TokenType, 
  TokenPayload, 
  TokenVerificationResult, 
  JwtConfig, 
  AuthTokens
} from './types.ts';

// Extend TokenVerificationResult to include code property
interface ExtendedTokenVerificationResult<T = TokenPayload> extends TokenVerificationResult<T> {
  code?: string;
}

// Extend AuthTokens to include accessTokenExpiresAt
export interface ExtendedAuthTokens extends AuthTokens {
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

// Token expiration times (in seconds as strings for jsonwebtoken)
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRES_IN || '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // 7 days
const PASSWORD_RESET_EXPIRY = process.env.JWT_PASSWORD_RESET_EXPIRES_IN || '1h'; // 1 hour

// Redis key prefixes
const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';
const REFRESH_TOKEN_PREFIX = 'refresh_token:';
/**
 * JWT configuration with default values
 */
const defaultJwtConfig: JwtConfig = {
    secret: process.env.JWT_SECRET || 'your-256-bit-secret',
    issuer: process.env.JWT_ISSUER || 'nestmap-api',
    audience: process.env.JWT_AUDIENCE || 'nestmap-client',
    accessExpiresIn: ACCESS_TOKEN_EXPIRY,
    refreshExpiresIn: REFRESH_TOKEN_EXPIRY,
    passwordResetExpiresIn: PASSWORD_RESET_EXPIRY,
};

/**
 * Generate a cryptographically secure random token ID
 */
function generateTokenId(): string {
    return uuidv4();
}

/**
 * Generate a secure random string of a given length
 * @param length - The length of the random string to generate
 * @returns A random alphanumeric string
 */
export function generateRandomString(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charsLength = chars.length;
    
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * charsLength));
    }
    return result;
}
/**
 * Generates a JWT token with enhanced security features
 * @param payload - The token payload (excluding jti, iat, exp which are auto-generated)
 * @param secret - Optional custom secret (defaults to JWT_SECRET from config)
 * @param expiresIn - Optional expiration time (defaults to access token expiry)
 * @returns Object containing the token and its expiration date
 */
export const generateToken = async (
    payload: Omit<TokenPayload, 'jti' | 'iat' | 'exp'> & { type: TokenType },
    secret: string = defaultJwtConfig.secret,
    expiresIn: string | number = defaultJwtConfig.accessExpiresIn
): Promise<{ token: string; expiresAt: Date }> => {
    const jti = generateTokenId();
    const now = Math.floor(Date.now() / 1000);
    
    // Calculate expiration time
    let exp: number;
    if (typeof expiresIn === 'string') {
        // Handle string format like '15m', '1h', '7d'
        const unit = expiresIn.slice(-1);
        const value = parseInt(expiresIn.slice(0, -1));
        
        switch (unit) {
            case 's': exp = now + value; break;
            case 'm': exp = now + (value * 60); break;
            case 'h': exp = now + (value * 60 * 60); break;
            case 'd': exp = now + (value * 24 * 60 * 60); break;
            default: exp = now + 900; // Default 15 minutes if format is invalid
        }
    } else {
        // Handle number (treated as seconds)
        exp = now + expiresIn;
    }

    const expiresAt = new Date(exp * 1000);
    
    // Create the token payload with standard claims
    const tokenPayload = {
        ...payload,
        jti,
        iat: now,
        exp
    };

    return new Promise((resolve, reject) => {
        const signOptions: SignOptions = {
            issuer: defaultJwtConfig.issuer,
            audience: defaultJwtConfig.audience,
            algorithm: 'HS256',
            expiresIn: expiresIn as StringValue | number
        };

        sign(tokenPayload, secret, signOptions, (err, token) => {
            if (err || !token) {
                logger.error('Error generating token:', err);
                reject(err || new Error('Failed to generate token'));
                return;
            }

            // Store refresh tokens in Redis
            if (payload.type === 'refresh') {
                const ttl = exp - now;
                redis.set(
                    `${REFRESH_TOKEN_PREFIX}${jti}`,
                    payload.userId,
                    'EX',
                    ttl
                ).catch(err => {
                    logger.error('Failed to store refresh token in Redis:', err);
                });
            }

            resolve({ token, expiresAt });
        });
    });
};

/**
 * Generate a secure random token for password reset
 * @returns Object containing the hashed token and its expiration
 */
export function generatePasswordResetToken(): { token: string; hashedToken: string; expires: Date } {
    const token = randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    return {
        token,
        hashedToken,
        expires
    };
}
/**
 * Decodes a JWT token
 */
export const decodeToken = <T extends Record<string, any> = TokenPayload>(token: string): T | null => {
    try {
        const decoded = decode(token, { complete: true })?.payload;
        if (!decoded)
            return null;
        // Convert to the expected type
        return decoded as unknown as T;
    }
    catch (error) {
        logger.error('Error decoding token:', error);
        return null;
    }
};
/**
 * Verifies a JWT token with enhanced security checks
 * @param token - The JWT token to verify
 * @param type - The expected token type (access, refresh, etc.)
 * @param secret - Optional custom secret (defaults to JWT_SECRET from config)
 * @returns Token verification result with payload if valid
 */
const verifyToken = async <T extends TokenPayload = TokenPayload>(
    token: string, 
    type: TokenType, 
    secret: string = defaultJwtConfig.secret
): Promise<ExtendedTokenVerificationResult<T>> => {
    try {
        if (!token) {
            const result: ExtendedTokenVerificationResult<T> = {
                valid: false,
                error: 'No token provided',
                code: 'MISSING_TOKEN'
            };
            return result;
        }

        // Check token format
        const parts = token.split('.');
        if (parts.length !== 3) {
            const result: ExtendedTokenVerificationResult<T> = {
                valid: false,
                error: 'Invalid token format',
                code: 'INVALID_TOKEN_FORMAT'
            };
            return result;
        }

        // Decode without verification to get the jti
        const decoded = decodeToken<T>(token);
        if (!decoded) {
            const result: ExtendedTokenVerificationResult<T> = {
                valid: false,
                error: 'Invalid token payload',
                code: 'INVALID_TOKEN_PAYLOAD'
            };
            return result;
        }

        const payload = decoded as T;
        const now = Math.floor(Date.now() / 1000);

        // Check token type
        if (payload.type !== type) {
            const result: ExtendedTokenVerificationResult<T> = {
                valid: false,
                error: `Invalid token type. Expected ${type}, got ${payload.type}`,
                code: 'INVALID_TOKEN_TYPE',
                expired: payload.exp ? payload.exp < now : false
            };
            return result;
        }

        // Check if token is expired
        if (payload.exp && payload.exp < now) {
            return {
                valid: false,
                error: 'Token has expired',
                expired: true,
                code: 'TOKEN_EXPIRED'
            };
        }


        // Check if token is blacklisted
        if (payload.jti) {
            const isBlacklisted = await redis.get(`${TOKEN_BLACKLIST_PREFIX}${payload.jti}`);
            if (isBlacklisted) {
                const result: ExtendedTokenVerificationResult<T> = {
                    valid: false,
                    error: 'Token has been revoked',
                    expired: true,
                    code: 'TOKEN_REVOKED'
                };
                return result;
            }

            // For refresh tokens, verify it exists in Redis
            if (type === 'refresh') {
                const storedUserId = await redis.get(`${REFRESH_TOKEN_PREFIX}${payload.jti}`);
                if (!storedUserId || storedUserId !== payload.sub) {
                    return {
                        valid: false,
                        error: 'Invalid refresh token',
                        code: 'INVALID_REFRESH_TOKEN'
                    };
                }
            }
        }

        // Verify token signature and expiration
        try {
            const verified = await new Promise<T>((resolve, reject) => {
                verify(token, secret, {
                    issuer: defaultJwtConfig.issuer,
                    audience: defaultJwtConfig.audience,
                    algorithms: ['HS256'],
                }, (err, decoded) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(decoded as T);
                    }
                });
            });
            // Verify token type
            if (verified.type !== type) {
                return { valid: false, error: 'Invalid token type' };
            }
            const result: ExtendedTokenVerificationResult<T> = {
                valid: true,
                payload: payload as T
            };
            return result;
        }
        catch (error: unknown) {
            // Type guard to check if error is an Error object
            if (error instanceof Error) {
                if (error.name === 'TokenExpiredError') {
                    const result: ExtendedTokenVerificationResult<T> = {
                        valid: false,
                        error: 'Token has expired',
                        expired: true,
                        code: 'TOKEN_EXPIRED'
                    };
                    return result;
                }
                if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
                    return { valid: false, error: error.message };
                }
            }
            // For any other type of error, re-throw it
            throw error;
        }
    }
    catch (error) {
        logger.error('Error verifying token:', error);
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Invalid token',
            code: 'INVALID_TOKEN'
        };
    }
};

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
 * Revokes a refresh token by its ID
 * @param tokenId - The JWT ID (jti) of the refresh token to revoke
 */
export const revokeRefreshToken = async (tokenId: string): Promise<void> => {
    if (!tokenId) {
        logger.warn('Attempted to revoke empty refresh token ID');
        return;
    }
    
    try {
        // Delete from refresh tokens store
        await redis.del(`${REFRESH_TOKEN_PREFIX}${tokenId}`);
        // Also blacklist the token
        await blacklistToken(tokenId);
        logger.debug(`Refresh token revoked: ${tokenId}`);
    } catch (error) {
        logger.error('Error revoking refresh token:', error);
        throw new Error('Failed to revoke refresh token');
    }
};

/**
 * Revokes all refresh tokens for a specific user
 * @param userId - The user ID whose tokens should be revoked
 */
export const revokeAllUserRefreshTokens = async (userId: string): Promise<void> => {
    if (!userId) {
        logger.warn('Attempted to revoke tokens for empty user ID');
        return;
    }
    
    try {
        // Find all refresh tokens for this user
        const keys = await redis.keys(`${REFRESH_TOKEN_PREFIX}*`);
        
        // Filter keys where the value matches the user ID
        const userTokenKeys = [];
        for (const key of keys) {
            const value = await redis.get(key);
            if (value === userId) {
                userTokenKeys.push(key);
            }
        }
        
        // Delete all matching refresh tokens
        if (userTokenKeys.length > 0) {
            // Extract token IDs for blacklisting
            const tokenIds = userTokenKeys.map(key => key.replace(REFRESH_TOKEN_PREFIX, ''));
            
            // Delete refresh tokens
            await redis.del(...userTokenKeys);
            
            // Blacklist all tokens
            await Promise.all(tokenIds.map(id => blacklistToken(id)));
            
            logger.info(`Revoked ${tokenIds.length} refresh tokens for user ${userId}`);
        }
    } catch (error) {
        logger.error('Error revoking user refresh tokens:', error);
        throw new Error('Failed to revoke user refresh tokens');
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

export const generateTokenPair = async (
    userId: string, 
    email: string, 
    role: UserRole = 'member', 
    organizationId?: string
): Promise<ExtendedAuthTokens> => {
    const [accessToken, refreshToken] = await Promise.all([
        generateToken({
            userId,
            email,
            role,
            type: 'access',
            organizationId,
        }),
        generateToken({
            userId,
            email,
            role,
            type: 'refresh',
            organizationId,
        }, defaultJwtConfig.secret, defaultJwtConfig.refreshExpiresIn)
    ]);

    return {
        accessToken: accessToken.token,
        refreshToken: refreshToken.token,
        expiresIn: Math.floor((refreshToken.expiresAt.getTime() - Date.now()) / 1000),
        tokenType: 'Bearer',
        accessTokenExpiresAt: accessToken.expiresAt,
        refreshTokenExpiresAt: refreshToken.expiresAt
    };
};

/**
 * Refreshes an access token using a valid refresh token
 * @param refreshToken - The refresh token
 * @returns New auth tokens or null if refresh token is invalid
 */
export const refreshAccessToken = async (refreshToken: string): Promise<ExtendedAuthTokens | null> => {
    // Verify the refresh token
    const result = await verifyToken<TokenPayload>(refreshToken, 'refresh');
    
    if (!result.valid || !result.payload) {
        logger.warn('Invalid refresh token provided for refresh');
        return null;
    }

    const { userId, email, role, organizationId } = result.payload;
    
    // Generate new tokens
    const tokens = await generateTokenPair(userId, email, role, organizationId);
    
    // Revoke the old refresh token
    if (result.payload.jti) {
        await revokeRefreshToken(result.payload.jti).catch(err => {
            logger.error('Failed to revoke old refresh token:', err);
        });
    }
    
    return tokens;
};

/**
 * Logs out a user by revoking their current refresh token
 * @param refreshToken - The refresh token to revoke
 * @returns Promise that resolves when the token is revoked
 */
export const logout = async (refreshToken: string): Promise<void> => {
    if (!refreshToken) return;
    
    try {
        // Decode the token to get the jti
        const decoded = decodeToken<TokenPayload>(refreshToken);
        if (decoded?.jti) {
            await revokeRefreshToken(decoded.jti);
        }
    } catch (error) {
        logger.error('Error during logout:', error);
        // Don't throw, as this might be called in a cleanup context
    }
};

/**
 * Logs out all sessions for a specific user
 * @param userId - The ID of the user to log out
 * @returns Promise that resolves when all sessions are revoked
 */
export const logoutAllSessions = async (userId: string): Promise<void> => {
    if (!userId) return;
    
    try {
        await revokeAllUserRefreshTokens(userId);
    } catch (error) {
        logger.error(`Error logging out all sessions for user ${userId}:`, error);
        throw new Error('Failed to log out all sessions');
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
// Export all types from types.ts
export * from './types.ts';

// Export additional types defined in this file
export type { ExtendedTokenVerificationResult };

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
