/**
 * Auth Service Implementation
 * Implements the IAuthService interface
 */
import { compare, hash } from 'bcrypt';
import { sign, decode, verify } from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { IAuthService, LoginRequest, LoginResponse, RefreshTokenRequest } from './auth.service.interface';
import { UserRole } from '../types';
import { Logger } from '../utils/logger';
import { redisClient } from '../utils/redis';

export class AuthService implements IAuthService {
  private readonly logger = new Logger('AuthService');
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
  private readonly SALT_ROUNDS = 10;

  /**
   * Generate JWT tokens for authentication
   */
  private async generateAuthTokens(
    userId: string,
    email: string,
    role: UserRole,
    organizationId?: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const tokenId = crypto.randomUUID();
    const payload = {
      sub: userId,
      email,
      role,
      organizationId
    };

    // Calculate expiry in seconds for client
    const expiresIn = 15 * 60; // 15 minutes in seconds

    const accessToken = sign(
      { ...payload, jti: tokenId },
      this.JWT_SECRET,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = sign(
      { ...payload, jti: crypto.randomUUID() },
      this.JWT_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRY }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn
    };
  }

  /**
   * Verify and decode a JWT token
   */
  private async verifyToken(token: string, type: 'access' | 'refresh'): Promise<{
    valid: boolean;
    expired: boolean;
    payload?: any;
    error?: string;
  }> {
    try {
      // First check if token is in blacklist
      const isRevoked = await this.isTokenRevoked(token);
      if (isRevoked) {
        return {
          valid: false,
          expired: false,
          error: 'Token has been revoked'
        };
      }

      const decoded = verify(token, this.JWT_SECRET);
      return {
        valid: true,
        expired: false,
        payload: decoded
      };
    } catch (error: any) {
      return {
        valid: false,
        expired: error.name === 'TokenExpiredError',
        error: error.message
      };
    }
  }

  /**
   * Check if a token has been revoked
   */
  private async isTokenRevoked(token: string): Promise<boolean> {
    try {
      const decoded = decode(token, { json: true }) as { jti?: string } | null;
      if (!decoded?.jti) return false;

      const result = await redisClient.get(`revoked:${decoded.jti}`);
      return !!result;
    } catch (error) {
      this.logger.error('Error checking token revocation:', error);
      return false;
    }
  }

  /**
   * Revoke a token by adding it to the blacklist
   */
  private async revokeToken(tokenId: string, ttl: number): Promise<void> {
    try {
      await redisClient.set(`revoked:${tokenId}`, '1', 'EX', ttl);
    } catch (error) {
      this.logger.error('Error revoking token:', error);
      throw new Error('Failed to revoke token');
    }
  }

  /**
   * Authenticate a user and generate tokens
   */
  async login(loginData: LoginRequest, ip: string, userAgent: string): Promise<LoginResponse> {
    const { email, password } = loginData;

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (!user || !user.password_hash) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateAuthTokens(
      user.id,
      user.email,
      (user.role as UserRole) || 'user',
      user.organization_id || undefined
    );

    // Update last login
    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Log the login
    this.logger.info(`User logged in: ${user.email} from ${ip} using ${userAgent}`);

    // Return response
    return {
      ...tokens,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
        organizationId: user.organization_id
      }
    };
  }

  /**
   * Refresh access token using a valid refresh token
   */
  async refreshToken(data: RefreshTokenRequest, ip: string, userAgent: string): Promise<LoginResponse> {
    const { refreshToken } = data;

    // Verify refresh token
    const result = await this.verifyToken(refreshToken, 'refresh');
    
    if (!result.valid || !result.payload) {
      throw new Error(result.error || 'Invalid refresh token');
    }

    // Get user from database
    const [user] = await db.select().from(users).where(eq(users.id, result.payload.sub));

    if (!user) {
      throw new Error('User not found');
    }

    // Generate new tokens
    const tokens = await this.generateAuthTokens(
      user.id,
      user.email,
      (user.role as UserRole) || 'user',
      user.organization_id || undefined
    );

    // Log the token refresh
    this.logger.info(`Token refreshed for user: ${user.email} from ${ip} using ${userAgent}`);

    return {
      ...tokens,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
        organizationId: user.organization_id
      }
    };
  }

  /**
   * Logout a user by revoking their tokens
   */
  async logout(refreshToken: string, authHeader?: string): Promise<void> {
    // Revoke refresh token
    const refreshDecoded = decode(refreshToken, { json: true }) as { jti?: string; exp?: number } | null;
    if (refreshDecoded?.jti && refreshDecoded.exp) {
      const ttl = Math.ceil((refreshDecoded.exp * 1000 - Date.now()) / 1000);
      if (ttl > 0) {
        await this.revokeToken(refreshDecoded.jti, ttl);
      }
    }

    // Also revoke access token if provided
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const decoded = decode(token, { json: true }) as { jti?: string; exp?: number } | null;
        if (decoded?.jti && decoded.exp) {
          const ttl = Math.ceil((decoded.exp * 1000 - Date.now()) / 1000);
          if (ttl > 0) {
            await this.revokeToken(decoded.jti, ttl);
          }
        }
      }
    }
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllSessions(userId: string): Promise<void> {
    // In a real implementation, this would:
    // 1. Track all active tokens for a user
    // 2. Add them all to the revoked tokens list
    // For now, we'll just log the action
    this.logger.info(`Revoked all sessions for user: ${userId}`);
  }

  /**
   * Request a password reset for a user
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (user) {
      // In a real implementation, you would:
      // 1. Generate a password reset token
      // 2. Store it with an expiry
      // 3. Send an email with the reset link
      this.logger.info(`Password reset requested for: ${email}`);
    }
  }

  /**
   * Reset a user's password using a valid reset token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // In a real implementation, you would:
    // 1. Verify the reset token
    // 2. Find the associated user
    // 3. Update their password
    // 4. Invalidate the token
    
    // For now, we'll just log the attempt
    this.logger.info(`Password reset attempt with token: ${token.substring(0, 10)}...`);
  }
}
