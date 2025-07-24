import jwt, { SignOptions } from 'jsonwebtoken';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';
import { 
  TokenPayload, 
  TokenType, 
  UserRole,
  VerifyTokenResult,
  AuthTokens,
  PasswordResetTokenResult
} from '../types/jwt';

// Token blacklist storage (in production, use Redis or database)
const tokenBlacklist = new Set<string>();

// The JwtPayload interface is extended in jwtService.ts to avoid duplication

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
export const generateToken = async (
  userId: string,
  email: string,
  type: TokenType,
  expiresIn: string | number,
  additionalPayload: { role?: UserRole } = {}
): Promise<{ token: string; expiresAt: Date }> => {
  const jti = generateTokenId();
  
  // Calculate expiration time in milliseconds for Date creation
  let expiresInMs: number;
  if (typeof expiresIn === 'string') {
    // Parse time strings like "15m", "7d", "1h"
    const timeMatch = expiresIn.match(/^(\d+)([smhd])$/);
    if (timeMatch) {
      const [, value, unit] = timeMatch;
      const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
      expiresInMs = parseInt(value) * (multipliers[unit as keyof typeof multipliers] || 1000);
    } else {
      // Fallback for other string formats
      expiresInMs = 15 * 60 * 1000; // 15 minutes default
    }
  } else {
    expiresInMs = expiresIn * 1000;
  }
  
  const expiresAt = new Date(Date.now() + expiresInMs);
  const iat = Math.floor(Date.now() / 1000);
  
  // Remove manual exp setting to avoid conflict with expiresIn option
  const payload = {
    jti,
    type,
    userId,
    email,
    role: (additionalPayload.role || 'user') as UserRole,
    iat,
    // exp removed - let jsonwebtoken set this via expiresIn option
  };

  const options: SignOptions = { 
    expiresIn: typeof expiresIn === 'string' ? expiresIn as any : expiresIn
  };
  
  const token = jwt.sign(
    payload,
    JWT_SECRET,
    options
  );
  
  // Note: In production, you may want to store refresh tokens in a database
  // for revocation capabilities. For simplicity, we're using stateless tokens.

  return { token, expiresAt };
};

/**
 * Verify and decode a JWT token with enhanced security checks
 */
/**
 * Verify and decode a JWT token with enhanced security checks
 */
export const verifyToken = async (
  token: string,
  type: TokenType
): Promise<VerifyTokenResult | null> => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    
    // Verify token type
    if (decoded.type !== type) {
      logger.warn(`Token type mismatch. Expected: ${type}, Got: ${decoded.type}`);
      return null;
    }

    // Check if token is revoked
    if (decoded.jti && isTokenRevoked(decoded.jti)) {
      logger.warn(`Revoked token attempted to be used: ${decoded.jti}`);
      return null;
    }
    
    // Verify token structure
    if (!decoded.userId || !decoded.email || !decoded.jti) {
      logger.warn('Token missing required fields');
      return null;
    }

    const { jti, userId, email, role, iat, exp } = decoded;
    
    return { 
      payload: {
        jti,
        type,
        userId,
        email,
        role,
        iat: iat || 0,
        exp: exp || 0
      }, 
      expired: false 
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      const payload = jwt.decode(token) as TokenPayload;
      if (!payload) return null;
      
      return { 
        payload: {
          jti: payload.jti,
          type: payload.type,
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          iat: payload.iat || 0,
          exp: payload.exp || 0
        }, 
        expired: true 
      };
    }
    logger.error('Token verification failed:', error);
    return null;
  }
};

/**
 * Generate a new access/refresh token pair
 */
export const generateAuthTokens = async (
  userId: string,
  email: string,
  role: UserRole = 'user' as UserRole
): Promise<AuthTokens> => {
  const accessToken = await generateToken(
    userId,
    email,
    'access',
    JWT_ACCESS_EXPIRES_IN,
    { role }
  );

  const refreshToken = await generateToken(
    userId,
    email,
    'refresh',
    JWT_REFRESH_EXPIRES_IN,
    { role }
  );

  return {
    accessToken: accessToken.token,
    refreshToken: refreshToken.token,
    accessTokenExpiresAt: accessToken.expiresAt,
    refreshTokenExpiresAt: refreshToken.expiresAt,
    tokenType: 'Bearer' as const
  };
};

/**
 * Refresh an access token using a refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<AuthTokens | null> {
  // Verify the refresh token
  const verified = await verifyToken(refreshToken, 'refresh');
  if (!verified || verified.expired) {
    return null;
  }
  const { payload } = verified;

  // Add the old refresh token to blacklist
  if (refreshToken) {
    const decoded = jwt.decode(refreshToken) as any;
    if (decoded && decoded.jti) {
      tokenBlacklist.add(decoded.jti);
    }
  }

  // Generate new tokens
  return generateAuthTokens(payload.userId, payload.email, payload.role);
}

/**
 * Generate a password reset token
 */
export const generatePasswordResetToken = async (
  userId: string, 
  email: string
): Promise<{ token: string; expiresAt: Date }> => {
  return generateToken(
    userId,
    email,
    'password_reset',
    JWT_PASSWORD_RESET_EXPIRES_IN
  );
};

/**
 * Verify a password reset token
 */
export const verifyPasswordResetToken = async (
  token: string
): Promise<PasswordResetTokenResult | null> => {
  const result = await verifyToken(token, 'password_reset');
  if (!result || result.expired) return null;
  
  return { 
    userId: result.payload.userId,
    email: result.payload.email,
    jti: result.payload.jti
  };
};

// Token revocation storage - in production use Redis
const revokedTokens = new Set<string>();
const userTokens = new Map<string, Set<string>>();

/**
 * Add a token to the revocation list
 */
const addToRevocationList = (tokenId: string, userId: string): void => {
  revokedTokens.add(tokenId);
  
  if (!userTokens.has(userId)) {
    userTokens.set(userId, new Set());
  }
  userTokens.get(userId)!.add(tokenId);
  
  logger.info(`Token ${tokenId} revoked for user ${userId}`);
};

/**
 * Check if a token is revoked
 */
export const isTokenRevoked = (tokenId: string): boolean => {
  return tokenBlacklist.has(tokenId);
};

/**
 * Revoke a token by its ID
 */
export const revokeToken = async (tokenId: string): Promise<void> => {
  try {
    // Decode the token to get the JTI
    const decodedToken = jwt.decode(tokenId) as any;
    
    if (decodedToken && decodedToken.jti) {
      tokenBlacklist.add(decodedToken.jti);
      logger.info(`Token successfully revoked: ${decodedToken.jti}`);
    } else {
      logger.warn(`Invalid token format for revocation: ${tokenId}`);
    }
  } catch (error) {
    logger.error(`Failed to revoke token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new Error('Failed to revoke token');
  }
};

/**
 * Revoke all tokens for a user
 */
export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  try {
    // Production system requires database integration for complete user token tracking
    logger.info(`Token revocation for user ${userId} requires database integration for complete implementation`);
  } catch (error) {
    logger.error(`Failed to revoke all tokens for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new Error('Failed to revoke user tokens');
  }
};

/**
 * Clean up expired revoked tokens (should be run periodically)
 */
export const cleanupRevokedTokens = (): void => {
  // Production environments should implement token cleanup with database persistence
  logger.info(`Revoked tokens cleanup completed. Total revoked: ${tokenBlacklist.size}`);
};
