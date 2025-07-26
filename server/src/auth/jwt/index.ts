import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.js';

// Redis interface for token blacklisting
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<void>;
  del(key: string): Promise<number>;
}

// Mock Redis implementation - replace with actual Redis client in production
class MockRedisClient implements RedisClient {
  private store = new Map<string, { value: string; expiry?: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key: string, value: string, options?: { EX?: number }): Promise<void> {
    const expiry = options?.EX ? Date.now() + (options.EX * 1000) : undefined;
    this.store.set(key, { value, expiry });
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }
}

// Initialize Redis client - replace with actual Redis connection in production
const redis: RedisClient = new MockRedisClient();

// Import types
import {
  UserRole,
  TokenType,
  TokenPayload,
  TokenVerificationResult,
  JwtConfig,
  AuthTokens
} from './types.js';

// Token expiration times (in seconds as strings for jsonwebtoken)
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
const PASSWORD_RESET_EXPIRY = '1h'; // 1 hour

// Redis key prefix
const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';

/**
 * JWT configuration with default values
 */
const defaultJwtConfig: JwtConfig = {
  secret: process.env.JWT_SECRET || 'your-secret-key',
  issuer: process.env.JWT_ISSUER || 'nestmap-api',
  audience: process.env.JWT_AUDIENCE || 'nestmap-client',
  accessExpiresIn: ACCESS_TOKEN_EXPIRY,
  refreshExpiresIn: REFRESH_TOKEN_EXPIRY,
  passwordResetExpiresIn: PASSWORD_RESET_EXPIRY,
};

/**
 * Generates a JWT token with proper type safety
 */
const generateToken = async (
  payload: Omit<TokenPayload, 'jti' | 'iat' | 'exp'> & { type: TokenType },
  secret: string = defaultJwtConfig.secret,
  expiresIn: string | number = defaultJwtConfig.accessExpiresIn,
): Promise<string> => {
  try {
    const tokenId = uuidv4();
    const now = Math.floor(Date.now() / 1000);
    
    const tokenPayload = {
      ...payload,
      jti: tokenId,
      iat: now,
    };
    
    const signOptions = {
      issuer: defaultJwtConfig.issuer,
      audience: defaultJwtConfig.audience,
      algorithm: 'HS256' as const,
      expiresIn,
    };
    
    const token = jwt.sign(tokenPayload, secret, signOptions);
    
    if (typeof token !== 'string') {
      throw new Error('Token generation failed - invalid token type');
    }
    
    logger.info(`Token generated successfully - tokenId: ${tokenId}, type: ${payload.type}`);
    return token;
  } catch (error) {
    logger.error('Error generating token:', error);
    throw new Error(`Failed to generate token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Decodes a JWT token without verification
 */
const decodeToken = <T extends Record<string, unknown> = TokenPayload>(
  token: string
): T | null => {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }
    
    const decoded = jwt.decode(token, { complete: false });
    if (!decoded || typeof decoded === 'string') {
      return null;
    }
    
    return decoded as T;
  } catch (error) {
    logger.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Verifies a JWT token with comprehensive validation
 */
const verifyToken = async <T extends TokenPayload = TokenPayload>(
  token: string,
  type: TokenType,
  secret: string = defaultJwtConfig.secret
): Promise<TokenVerificationResult<T>> => {
  try {
    if (!token) {
      return { valid: false, error: 'No token provided' };
    }

    // First decode to check blacklist without verification
    const decoded = decodeToken<TokenPayload>(token);
    if (decoded?.jti) {
      const blacklisted = await redis.get(`${TOKEN_BLACKLIST_PREFIX}${decoded.jti}`);
      if (blacklisted) {
        return { valid: false, error: 'Token has been revoked' };
      }
    }

    // Verify the token
    const verifyOptions = {
      issuer: defaultJwtConfig.issuer,
      audience: defaultJwtConfig.audience,
      algorithms: ['HS256'] as const,
    };

    const verified = await new Promise<T>((resolve, reject) => {
      try {
        const decoded = jwt.verify(token, secret, verifyOptions);
        if (!decoded || typeof decoded === 'string') {
          reject(new Error('Invalid token payload'));
        } else {
          resolve(decoded as T);
        }
      } catch (err) {
        reject(err);
      }
    });

    // Verify token type matches expected type
    if (verified.type !== type) {
      return { valid: false, error: `Invalid token type. Expected: ${type}, got: ${verified.type}` };
    }

    // Validate required fields
    if (!verified.sub || !verified.email || !verified.jti) {
      return { valid: false, error: 'Token missing required fields' };
    }

    logger.info('Token verified successfully');

    return { valid: true, payload: verified };
  } catch (error: unknown) {
    if (error instanceof Error) {
      switch (error.name) {
        case 'TokenExpiredError':
          return { valid: false, error: 'Token has expired', expired: true };
        case 'JsonWebTokenError':
          return { valid: false, error: 'Invalid token format' };
        case 'NotBeforeError':
          return { valid: false, error: 'Token not active yet' };
        default:
          logger.error('Token verification error:', error);
          return { valid: false, error: error.message };
      }
    }
    
    logger.error('Unknown token verification error:', error);
    return { valid: false, error: 'Token verification failed' };
  }
};

/**
 * Blacklists a token by its ID with optional expiration
 */
const blacklistToken = async (
  tokenId: string,
  expiresInSeconds: number = 7 * 24 * 60 * 60 // Default 7 days
): Promise<void> => {
  try {
    if (!tokenId || typeof tokenId !== 'string') {
      throw new Error('Token ID is required');
    }
    
    const key = `${TOKEN_BLACKLIST_PREFIX}${tokenId}`;
    await redis.set(key, 'blacklisted', { EX: expiresInSeconds });
    
    logger.info(`Token blacklisted successfully - tokenId: ${tokenId}, expiresInSeconds: ${expiresInSeconds}`);
  } catch (error) {
    logger.error('Error blacklisting token:', error);
    throw new Error(`Failed to blacklist token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generates an access and refresh token pair with proper expiration handling
 */
const generateTokenPair = async (
  userId: string,
  email: string,
  role: UserRole = 'member',
  organizationId?: string
): Promise<AuthTokens> => {
  try {
    if (!userId || !email) {
      throw new Error('User ID and email are required');
    }

    const basePayload = {
      sub: userId,
      email,
      role,
      organizationId,
      key: userId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      generateToken(
        { ...basePayload, type: 'access' },
        defaultJwtConfig.secret,
        defaultJwtConfig.accessExpiresIn
      ),
      generateToken(
        { ...basePayload, type: 'refresh' },
        defaultJwtConfig.secret,
        defaultJwtConfig.refreshExpiresIn
      )
    ]);

    // Calculate expiration times in milliseconds
    const accessExpiresIn = parseExpirationTime(defaultJwtConfig.accessExpiresIn);
    const refreshExpiresIn = parseExpirationTime(defaultJwtConfig.refreshExpiresIn);
    
    const now = Date.now();
    
    const authTokens: AuthTokens = {
      accessToken,
      refreshToken,
      expiresIn: Math.floor(accessExpiresIn / 1000), // Convert to seconds for compatibility
      tokenType: 'Bearer',
      accessTokenExpiresAt: now + accessExpiresIn,
      refreshTokenExpiresAt: now + refreshExpiresIn,
    };

    logger.info(`Token pair generated successfully - userId: ${userId}, role: ${role}`);
    return authTokens;
  } catch (error) {
    logger.error('Error generating token pair:', error);
    throw new Error(`Failed to generate token pair: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Parses expiration time string to milliseconds
 */
function parseExpirationTime(expiresIn: string | number): number {
  if (typeof expiresIn === 'number') {
    return expiresIn * 1000; // Convert seconds to milliseconds
  }
  
  const timeValue = parseInt(expiresIn);
  const timeUnit = expiresIn.slice(-1);
  
  switch (timeUnit) {
    case 's': return timeValue * 1000;
    case 'm': return timeValue * 60 * 1000;
    case 'h': return timeValue * 60 * 60 * 1000;
    case 'd': return timeValue * 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000; // Default to 15 minutes
  }
}

/**
 * Revoke all tokens for a user by blacklisting them
 * @deprecated Use session management instead
 */
const revokeAllUserTokens = async (userIdToRevoke: string): Promise<void> => {
  try {
    if (!userIdToRevoke) {
      throw new Error('User ID is required');
    }
    
    logger.warn(`revokeAllUserTokens is deprecated for user ${userIdToRevoke}. Use session management instead.`);
    
    // In a real implementation, you would:
    // 1. Query all active tokens for the user from your token store
    // 2. Blacklist each token individually
    // 3. Or implement a user-based blacklist check in verifyToken
    
    // For now, just log the action
    logger.info(`User token revocation requested - userId: ${userIdToRevoke}`);
  } catch (error) {
    logger.error('Error revoking user tokens:', error);
    throw new Error(`Failed to revoke user tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Check if a token is blacklisted
 */
const isTokenBlacklisted = async (tokenId: string): Promise<boolean> => {
  try {
    if (!tokenId) return false;
    
    const blacklisted = await redis.get(`${TOKEN_BLACKLIST_PREFIX}${tokenId}`);
    return blacklisted !== null;
  } catch (error) {
    logger.error('Error checking token blacklist:', error);
    return false; // Fail open for availability
  }
};

/**
 * Refresh an access token using a refresh token
 */
const refreshAccessToken = async (
  refreshToken: string,
  secret: string = defaultJwtConfig.secret
): Promise<{ accessToken: string; expiresIn: number } | null> => {
  try {
    const verificationResult = await verifyToken<TokenPayload>(
      refreshToken,
      'refresh',
      secret
    );

    if (!verificationResult.valid || !verificationResult.payload) {
      return null;
    }

    const { sub, email, role, organizationId } = verificationResult.payload;
    
    const accessToken = await generateToken(
      {
        sub,
        email,
        role,
        type: 'access',
        organizationId,
        key: sub,
      },
      secret,
      defaultJwtConfig.accessExpiresIn
    );

    const expiresIn = parseExpirationTime(defaultJwtConfig.accessExpiresIn);
    
    return {
      accessToken,
      expiresIn: Math.floor(expiresIn / 1000),
    };
  } catch (error) {
    logger.error('Error refreshing access token:', error);
    return null;
  }
};

// Export all types
export * from './types.js';

// Export the JWT utility functions
const jwtUtils = {
  generateToken,
  verifyToken,
  blacklistToken,
  generateTokenPair,
  decodeToken,
  revokeAllUserTokens,
  isTokenBlacklisted,
  refreshAccessToken,
  config: defaultJwtConfig,
};

export default jwtUtils;

// Named exports for convenience
export {
  generateToken,
  verifyToken,
  blacklistToken,
  generateTokenPair,
  decodeToken,
  revokeAllUserTokens,
  isTokenBlacklisted,
  refreshAccessToken,
  defaultJwtConfig as jwtConfig,
};

