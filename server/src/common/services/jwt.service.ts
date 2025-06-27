import { sign, verify, decode } from 'jsonwebtoken';
import type { SignOptions, VerifyOptions, JwtPayload as RawJwtPayload } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import redisClient from '../../utils/redis.js';
import logger from '../../utils/logger.js';

// Import shared types from the correct path
import type { 
  JwtPayload, 
  AuthTokens, 
  AccessTokenPayload, 
  RefreshTokenPayload, 
  TokenType,
  TokenVerificationResult,
  User
} from '../../../../shared/src/types/auth/index.js';

// Import AuthError and AuthErrorCode as values
import { AuthError } from '../../../../shared/src/types/auth/auth.js';
import { AuthErrorCode } from '../../../../shared/src/types/auth/auth.js';
import { UserRole } from '../../../../shared/src/types/auth/permissions.js';

// Extend User type to include all required fields
interface UserWithPermissions extends Omit<User, 'email_verified'> {
  email_verified: boolean;
  permissions: string[];
  organization_id: string | null;
}

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

  constructor(config: Partial<TokenConfig> = {}) {
    this.config = {
      secret: config.secret || process.env.JWT_SECRET || 'your-secret-key',
      accessTokenExpiresIn: config.accessTokenExpiresIn || process.env.JWT_ACCESS_EXPIRATION || '15m',
      refreshTokenExpiresIn: config.refreshTokenExpiresIn || process.env.JWT_REFRESH_EXPIRATION || '7d',
      issuer: config.issuer || process.env.JWT_ISSUER || 'nestmap-api',
      audience: config.audience || process.env.JWT_AUDIENCE?.split(',') || ['nestmap-web', 'nestmap-mobile']
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
        expiresIn: this.parseTimeToSeconds(this.config.accessTokenExpiresIn),
      }),
      this.signToken(refreshTokenPayload, this.config.secret, {
        expiresIn: this.parseTimeToSeconds(this.config.refreshTokenExpiresIn),
      }),
    ]);

    // Store refresh token in Redis
    await this.storeRefreshToken(userId, refreshTokenId, refreshTokenPayload.exp);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: new Date((now + accessTokenExpiresIn) * 1000).toISOString(),
      token_type: 'Bearer',
      accessTokenExpiresAt: new Date((now + accessTokenExpiresIn) * 1000),
      refreshTokenExpiresAt: new Date((now + refreshTokenExpiresIn) * 1000)
    } as AuthTokens;
  }

  /**
   * Verify and decode a JWT token
   */
  public async verifyToken<T extends JwtPayload>(
    token: string,
    type?: TokenType
  ): Promise<TokenVerificationResult<T>> {
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
        return {
          valid: false,
          error: `Invalid token type: expected ${type}`,
          code: AuthErrorCode.INVALID_TOKEN,
          expired: false
        };
      }

      return {
        valid: true,
        payload,
        expired: false
      };
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        return {
          valid: false,
          error: error.message,
          code: error.code,
          expired: error.code === AuthErrorCode.EXPIRED_TOKEN
        };
      }
      
      // Handle JWT verification errors
      const err = error as Error;
      if (err.name === 'TokenExpiredError') {
        return {
          valid: false,
          error: 'Token has expired',
          code: AuthErrorCode.EXPIRED_TOKEN,
          expired: true
        };
      }
      
      if (err.name === 'JsonWebTokenError') {
        return {
          valid: false,
          error: err.message || 'Invalid token',
          code: AuthErrorCode.INVALID_TOKEN,
          expired: false
        };
      }
      
      logger.error('Error verifying token:', error instanceof Error ? error.message : String(error));
      return {
        valid: false,
        error: 'Failed to verify token',
        code: AuthErrorCode.UNKNOWN_ERROR,
        expired: false
      };
    }
  }

  /**
   * Refresh an access token using a refresh token
   */
  public async refreshToken(refreshToken: string): Promise<AuthTokens> {
    // Verify the refresh token
    const result = await this.verifyToken<RefreshTokenPayload>(refreshToken, 'refresh');
    
    if (!result.valid) {
      throw new AuthError(
        result.code as AuthErrorCode || AuthErrorCode.INVALID_TOKEN, 
        result.error || 'Invalid refresh token'
      );
    }
    
    const payload = result.payload!;
    
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
    options: Omit<SignOptions, 'expiresIn' | 'issuer' | 'audience'> & { 
      expiresIn?: SignOptions['expiresIn'];
      issuer?: string;
      audience?: string | string[];
    } = {}
  ): Promise<string> {
    const signOptions: SignOptions = {
      ...options,
      issuer: options.issuer || this.config.issuer,
      audience: options.audience || this.config.audience,
    };
    return new Promise((resolve, reject) => {
      sign(
        payload,
        secret,
        signOptions,
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

  /**
   * Fetch user data from the database
   * This should be implemented to fetch user data from your actual database
   */
  private async getUserById(userId: string): Promise<UserWithPermissions | null> {
    try {
      // TODO: Implement actual database lookup
      // This is a placeholder implementation
      return {
        id: userId,
        email: 'user@example.com',
        display_name: 'User',
        role: 'member' as const,
        organization_id: null,
        permissions: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_verified: false,
        is_active: true
      } as unknown as UserWithPermissions;
    } catch (error) {
      logger.error(`Error fetching user ${userId}:`, error);
      return null;
    }
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
