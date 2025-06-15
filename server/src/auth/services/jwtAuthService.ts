import { Injectable, Logger } from '@nestjs/common';
import { IAuthService } from '../interfaces/auth.service.interface';
import { 
  LoginDto, 
  RefreshTokenDto, 
  RequestPasswordResetDto, 
  ResetPasswordDto,
  AuthResponse,
  UserResponse
} from '../dtos/auth.dto';
import { UserRepository } from '../interfaces/user.repository.interface';
import { RefreshTokenRepository } from '../interfaces/refresh-token.repository.interface';
import { EmailService } from '../../email/interfaces/email.service.interface';
import { compare, hash } from 'bcryptjs';
import { jwtService, UserRole } from '../../../utils/jwtService';
import { ConfigService } from '@nestjs/config';

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
   * Handles user login
   */
  async login(loginDto: LoginDto, ipAddress: string, userAgent: string = ''): Promise<AuthResponse> {
    try {
      const user = await this.userRepository.findByEmail(loginDto.email);
      
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new Error('Account is temporarily locked');
      }

      // Verify password
      const isPasswordValid = await compare(loginDto.password, user.passwordHash);
      
      if (!isPasswordValid) {
        // Increment failed login attempts
        await this.userRepository.incrementLoginAttempts(user.id);
        throw new Error('Invalid credentials');
      }

      // Reset failed login attempts on successful login
      if (user.failedLoginAttempts > 0) {
        await this.userRepository.resetLoginAttempts(user.id);
      }

      // Generate tokens using the consolidated JWT service
      const role = user.role as UserRole || 'user';
      const tokens = await jwtService.generateAuthTokens(
        user.id,
        user.email,
        role,
        user.organization_id
      );

      // Store refresh token
      await this.refreshTokenRepository.create({
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: tokens.refreshTokenExpiresAt,
        ipAddress,
        userAgent
      });

      // Log successful login
      this.logger.log(`User ${user.email} logged in successfully from ${ipAddress}`);

      // Return authentication response
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          organization_id: user.organization_id
        },
        expiresAt: tokens.accessTokenExpiresAt.getTime()
      };
    } catch (error) {
      this.logger.error(`Login failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
    ipAddress: string,
    userAgent: string = ''
  ): Promise<AuthResponse> {
    try {
      const { refreshToken } = refreshTokenDto;
      
      // Verify the refresh token exists in the database
      const storedToken = await this.refreshTokenRepository.findByToken(refreshToken);
      if (!storedToken) {
        throw new Error('Invalid refresh token');
      }

      // Check if token is expired
      if (storedToken.expiresAt < new Date()) {
        await this.refreshTokenRepository.delete(storedToken.id);
        throw new Error('Refresh token expired');
      }

      // Get user information
      const user = await this.userRepository.findById(storedToken.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new tokens using the consolidated JWT service
      const role = user.role as UserRole || 'user';
      const tokens = await jwtService.refreshAccessToken(refreshToken);
      
      if (!tokens) {
        throw new Error('Failed to refresh token');
      }

      // Delete the old refresh token
      await this.refreshTokenRepository.delete(storedToken.id);

      // Store the new refresh token
      await this.refreshTokenRepository.create({
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: tokens.refreshTokenExpiresAt,
        ipAddress,
        userAgent
      });

      // Log successful token refresh
      this.logger.log(`User ${user.email} refreshed their token from ${ipAddress}`);

      // Return authentication response
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          organization_id: user.organization_id
        },
        expiresAt: tokens.accessTokenExpiresAt.getTime()
      };
    } catch (error) {
      this.logger.error(`Token refresh failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Logout user by invalidating their refresh token
   */
  async logout(refreshToken: string): Promise<{ success: boolean }> {
    try {
      // Find the token in the database
      const storedToken = await this.refreshTokenRepository.findByToken(refreshToken);
      
      if (storedToken) {
        // Delete the token from the database
        await this.refreshTokenRepository.delete(storedToken.id);
        
        // Revoke the token in the JWT service
        const tokenResult = await jwtService.verifyToken(refreshToken, 'refresh');
        if (tokenResult && tokenResult.payload.jti) {
          await jwtService.revokeToken(tokenResult.payload.jti);
        }
      }
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Logout failed: ${error.message}`, error.stack);
      return { success: false };
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(dto: RequestPasswordResetDto): Promise<{ success: boolean; message: string }> {
    try {
      const { email } = dto;
      const user = await this.userRepository.findByEmail(email);
      
      // Always return success even if user not found (security best practice)
      if (!user) {
        this.logger.log(`Password reset requested for non-existent email: ${email}`);
        return { 
          success: true, 
          message: 'If your email is registered, you will receive a password reset link' 
        };
      }

      // Generate password reset token
      const { token, expiresAt } = await jwtService.generatePasswordResetToken(
        user.id,
        user.email
      );

      // Create reset URL
      const resetUrl = `${this.clientUrl}/reset-password?token=${token}`;

      // Send email with reset link
      await this.emailService.sendPasswordResetEmail(
        user.email,
        user.firstName || 'User',
        resetUrl,
        expiresAt
      );

      return { 
        success: true, 
        message: 'If your email is registered, you will receive a password reset link' 
      };
    } catch (error) {
      this.logger.error(`Password reset request failed: ${error.message}`, error.stack);
      return { 
        success: false, 
        message: 'An error occurred while processing your request' 
      };
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
    try {
      const { token, newPassword } = dto;
      
      // Verify the password reset token
      const result = await jwtService.verifyPasswordResetToken(token);
      
      if (!result) {
        return { 
          success: false, 
          message: 'Invalid or expired password reset token' 
        };
      }
      
      const { userId, jti } = result;
      
      // Get the user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return { 
          success: false, 
          message: 'User not found' 
        };
      }
      
      // Hash the new password
      const passwordHash = await hash(newPassword, 12);
      
      // Update the user's password
      await this.userRepository.updatePassword(userId, passwordHash);
      
      // Revoke the password reset token
      if (jti) {
        await jwtService.revokeToken(jti);
      }
      
      // Revoke all existing refresh tokens for the user
      await jwtService.revokeAllUserTokens(userId);
      await this.refreshTokenRepository.deleteAllForUser(userId);
      
      return { 
        success: true, 
        message: 'Password has been reset successfully' 
      };
    } catch (error) {
      this.logger.error(`Password reset failed: ${error.message}`, error.stack);
      return { 
        success: false, 
        message: 'An error occurred while resetting your password' 
      };
    }
  }
}
