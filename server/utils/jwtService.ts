import jwt from 'jsonwebtoken';
const { sign, verify, decode } = jwt;
import { redisClient } from './redis.js';
import { logger } from './logger.js';
import { v4 as uuidv4 } from 'uuid';
import config from '../config.js';

// Token types
export type TokenType = 'access' | 'refresh' | 'password_reset' | 'api_key';
export type UserRole = 'user' | 'admin' | 'superadmin';

// Token interfaces
export interface TokenPayload {
  jti: string;
  userId: string;
  email: string;
  role?: UserRole;
  organization_id?: number;
  type: TokenType;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  tokenType: string;
}

export interface VerifyTokenResult {
  payload: TokenPayload;
  expired: boolean;
}

export interface PasswordResetTokenResult {
  userId: string;
  email: string;
  jti: string;
}

// Define our custom JWT payload interface
declare module 'jsonwebtoken' {
  interface JwtPayload {
    jti: string;
    type: TokenType;
    userId: string;
    email: string;
    role?: UserRole;
    organization_id?: number;
    // Standard JWT fields
    iss?: string;
    sub?: string;
    aud?: string | string[];
    exp?: number;
    nbf?: number;
    iat?: number;
  }
}

// Token blacklist/whitelist key prefixes
const TOKEN_BLACKLIST_KEY_PREFIX = 'jwt_blacklist:';
const TOKEN_WHITELIST_KEY_PREFIX = 'jwt_whitelist:';

/**
 * JWT Service class for handling all JWT operations
 */
export class JwtService {
  private static instance: JwtService;

  // JWT configuration
  private readonly jwtSecret: string;
  private readonly accessTokenExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;
  private readonly passwordResetTokenExpiresIn: string;

  private constructor() {
    this.jwtSecret = config.jwtSecret;
    this.accessTokenExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    this.refreshTokenExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    this.passwordResetTokenExpiresIn = process.env.JWT_PASSWORD_RESET_EXPIRES_IN || '1h';
  }

  /**
   * Get the singleton instance of JwtService
   */
  public static getInstance(): JwtService {
    if (!JwtService.instance) {
      JwtService.instance = new JwtService();
    }
    return JwtService.instance;
  }

  /**
   * Generate a cryptographically secure random token ID
   */
  private generateTokenId(): string {
    return uuidv4();
  }

  /**
   * Get the appropriate expiration time based on token type
   */
  private getExpiresIn(type: TokenType): string {
    switch (type) {
      case 'access':
        return this.accessTokenExpiresIn;
      case 'refresh':
        return this.refreshTokenExpiresIn;
      case 'password_reset':
        return this.passwordResetTokenExpiresIn;
      case 'api_key':
        return '365d'; // API keys last a year by default
      default:
        return '15m'; // Default to 15 minutes
    }
  }

  /**
   * Convert expiration time string to milliseconds
   */
  private getExpiresInMs(expiresIn: string | number): number {
    if (typeof expiresIn === 'number') {
      return expiresIn * 1000;
    }
    
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiration format: ${expiresIn}`);
    }
    
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 15 * 60 * 1000; // Default to 15 minutes
    }
  }

  /**
   * Add a token to the blacklist
   */
  public async addToBlacklist(tokenId: string, expiresAt: number): Promise<void> {
    const ttl = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    await redisClient.set(`${TOKEN_BLACKLIST_KEY_PREFIX}${tokenId}`, '1', 'EX', ttl);
    logger.debug(`Token ${tokenId} added to blacklist for ${ttl} seconds`);
  }

  /**
   * Check if a token is blacklisted
   */
  public async isTokenBlacklisted(tokenId: string): Promise<boolean> {
    const result = await redisClient.get(`${TOKEN_BLACKLIST_KEY_PREFIX}${tokenId}`);
    return result !== null;
  }

  /**
   * Add a refresh token to the whitelist
   */
  public async addToWhitelist(tokenId: string, userId: string, expiresIn: number): Promise<void> {
    const ttl = Math.floor(expiresIn / 1000);
    await redisClient.set(`${TOKEN_WHITELIST_KEY_PREFIX}${tokenId}`, userId, 'EX', ttl);
    logger.debug(`Token ${tokenId} added to whitelist for ${ttl} seconds`);
  }

  /**
   * Check if a refresh token is whitelisted
   */
  public async isTokenWhitelisted(tokenId: string, userId: string): Promise<boolean> {
    const storedUserId = await redisClient.get(`${TOKEN_WHITELIST_KEY_PREFIX}${tokenId}`);
    return storedUserId === userId;
  }

  /**
   * Generate a JWT token with the given payload
   */
  public async generateToken(
    userId: string,
    email: string,
    type: TokenType,
    additionalPayload: { role?: UserRole; organization_id?: number } = {}
  ): Promise<{ token: string; jti: string; expiresAt: Date }> {
    const jti = this.generateTokenId();
    const expiresIn = this.getExpiresIn(type);
    const expiresInMs = this.getExpiresInMs(expiresIn);
    const expiresAt = new Date(Date.now() + expiresInMs);
    
    const payload = {
      jti,
      userId,
      email,
      type,
      ...additionalPayload
    };
    
    const token = sign(payload, this.jwtSecret, {
      expiresIn,
      algorithm: 'HS256',
      audience: 'nestmap-app',
      issuer: 'nestmap-auth'
    });
    
    // For refresh tokens, add to whitelist
    if (type === 'refresh') {
      await this.addToWhitelist(jti, userId, expiresInMs);
    }
    
    return { token, jti, expiresAt };
  }

  /**
   * Verify and decode a JWT token
   */
  public async verifyToken(
    token: string,
    type: TokenType
  ): Promise<VerifyTokenResult | null> {
    try {
      // First decode without verification to get the token ID
      const decoded = decode(token, { complete: true });
      if (!decoded || typeof decoded.payload === 'string') {
        logger.warn('Invalid token format');
        return null;
      }
      
      const { jti, userId } = decoded.payload as JwtPayload;
      
      // Check if token is blacklisted
      if (jti && await this.isTokenBlacklisted(jti)) {
        logger.warn(`Token ${jti} is blacklisted`);
        return null;
      }
      
      // For refresh tokens, check whitelist
      if (type === 'refresh' && jti && userId) {
        const isWhitelisted = await this.isTokenWhitelisted(jti, userId);
        if (!isWhitelisted) {
          logger.warn(`Refresh token ${jti} not in whitelist for user ${userId}`);
          return null;
        }
      }
      
      // Verify the token
      const verified = verify(token, this.jwtSecret, {
        algorithms: ['HS256'],
        audience: 'nestmap-app',
        issuer: 'nestmap-auth'
      }) as JwtPayload;
      
      // Check token type
      if (verified.type !== type) {
        logger.warn(`Token type mismatch: expected ${type}, got ${verified.type}`);
        return null;
      }
      
      return {
        payload: {
          jti: verified.jti,
          userId: verified.userId,
          email: verified.email,
          role: verified.role,
          organization_id: verified.organization_id,
          type: verified.type,
          iat: verified.iat || 0,
          exp: verified.exp || 0
        },
        expired: false
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        // Token is expired but otherwise valid
        try {
          const decoded = decode(token) as JwtPayload;
          if (!decoded) return null;
          
          return {
            payload: {
              jti: decoded.jti,
              userId: decoded.userId,
              email: decoded.email,
              role: decoded.role,
              organization_id: decoded.organization_id,
              type: decoded.type || type,
              iat: decoded.iat || 0,
              exp: decoded.exp || 0
            },
            expired: true
          };
        } catch (decodeError) {
          logger.error('Error decoding expired token:', decodeError);
          return null;
        }
      }
      
      logger.error('Error verifying token:', error);
      return null;
    }
  }

  /**
   * Generate a new access/refresh token pair
   */
  public async generateAuthTokens(
    userId: string,
    email: string,
    role: UserRole = 'user',
    organization_id?: number
  ): Promise<AuthTokens> {
    const additionalPayload = { role, organization_id };
    
    const { token: accessToken, expiresAt: accessTokenExpiresAt } = 
      await this.generateToken(userId, email, 'access', additionalPayload);
      
    const { token: refreshToken, expiresAt: refreshTokenExpiresAt } = 
      await this.generateToken(userId, email, 'refresh', additionalPayload);
    
    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      tokenType: 'Bearer'
    };
  }

  /**
   * Refresh an access token using a refresh token
   */
  public async refreshAccessToken(refreshToken: string): Promise<AuthTokens | null> {
    const result = await this.verifyToken(refreshToken, 'refresh');
    
    if (!result || result.expired) {
      return null;
    }
    
    const { payload } = result;
    
    // Revoke the used refresh token
    if (payload.jti) {
      await this.revokeToken(payload.jti);
    }
    
    // Generate new token pair
    return this.generateAuthTokens(
      payload.userId,
      payload.email,
      payload.role,
      payload.organization_id
    );
  }

  /**
   * Generate a password reset token
   */
  public async generatePasswordResetToken(
    userId: string,
    email: string
  ): Promise<{ token: string; expiresAt: Date }> {
    return this.generateToken(userId, email, 'password_reset');
  }

  /**
   * Verify a password reset token
   */
  public async verifyPasswordResetToken(
    token: string
  ): Promise<PasswordResetTokenResult | null> {
    const result = await this.verifyToken(token, 'password_reset');
    
    if (!result || result.expired) {
      return null;
    }
    
    const { payload } = result;
    
    return {
      userId: payload.userId,
      email: payload.email,
      jti: payload.jti
    };
  }

  /**
   * Revoke a token by its ID
   */
  public async revokeToken(tokenId: string): Promise<void> {
    // Add to blacklist with a long expiry (30 days)
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    await this.addToBlacklist(tokenId, expiresAt);
    
    // Remove from whitelist if it's there
    await redisClient.del(`${TOKEN_WHITELIST_KEY_PREFIX}${tokenId}`);
    
    logger.debug(`Token ${tokenId} revoked`);
  }

  /**
   * Revoke all tokens for a user
   */
  public async revokeAllUserTokens(userId: string): Promise<void> {
    // We'll use a pattern to find all whitelist entries for this user
    const keys = await redisClient.keys(`${TOKEN_WHITELIST_KEY_PREFIX}*`);
    
    for (const key of keys) {
      const storedUserId = await redisClient.get(key);
      
      if (storedUserId === userId) {
        const tokenId = key.replace(TOKEN_WHITELIST_KEY_PREFIX, '');
        await this.revokeToken(tokenId);
      }
    }
    
    logger.info(`All tokens revoked for user ${userId}`);
  }
}

// Export singleton instance
export const jwtService = JwtService.getInstance();
