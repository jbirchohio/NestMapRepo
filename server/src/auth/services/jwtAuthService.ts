import { v4 as uuidv4 } from 'uuid';
import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { IAuthService, LoginResponse } from '../interfaces/auth.service.interface.js';
import { TokenType } from '../jwt/types.js';
import { 
  LoginDto, 
  RefreshTokenDto, 
  RequestPasswordResetDto, 
  ResetPasswordDto,
  AuthResponse,
  UserResponse
} from '../dtos/auth.dto.js';
import { UserRepository } from '../../common/repositories/user/user.repository.interface.js';
import { RefreshTokenRepository } from '../interfaces/refresh-token.repository.interface.js';
import { EmailService } from '../../email/interfaces/email.service.interface.js';
import { compare, hash } from 'bcryptjs';
import { UserRole } from '../../../types/jwt.js';
import { 
  generateAuthTokens, 
  verifyToken, 
  revokeToken, 
  generatePasswordResetToken, 
  verifyPasswordResetToken,
  revokeAllUserTokens 
} from '../../../utils/secureJwt.js';
import { ConfigService } from '@nestjs/config';
import { User } from '../interfaces/user.interface.js';

@Injectable()
export class JwtAuthService implements IAuthService {
  private readonly logger = new Logger(JwtAuthService.name);
  private readonly RESET_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour
  private readonly clientUrl: string;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    this.clientUrl = this.configService.get<string>('CLIENT_URL', 'http://localhost:3000');
  }

  /**
   * Verify a JWT token
   * @param token The JWT token to verify
   * @param type Optional token type (e.g., 'access', 'refresh')
   * @returns User information if token is valid
   */
  async verifyToken(
    token: string,
    type: TokenType = 'access'
  ): Promise<{ userId: string; email: string; role: string }> {
    try {
      const result = await verifyToken(token, type);
      if (!result || !result.payload.userId) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      // Get the user to verify they still exist and get their email and role
      const user = await this.userRepository.findById(result.payload.userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return {
        userId: user.id,
        email: user.email,
        role: user.role
      };
    } catch (error) {
      this.logger.error(`Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Handles user login
   */
  /**
   * Validates a user's credentials
   */
  async validateUser(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return null;
    }
    
    const isPasswordValid = await compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    // Omit sensitive data
    const { passwordHash, refreshToken, ...result } = user;
    return result;
  }

  /**
   * Generates access and refresh tokens for a user
   */
  async generateTokens(
    user: User,
    ipAddress: string,
    userAgent: string = ''
  ): Promise<LoginResponse> {
    // Generate tokens using secureJwt
    const tokens = await generateAuthTokens(
      user.id,
      user.email,
      user.role as UserRole
    );

    // Store refresh token in repository
    await this.refreshTokenRepository.create({
      token: tokens.refreshToken,
      userId: user.id,
      expiresAt: tokens.refreshTokenExpiresAt,
      ipAddress,
      userAgent,
      revoked: false,
      revokedAt: null
    });

    // Extract user info for the response
    const userInfo = {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      organizationId: user.organizationId,
      firstName: user.firstName || null,
      lastName: user.lastName || null
    };

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: Math.floor((tokens.accessTokenExpiresAt.getTime() - Date.now()) / 1000),
      tokenType: 'Bearer',
      user: userInfo
    };
  }

  /**
   * Revokes all active sessions for a user
   */
  async revokeAllSessions(userId: string): Promise<void> {
    await this.refreshTokenRepository.revokeAllForUser(userId);
  }

  // Note: Removed verifyToken method as it's now handled by secureJwt's verifyToken function

  async login(loginDto: LoginDto, ipAddress: string, userAgent: string = ''): Promise<LoginResponse> {
    try {
      const user = await this.userRepository.findByEmail(loginDto.email);
      
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new UnauthorizedException('Account is temporarily locked. Please try again later.');
      }

      // Verify password
      const isPasswordValid = await compare(loginDto.password, user.passwordHash);
      
      if (!isPasswordValid) {
        // Increment failed login attempts
        const failedAttempts = (user.failedLoginAttempts || 0) + 1;
        await this.userRepository.update(user.id, { failedLoginAttempts: failedAttempts });
        
        // Lock account after too many failed attempts
        if (failedAttempts >= 5) {
          const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
          await this.userRepository.update(user.id, { lockedUntil: lockUntil });
          this.logger.warn(`Account locked for user ${user.email} due to too many failed login attempts`);
          throw new UnauthorizedException('Account locked due to too many failed attempts. Please try again in 30 minutes.');
        }
        
        throw new UnauthorizedException('Invalid credentials');
      }

      // Reset failed login attempts on successful login
      if (user.failedLoginAttempts > 0) {
        await this.userRepository.update(user.id, { 
          failedLoginAttempts: 0,
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress
        });
      } else {
        await this.userRepository.update(user.id, { 
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress
        });
      }

      // Generate tokens - this now returns a properly typed LoginResponse
      const loginResponse = await this.generateTokens(user, ipAddress, userAgent);

      // Log successful login
      this.logger.log(`User ${user.email} logged in successfully from ${ipAddress}`);

      return loginResponse;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Login failed: ${errorMessage}`, errorStack);
      
      // Re-throw the error if it's already an HTTP exception
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      // For other errors, throw a generic unauthorized error to avoid leaking information
      throw new UnauthorizedException('Login failed. Please check your credentials and try again.');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto, ipAddress: string, userAgent: string = ''): Promise<LoginResponse> {
    try {
      // Verify the refresh token using secureJwt
      const result = await verifyToken(refreshTokenDto.refreshToken, 'refresh');
      
      if (!result || !result.payload.userId) {  // Use userId from TokenPayload
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Find the user
      const user = await this.userRepository.findById(result.payload.userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Revoke the old refresh token if it has a JTI
      if (result.payload.jti) {
        await revokeToken(result.payload.jti);
      }

      // Generate new tokens
      return this.generateTokens(user, ipAddress, userAgent);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Token refresh failed: ${errorMessage}`, errorStack);
      
      // Re-throw the error if it's already an HTTP exception
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      
      // For other errors, throw a generic unauthorized error
      throw new UnauthorizedException('Failed to refresh token. Please log in again.');
    }
  }

  /**
   * Logout user by invalidating their refresh token
   * @param refreshToken The refresh token to invalidate
   * @param authHeader Optional authorization header containing the access token (format: 'Bearer <token>')
   */
  async logout(refreshToken: string, authHeader?: string): Promise<void> {
    try {
      // Revoke the refresh token
      const refreshTokenResult = await verifyToken(refreshToken, 'refresh');
      
      if (refreshTokenResult?.payload?.jti) {
        await revokeToken(refreshTokenResult.payload.jti);
      }
      
      // Also remove from the database if it exists
      const storedToken = await this.refreshTokenRepository.findByToken(refreshToken);
      if (storedToken) {
        await this.refreshTokenRepository.revokeToken(storedToken.id);
      }
      
      // Handle access token from auth header if provided
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const accessToken = authHeader.split(' ')[1];
        try {
          const accessTokenResult = await verifyToken(accessToken, 'access');
          if (accessTokenResult?.payload?.jti) {
            await revokeToken(accessTokenResult.payload.jti);
          }
        } catch (error: unknown) {
          // Log but don't fail the logout if access token revocation fails
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.debug(`Error revoking access token: ${errorMessage}`);
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        const errorMessage = error.message;
        const errorStack = error.stack;
        this.logger.error(`Logout failed: ${errorMessage}`, errorStack);
      } else {
        this.logger.error('Unknown error during logout');
      }
      // Don't throw error on logout failure to prevent revealing internal errors
    }
  }

  /**
   * Request password reset
   * @param email The email address to send the password reset to
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean }> {
    try {
      const user = await this.userRepository.findByEmail(email);
      
      // Always return success even if user not found (security best practice)
      if (!user) {
        this.logger.log(`Password reset requested for non-existent email: ${email}`);
        return { success: true };
      }

      // Generate password reset token
      const { token, expiresAt } = await generatePasswordResetToken(
        user.id,
        user.email
      );

      // Create reset URL
      const resetUrl = `${this.clientUrl}/reset-password?token=${token}`;

      // Send email with reset link
      await this.emailService.sendPasswordResetEmail(
        user.email,
        {
          name: user.firstName || 'User',
          resetUrl,
          expiryHours: 24 // 24 hours expiry
        }
      );

      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Password reset request failed: ${errorMessage}`, errorStack);
      return { success: false };
    }
  }

  /**
   * Reset password using token
   * @param token The password reset token
   * @param newPassword The new password to set
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      
      // Verify the password reset token
      const result = await verifyPasswordResetToken(token);
      if (!result || !result.userId) {
        throw new BadRequestException('Invalid or expired password reset token');
      }

      const { userId, jti } = result;
      
      // Get the user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      
      // Hash the new password
      const passwordHash = await hash(newPassword, 12);
      
      // Update the user's password
      await this.userRepository.updatePassword(userId, passwordHash);
      
      // Revoke the token if it has a JTI
      if (jti) {
        await revokeToken(jti);
      }

      // Revoke all user's refresh tokens
      await revokeAllUserTokens(userId);
      await this.refreshTokenRepository.revokeAllForUser(userId);
      
      return { 
        success: true, 
        message: 'Password has been reset successfully' 
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Password reset failed: ${errorMessage}`, errorStack);
      return { 
        success: false, 
        message: 'An error occurred while resetting your password' 
      };
    }
  }
}
