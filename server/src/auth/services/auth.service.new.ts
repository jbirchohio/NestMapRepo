import { compare, hash } from 'bcrypt';
import { randomBytes } from 'crypto';
import { inject, injectable } from 'inversify';
import { DateTime } from 'luxon';
import { and, eq } from 'drizzle-orm';

import { db } from '../../../db/db.js';
import { users, refreshTokens } from '../../../db/schema.js';
import { JwtService } from '../../../common/services/jwt.service.js';
import { IAuthService } from '../interfaces/auth.service.interface.js';
import { UserRepository } from '../../common/repositories/user/user.repository.interface.js';
import { RefreshTokenRepository } from '../interfaces/refresh-token.repository.interface.js';
import { 
  AuthError, 
  AuthErrorCode, 
  AuthResponse, 
  LoginDto, 
  RequestPasswordResetDto, 
  ResetPasswordDto 
} from '../../../../shared/types/auth';
import { logger } from '../../../../utils/logger.js';
import { TYPES } from '../../../types.js';
import { UserRole } from '../../../../shared/types/auth/permissions';

@injectable()
export class AuthService implements IAuthService {
  private readonly SALT_ROUNDS = 10;
  private readonly PASSWORD_RESET_TOKEN_BYTES = 32;
  private readonly PASSWORD_RESET_EXPIRES_HOURS = 24;

  constructor(
    @inject(TYPES.JwtService) private readonly jwtService: JwtService,
    @inject(TYPES.UserRepository) private readonly userRepository: UserRepository,
    @inject(TYPES.RefreshTokenRepository) private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  /**
   * Authenticate a user with email and password
   */
  public async login(loginData: LoginDto, ip: string, userAgent: string): Promise<AuthResponse> {
    const { email, password } = loginData;

    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AuthError(AuthErrorCode.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AuthError(AuthErrorCode.USER_DISABLED, 'Account is disabled');
    }

    // Verify password
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      // Log failed login attempt
      await this.logFailedLoginAttempt(user.id, ip);
      throw new AuthError(AuthErrorCode.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    // Reset failed login attempts on successful login
    await this.resetFailedLoginAttempts(user.id);

    // Generate tokens
    const tokens = await this.jwtService.generateTokens(
      user.id,
      user.email,
      user.role as UserRole,
      user.organizationId,
      user.permissions || []
    );

    // Store refresh token
    await this.storeRefreshToken(
      user.id,
      tokens.refresh_token,
      ip,
      userAgent
    );

    // Return auth response
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organization_id: user.organizationId,
        email_verified: user.emailVerified,
        is_active: user.isActive,
        first_name: user.firstName,
        last_name: user.lastName,
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString(),
      }
    };
  }

  /**
   * Refresh an access token using a refresh token
   */
  public async refreshToken(refreshToken: string, ip: string, userAgent: string): Promise<AuthResponse> {
    try {
      // Verify the refresh token
      const payload = await this.jwtService.verifyToken(refreshToken);
      
      if (payload.type !== 'refresh') {
        throw new AuthError(AuthErrorCode.INVALID_TOKEN, 'Invalid token type');
      }

      // Get the user
      const user = await this.userRepository.findById(payload.sub);
      if (!user) {
        throw new AuthError(AuthErrorCode.USER_NOT_FOUND, 'User not found');
      }

      // Check if the refresh token is valid in the database
      const isValid = await this.refreshTokenRepository.isValid(
        user.id,
        payload.jti,
        refreshToken
      );

      if (!isValid) {
        throw new AuthError(AuthErrorCode.TOKEN_REVOKED, 'Refresh token has been revoked');
      }

      // Generate new tokens
      const tokens = await this.jwtService.generateTokens(
        user.id,
        user.email,
        user.role as UserRole,
        user.organizationId,
        user.permissions || []
      );

      // Invalidate the old refresh token
      await this.refreshTokenRepository.invalidate(payload.jti);

      // Store the new refresh token
      await this.storeRefreshToken(
        user.id,
        tokens.refresh_token,
        ip,
        userAgent
      );

      // Return the new tokens
      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          organization_id: user.organizationId,
          email_verified: user.emailVerified,
          is_active: user.isActive,
          first_name: user.firstName,
          last_name: user.lastName,
          created_at: user.createdAt.toISOString(),
          updated_at: user.updatedAt.toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      logger.error('Error refreshing token:', error);
      throw new AuthError(AuthErrorCode.INVALID_TOKEN, 'Invalid or expired refresh token');
    }
  }

  /**
   * Log out the current user by revoking their tokens
   */
  public async logout(refreshToken: string, accessToken?: string): Promise<void> {
    try {
      // Revoke the refresh token
      if (refreshToken) {
        const payload = await this.jwtService.verifyToken(refreshToken);
        if (payload.type === 'refresh') {
          await this.refreshTokenRepository.invalidate(payload.jti);
        }
      }

      // Revoke the access token if provided
      if (accessToken) {
        try {
          await this.jwtService.revokeToken(accessToken);
        } catch (error) {
          // Ignore errors for access token revocation
          logger.warn('Error revoking access token:', error);
        }
      }
    } catch (error) {
      // Ignore errors for invalid tokens during logout
      logger.warn('Error during logout:', error);
    }
  }

  /**
   * Request a password reset email
   */
  public async requestPasswordReset(data: RequestPasswordResetDto): Promise<void> {
    const { email } = data;

    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal that the email doesn't exist
      return;
    }

    // Generate a reset token
    const resetToken = randomBytes(this.PASSWORD_RESET_TOKEN_BYTES).toString('hex');
    const resetTokenExpires = DateTime.now().plus({ hours: this.PASSWORD_RESET_EXPIRES_HOURS }).toJSDate();

    // Store the reset token in the database
    await db.update(users)
      .set({
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetTokenExpires,
      })
      .where(eq(users.id, user.id));

    // TODO: Send password reset email
    logger.info(`Password reset token for ${email}: ${resetToken}`);
  }

  /**
   * Reset a user's password using a reset token
   */
  public async resetPassword(data: ResetPasswordDto): Promise<void> {
    const { token, newPassword } = data;

    // Find user by reset token
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.resetPasswordToken, token),
        users.resetPasswordExpires > new Date()
      ),
    });

    if (!user) {
      throw new AuthError(AuthErrorCode.INVALID_TOKEN, 'Invalid or expired reset token');
    }

    // Hash the new password
    const hashedPassword = await hash(newPassword, this.SALT_ROUNDS);

    // Update the user's password and clear the reset token
    await db.update(users)
      .set({
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        passwordChangedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Invalidate all user's refresh tokens
    await this.refreshTokenRepository.invalidateAllForUser(user.id);
  }

  /**
   * Revoke all active sessions for a user
   */
  public async revokeAllSessions(userId: string): Promise<void> {
    // Invalidate all refresh tokens for the user
    await this.refreshTokenRepository.invalidateAllForUser(userId);
    
    // Invalidate all access tokens for the user (if using token blacklisting)
    await this.jwtService.invalidateUserTokens(userId);
  }

  /**
   * Verify if the current user is authenticated
   */
  public async isAuthenticated(accessToken: string): Promise<boolean> {
    try {
      await this.jwtService.verifyToken(accessToken, 'access');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the current user's information
   */
  public async getCurrentUser(accessToken: string): Promise<{
    id: string;
    email: string;
    role: string;
    organization_id: string | null;
    permissions: string[];
  } | null> {
    try {
      const payload = await this.jwtService.verifyToken<{
        sub: string;
        email: string;
        role: string;
        organization_id: string | null;
        permissions: string[];
      }>(accessToken, 'access');

      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        organization_id: payload.organization_id,
        permissions: payload.permissions || [],
      };
    } catch (error) {
      return null;
    }
  }

  // Private helper methods
  private async logFailedLoginAttempt(userId: string, ip: string): Promise<void> {
    // TODO: Implement failed login attempt logging
    logger.warn(`Failed login attempt for user ${userId} from IP ${ip}`);
  }

  private async resetFailedLoginAttempts(userId: string): Promise<void> {
    // TODO: Reset failed login attempts counter
  }

  private async storeRefreshToken(
    userId: string,
    token: string,
    ip: string,
    userAgent: string
  ): Promise<void> {
    // Decode the token to get the JTI and expiration
    const decoded = this.jwtService.decodeToken(token);
    if (!decoded) {
      throw new AuthError(AuthErrorCode.INVALID_TOKEN, 'Invalid token');
    }

    // Store the refresh token in the database
    await this.refreshTokenRepository.create({
      id: decoded.jti,
      userId,
      token,
      expiresAt: new Date(decoded.exp * 1000),
      createdAt: new Date(decoded.iat * 1000),
      createdByIp: ip,
      userAgent,
    });
  }

  // Helper to decode token without verification
  private decodeToken(token: string): any {
    try {
      const decoded = this.jwtService.decodeToken(token);
      if (!decoded) {
        throw new AuthError(AuthErrorCode.INVALID_TOKEN, 'Invalid token');
      }
      return decoded;
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError(AuthErrorCode.INVALID_TOKEN, 'Invalid token');
    }
  }
}
