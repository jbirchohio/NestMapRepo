import { sign, verify, decode, JwtPayload as BaseJwtPayload } from 'jsonwebtoken';
import { redis } from '../db/redis';
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

// Extend JWT payload to include our custom claims
declare module 'jsonwebtoken' {
  interface JwtPayload extends BaseJwtPayload {
    jti: string;
    type: TokenType;
    userId: string;
    email: string;
    role: UserRole;
  }
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
export const generateToken = async (
  userId: string,
  email: string,
  type: TokenType,
  expiresIn: string | number,
  additionalPayload: { role?: UserRole } = {}
): Promise<{ token: string; expiresAt: Date }> => {
  const jti = generateTokenId();
  const expiresInMs = typeof expiresIn === 'string' 
    ? parseInt(expiresIn) * 1000 
    : expiresIn * 1000;
  
  const expiresAt = new Date(Date.now() + expiresInMs);
  const iat = Math.floor(Date.now() / 1000);
  const exp = Math.floor(expiresAt.getTime() / 1000);
  
  const payload: TokenPayload = {
    jti,
    type,
    userId,
    email,
    role: additionalPayload.role || 'user',
    iat,
    exp,
  };

  const token = sign(payload, JWT_SECRET, { 
    expiresIn: typeof expiresIn === 'string' ? expiresIn : `${expiresIn}s`
  });
  
  // Store the token in Redis if it's a refresh token
  if (type === 'refresh') {
    const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    await redis.set(`refresh_token:${jti}`, userId, ttl);
  }

  return { token, expiresAt };
};

/**
 * Verify and decode a JWT token with enhanced security checks
 */
export const verifyToken = async (
  token: string,
  type: TokenType
): Promise<VerifyTokenResult | null> => {
  try {
    const decoded = verify(token, JWT_SECRET) as TokenPayload;
    
    // Verify token type
    if (decoded.type !== type) {
      throw new Error('Invalid token type');
    }

    // For refresh tokens, check if it's been revoked
    if (type === 'refresh') {
      const storedUserId = await redis.get(`refresh_token:${decoded.jti}`);
      if (!storedUserId || storedUserId !== decoded.userId) {
        throw new Error('Token has been revoked');
      }
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
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      const payload = decode(token) as TokenPayload;
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
  role: UserRole = 'user'
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

  // Revoke the old refresh token
  await redis.del(`refresh_token:${payload.jti}`);

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
