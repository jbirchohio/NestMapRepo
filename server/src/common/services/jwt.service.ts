import { sign, verify, decode, SignOptions, VerifyOptions, JwtPayload as RawJwtPayload } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { redisClient } from '../../utils/redis';
import { 
  JwtPayload, 
  AuthTokens, 
  AccessTokenPayload, 
  RefreshTokenPayload, 
  TokenType,
  AuthError,
  AuthErrorCode
} from '../../../shared/types/auth';
import { UserRole } from '../../../shared/types/auth/permissions';
import logger from '../../utils/logger';

interface TokenConfig {
  secret: string;
  accessTokenExpiresIn: string | number;
  refreshTokenExpiresIn: string | number;
  issuer: string;
  audience: string | string[];
}

export class JwtService {
  private readonly config: TokenConfig;
  private readonly tokenBlacklistKey = 'jwt:blacklist:';

  constructor(config: TokenConfig) {
    this.config = {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
      refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
      issuer: process.env.JWT_ISSUER || 'nestmap-api',
      audience: process.env.JWT_AUDIENCE?.split(',') || ['nestmap-web', 'nestmap-mobile'],
      ...config,
    };
  }

  /**
   * Generate access and refresh tokens for a user
   */
  public async generateTokens(
    userId: string,
    email: string,
    role: UserRole,
    organizationId: string | null = null,
    permissions: string[] = []
  ): Promise<AuthTokens> {
    const now = Math.floor(Date.now() / 1000);
    const accessTokenExpiresIn = this.parseTimeToSeconds(this.config.accessTokenExpiresIn);
    const refreshTokenExpiresIn = this.parseTimeToSeconds(this.config.refreshTokenExpiresIn);

    // Create token IDs for tracking
    const accessTokenId = randomUUID();
    const refreshTokenId = randomUUID();

    // Create token payloads
    const accessTokenPayload: AccessTokenPayload = {
      jti: accessTokenId,
      sub: userId,
      iat: now,
      exp: now + accessTokenExpiresIn,
      type: 'access',
      email,
      role,
      organization_id: organizationId,
      permissions,
    };

    const refreshTokenPayload: RefreshTokenPayload = {
      jti: refreshTokenId,
      sub: userId,
      iat: now,
      exp: now + refreshTokenExpiresIn,
      type: 'refresh',
      parent_jti: accessTokenId,
    };

    // Sign tokens
    const [accessToken, refreshToken] = await Promise.all([
      this.signToken(accessTokenPayload, this.config.secret, {
        expiresIn: this.config.accessTokenExpiresIn,
      }),
      this.signToken(refreshTokenPayload, this.config.secret, {
        expiresIn: this.config.refreshTokenExpiresIn,
      }),
    ]);

    // Store refresh token in Redis
    await this.storeRefreshToken(userId, refreshTokenId, refreshTokenPayload.exp);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: new Date((now + accessTokenExpiresIn) * 1000).toISOString(),
      token_type: 'Bearer',
    };
  }

  /**
   * Verify and decode a JWT token
   */
  public async verifyToken<T extends JwtPayload>(
    token: string,
    type?: TokenType
  ): Promise<T> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new AuthError(AuthErrorCode.TOKEN_REVOKED, 'Token has been revoked');
      }

      // Verify token signature and decode
      const payload = verify(token, this.config.secret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
      }) as T;

      // Validate token type if specified
      if (type && payload.type !== type) {
        throw new AuthError(AuthErrorCode.INVALID_TOKEN, `Invalid token type: expected ${type}`);
      }

      return payload;
    } catch (error) {
      if (error instanceof AuthError) throw error;
      
      // Handle JWT verification errors
      if (error.name === 'TokenExpiredError') {
        throw new AuthError(AuthErrorCode.EXPIRED_TOKEN, 'Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new AuthError(AuthErrorCode.INVALID_TOKEN, 'Invalid token');
      }
      
      logger.error('Error verifying token:', error);
      throw new AuthError(AuthErrorCode.UNKNOWN_ERROR, 'Failed to verify token');
    }
  }

  /**
   * Refresh an access token using a refresh token
   */
  public async refreshToken(refreshToken: string): Promise<AuthTokens> {
    // Verify the refresh token
    const payload = await this.verifyToken<RefreshTokenPayload>(refreshToken, 'refresh');
    
    // Check if refresh token is valid in Redis
    const isValid = await this.validateRefreshToken(payload.sub, payload.jti);
    if (!isValid) {
      throw new AuthError(AuthErrorCode.TOKEN_REVOKED, 'Refresh token has been revoked');
    }

    // Get user data from database (you'll need to implement this)
    const user = await this.getUserById(payload.sub);
    if (!user) {
      throw new AuthError(AuthErrorCode.USER_NOT_FOUND, 'User not found');
    }

    // Invalidate the used refresh token
    await this.revokeToken(refreshToken);

    // Generate new tokens
    return this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.organization_id,
      user.permissions
    );
  }

  /**
   * Revoke a token (add to blacklist)
   */
  public async revokeToken(token: string): Promise<void> {
    try {
      // Get token expiration
      const decoded = decode(token) as { exp?: number };
      const expiresIn = decoded.exp ? Math.max(0, decoded.exp - Math.floor(Date.now() / 1000)) : 3600;
      
      // Add to Redis blacklist
      await redisClient.setex(
        `${this.tokenBlacklistKey}${this.hashToken(token)}`,
        expiresIn,
        'revoked'
      );
    } catch (error) {
      logger.error('Error revoking token:', error);
      throw new AuthError(AuthErrorCode.UNKNOWN_ERROR, 'Failed to revoke token');
    }
  }

  /**
   * Invalidate all user's refresh tokens
   */
  public async invalidateUserTokens(userId: string): Promise<void> {
    try {
      await redisClient.del(`user:${userId}:refresh_tokens`);
    } catch (error) {
      logger.error('Error invalidating user tokens:', error);
      throw new AuthError(AuthErrorCode.UNKNOWN_ERROR, 'Failed to invalidate user tokens');
    }
  }

  // Private helper methods
  private async signToken(
    payload: object,
    secret: string,
    options: SignOptions = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      sign(
        payload,
        secret,
        {
          issuer: this.config.issuer,
          audience: this.config.audience,
          ...options,
        },
        (err, token) => {
          if (err || !token) {
            return reject(err || new Error('Failed to sign token'));
          }
          resolve(token);
        }
      );
    });
  }

  private async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const result = await redisClient.get(`${this.tokenBlacklistKey}${this.hashToken(token)}`);
      return result !== null;
    } catch (error) {
      logger.error('Error checking token blacklist:', error);
      return false; // Fail open for availability
    }
  }

  private async storeRefreshToken(userId: string, tokenId: string, expiresAt: number): Promise<void> {
    try {
      const ttl = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
      await redisClient.hset(
        `user:${userId}:refresh_tokens`,
        tokenId,
        'valid'
      );
      await redisClient.expire(`user:${userId}:refresh_tokens`, ttl);
    } catch (error) {
      logger.error('Error storing refresh token:', error);
      throw new AuthError(AuthErrorCode.UNKNOWN_ERROR, 'Failed to store refresh token');
    }
  }

  private async validateRefreshToken(userId: string, tokenId: string): Promise<boolean> {
    try {
      const result = await redisClient.hget(`user:${userId}:refresh_tokens`, tokenId);
      return result === 'valid';
    } catch (error) {
      logger.error('Error validating refresh token:', error);
      return false;
    }
  }

  private hashToken(token: string): string {
    // Simple hash for blacklist key - in production, use a proper cryptographic hash
    return require('crypto').createHash('sha256').update(token).digest('hex');
  }

  private parseTimeToSeconds(time: string | number): number {
    if (typeof time === 'number') return time;
    
    const match = time.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid time format: ${time}. Expected format: 1s, 2m, 3h, 4d`);
    }
    
    const [, value, unit] = match;
    const numValue = parseInt(value, 10);
    
    switch (unit) {
      case 's': return numValue;
      case 'm': return numValue * 60;
      case 'h': return numValue * 60 * 60;
      case 'd': return numValue * 60 * 60 * 24;
      default: return numValue;
    }
  }

  // This should be implemented to fetch user data from your database
  private async getUserById(userId: string): Promise<{
    id: string;
    email: string;
    role: UserRole;
    organization_id: string | null;
    permissions: string[];
  } | null> {
    // Implement database lookup here
    throw new Error('getUserById not implemented');
  }
}

// Export a singleton instance
export const jwtService = new JwtService({
  secret: process.env.JWT_SECRET || 'your-secret-key',
  accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
  refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
  issuer: process.env.JWT_ISSUER || 'nestmap-api',
  audience: process.env.JWT_AUDIENCE?.split(',') || ['nestmap-web', 'nestmap-mobile'],
});
