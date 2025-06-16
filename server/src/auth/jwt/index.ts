import jwt, { type SignOptions } from 'jsonwebtoken';
const { sign, verify, decode } = jwt;
import { v4 as uuidv4 } from 'uuid';
import { redis } from '../../../utils/redis';
// @ts-ignore - We know the logger exists
import logger from '../../../utils/logger';
import {
  UserRole,
  TokenType,
  TokenPayload,
  TokenVerificationResult,
  JwtConfig,
  AuthTokens
} from './types';

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
 * Generates a JWT token
 */
export const generateToken = async (
  payload: Omit<TokenPayload, 'jti' | 'iat' | 'exp'> & { type: TokenType },
  secret: string = defaultJwtConfig.secret,
  // expiresIn can be a string (e.g., '15m', '1h') or a number of seconds
  // We'll let jsonwebtoken handle the conversion internally
  expiresIn: string | number = defaultJwtConfig.accessExpiresIn,
): Promise<string> => {
  const tokenId = uuidv4();
  
  return new Promise((resolve, reject) => {
    // Create a type-safe sign options object
    const signOptions: SignOptions = {
      issuer: defaultJwtConfig.issuer,
      audience: defaultJwtConfig.audience,
      algorithm: 'HS256',
    };
    
    // Add expiresIn only if provided
    if (expiresIn) {
      signOptions.expiresIn = expiresIn as any; // Type assertion to bypass type checking
    }
    
    sign(
      { ...payload, jti: tokenId },
      secret,
      signOptions,
      (err, token) => {
        if (err || !token) {
          logger.error('Error generating token:', err);
          reject(err || new Error('Failed to generate token'));
        } else {
          resolve(token);
        }
      }
    );
  });
};

/**
 * Decodes a JWT token
 */
export const decodeToken = <T extends Record<string, any> = TokenPayload>(
  token: string
): T | null => {
  try {
    const decoded = decode(token, { complete: true })?.payload;
    if (!decoded) return null;
    
    // Convert to the expected type
    return decoded as unknown as T;
  } catch (error) {
    logger.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Verifies a JWT token
 */
export const verifyToken = async <T extends TokenPayload = TokenPayload>(
  token: string,
  type: TokenType,
  secret: string = defaultJwtConfig.secret
): Promise<TokenVerificationResult<T>> => {
  try {
    if (!token) {
      return { valid: false, error: 'No token provided' };
    }

    // Check token format
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    // Decode without verification to get the jti
    const decoded = decodeToken(token);
    if (!decoded) {
      return { valid: false, error: 'Invalid token payload' };
    }

    const payload = decoded as T;
    
    // Check if token is blacklisted
    if (payload.jti) {
      const isBlacklisted = await redis.get(`${TOKEN_BLACKLIST_PREFIX}${payload.jti}`);
      if (isBlacklisted) {
        return { valid: false, error: 'Token has been revoked', expired: true };
      }
    }

    // Verify token signature and expiration
    try {
      const verified = await new Promise<T>((resolve, reject) => {
        verify(
          token,
          secret,
          {
            issuer: defaultJwtConfig.issuer,
            audience: defaultJwtConfig.audience,
            algorithms: ['HS256'],
          },
          (err, decoded) => {
            if (err) {
              reject(err);
            } else {
              resolve(decoded as T);
            }
          }
        );
      });

      // Verify token type
      if (verified.type !== type) {
        return { valid: false, error: 'Invalid token type' };
      }

      return { valid: true, payload: verified };
    } catch (error: unknown) {
      // Type guard to check if error is an Error object
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          return { valid: false, error: 'Token has expired', expired: true };
        }
        if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
          return { valid: false, error: error.message };
        }
      }
      // For any other type of error, re-throw it
      throw error;
    }
  } catch (error) {
    logger.error('Error verifying token:', error);
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Invalid token' 
    };
  }
};

/**
 * Blacklists a token by its ID
 */
export const blacklistToken = async (
  tokenId: string,
  expiresInSeconds: number = 7 * 24 * 60 * 60 // Default 7 days
): Promise<void> => {
  try {
    await redis.set(
      `${TOKEN_BLACKLIST_PREFIX}${tokenId}`,
      '1',
      'EX',
      expiresInSeconds.toString()
    );
  } catch (error) {
    logger.error('Error blacklisting token:', error);
    throw new Error('Failed to blacklist token');
  }
};

/**
 * Generates an access and refresh token pair
 */
export const generateTokenPair = async (
  userId: string,
  email: string,
  role: UserRole = 'user',
  organizationId?: string
): Promise<AuthTokens> => {
  const accessToken = await generateToken(
    {
      sub: userId,
      email,
      role,
      type: 'access',
      organizationId,
    },
    defaultJwtConfig.secret,
    defaultJwtConfig.accessExpiresIn
  );

  const refreshToken = await generateToken(
    {
      sub: userId,
      email,
      role,
      type: 'refresh',
      organizationId,
    },
    defaultJwtConfig.secret,
    defaultJwtConfig.refreshExpiresIn
  );

  const expiresIn = 
    typeof defaultJwtConfig.accessExpiresIn === 'string'
      ? parseInt(defaultJwtConfig.accessExpiresIn) * 1000
      : defaultJwtConfig.accessExpiresIn * 1000;

  return {
    accessToken,
    refreshToken,
    expiresIn,
    tokenType: 'Bearer',
  };
};

/**
 * Revoke all tokens for a user
 * @deprecated Use session management instead
 */
export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  logger.warn('revokeAllUserTokens is deprecated. Use session management instead.');
  // Implementation would depend on how sessions are stored
};

// Export all types
export * from './types';

// Export the JWT utility functions
const jwtUtils = {
  generateToken,
  verifyToken,
  blacklistToken,
  generateTokenPair,
  decodeToken,
  revokeAllUserTokens,
  config: defaultJwtConfig,
};

export default jwtUtils;
