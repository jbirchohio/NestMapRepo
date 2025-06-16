import { compare, hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import { 
  Injectable, 
  Inject, 
  Logger,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  NotFoundException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Import interfaces and types
import { LoginDto, RefreshTokenDto } from '../dtos/auth.dto';
import { UserRepository } from '../interfaces/user.repository.interface';
import { RefreshTokenRepository } from '../interfaces/refresh-token.repository.interface';
import { EmailService } from '../../email/interfaces/email.service.interface';
import { TokenType, AuthResponse as IAuthResponse } from '../interfaces/auth.interface';
import { User, UserRole, UserRoles } from '../interfaces/user.interface';
import { decodeToken, blacklistToken, TokenPayload } from '../jwt';

// Extend the AuthResponse interface to include token expiration times
interface ExtendedAuthResponse extends IAuthResponse {
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
}

// Type for JWT payload with our custom claims
interface JwtPayloadWithClaims {
  jti: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  sub: string;
  type: TokenType;
  userId?: string;
  email?: string;
  role?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly RESET_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour
  private readonly PASSWORD_RESET_TOKEN_BYTES = 32;
  private readonly clientUrl: string;

  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    @Inject('RefreshTokenRepository')
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('EmailService')
    private readonly emailService: EmailService,
  ) {
    this.clientUrl = this.configService.get<string>('CLIENT_URL', 'http://localhost:3000');
  }

  /**
   * Validates a user's role
   * @param role The role to validate
   * @returns A valid UserRole or throws BadRequestException
   */
  private getValidUserRole(role: unknown): UserRole {
    if (typeof role !== 'string') {
      return UserRoles.USER;
    }
    const upperRole = role.toUpperCase();
    if (Object.values(UserRoles).includes(upperRole as UserRole)) {
      return upperRole as UserRole;
    }
    return UserRoles.USER;
  }

  /**
   * Handles user login
   * @param loginDto User credentials
   * @param ipAddress IP address of the client
   * @param userAgent User agent string
   * @returns Authentication response with tokens and user data
   */
  async login(loginDto: LoginDto, ipAddress: string, userAgent: string = ''): Promise<ExtendedAuthResponse> {
    try {
      const user = await this.userRepository.findByEmail(loginDto.email);
      
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new UnauthorizedException('Account is temporarily locked');
      }

      // Verify password
      const isPasswordValid = await compare(loginDto.password, user.passwordHash);
      if (!isPasswordValid) {
        // Increment failed login attempts
        await this.userRepository.incrementFailedLoginAttempts(user.id);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Reset failed login attempts on successful login
      if (user.failedLoginAttempts > 0) {
        await this.userRepository.resetFailedLoginAttempts(user.id);
      }

      // Generate tokens
      const tokens = await this.generateTokens(user, ipAddress, userAgent);
      
      return {
        ...tokens,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt
      };
    } catch (error) {
      this.logger.error(`Login failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generates access and refresh tokens for a user
   * @param user The user to generate tokens for
   * @param ipAddress IP address of the client
   * @param userAgent User agent string
   * @returns Object containing tokens and their expiration times
   */
  private async generateTokens(
    user: User,
    ipAddress: string,
    userAgent: string = ''
  ): Promise<ExtendedAuthResponse> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const jti = uuidv4();
      
      // Token expiration times (in seconds)
      const accessTokenExpiresIn = parseInt(
        this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m').match(/\d+/)?.[0] || '900',
        10
      );
      const refreshTokenExpiresIn = parseInt(
        this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d').match(/\d+/)?.[0] || '604800',
        10
      );
      
      const accessTokenExpiresAt = now + accessTokenExpiresIn;
      const refreshTokenExpiresAt = now + refreshTokenExpiresIn;

      // Create access token
      const accessToken = await this.jwtService.signAsync(
        {
          jti,
          userId: user.id,
          email: user.email,
          role: user.role,
          type: TokenType.ACCESS,
          iat: now,
          exp: accessTokenExpiresAt,
          iss: this.configService.get<string>('JWT_ISSUER', 'nestmap-api'),
          aud: this.configService.get<string>('JWT_AUDIENCE', 'nestmap-client'),
          sub: user.id,
        } as JwtPayloadWithClaims,
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: `${accessTokenExpiresIn}s`,
        }
      );

      // Create refresh token
      const refreshToken = await this.jwtService.signAsync(
        {
          jti,
          userId: user.id,
          email: user.email,
          role: user.role,
          type: TokenType.REFRESH,
          iat: now,
          exp: refreshTokenExpiresAt,
          iss: this.configService.get<string>('JWT_ISSUER', 'nestmap-api'),
          aud: this.configService.get<string>('JWT_AUDIENCE', 'nestmap-client'),
          sub: user.id,
        } as JwtPayloadWithClaims,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: `${refreshTokenExpiresIn}s`,
        }
      );

      // Store refresh token in the database
      await this.refreshTokenRepository.create({
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(refreshTokenExpiresAt * 1000),
        revoked: false,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        revokedAt: null,
      });

      // Sanitize user data before returning
      const sanitizedUser = {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        emailVerified: user.isEmailVerified || false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      return {
        accessToken,
        refreshToken,
        user: sanitizedUser,
        accessTokenExpiresAt: accessTokenExpiresAt * 1000, // Convert to milliseconds
        refreshTokenExpiresAt: refreshTokenExpiresAt * 1000 // Convert to milliseconds
      };
    } catch (error) {
      this.logger.error('Error generating tokens:', error);
      throw new InternalServerErrorException('Failed to generate authentication tokens');
    }
  }

  /**
   * Refreshes an access token using a refresh token
   * @param refreshTokenDto Refresh token DTO
   * @param ipAddress IP address of the client
   * @param userAgent User agent string
   * @returns New authentication response with fresh tokens
   */
  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
    ipAddress: string,
    userAgent: string = ''
  ): Promise<ExtendedAuthResponse> {
    try {
      // Verify the refresh token
      const payload = await this.verifyToken(refreshTokenDto.refreshToken, TokenType.REFRESH);
      
      // Check if the token is in the database and not revoked
      const storedToken = await this.refreshTokenRepository.findByToken(refreshTokenDto.refreshToken);
      if (!storedToken || storedToken.revoked) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get the user
      const user = await this.userRepository.findById(payload.userId || payload.sub);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Revoke the used refresh token
      await this.refreshTokenRepository.revoke(storedToken.id);

      // Generate new tokens
      return this.generateTokens(user, ipAddress, userAgent);
    } catch (error) {
      this.logger.error(`Token refresh failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Logs out a user by revoking their refresh token
   * @param refreshToken The refresh token to revoke
   * @param accessToken Optional access token to blacklist
   * @returns Success status
   */
  async logout(refreshToken: string, accessToken?: string): Promise<{ success: boolean }> {
    try {
      // Revoke the refresh token
      await this.refreshTokenRepository.revokeByToken(refreshToken);
      if (accessToken) {
        const token = accessToken.startsWith('Bearer ')
          ? accessToken.split(' ')[1]
          : accessToken;
        const payload = decodeToken<TokenPayload>(token);
        if (payload?.jti) {
          await blacklistToken(payload.jti);
        }
      }
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Logout failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to logout');
    }
  }

  /**
   * Validates a user's credentials
   * @param email User's email
   * @param password User's password
   * @returns User data without password hash if valid, null otherwise
   */
  async validateUser(email: string, password: string): Promise<{ id: string; email: string; role: string } | null> {
    try {
      const user = await this.userRepository.findByEmail(email);
      
      if (!user) {
        return null;
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        return null;
      }

      const isPasswordValid = await compare(password, user.passwordHash);
      if (!isPasswordValid) {
        // Increment failed login attempts
        await this.userRepository.incrementFailedLoginAttempts(user.id);
        return null;
      }

      // Reset failed login attempts on successful validation
      if (user.failedLoginAttempts > 0) {
        await this.userRepository.resetFailedLoginAttempts(user.id);
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role || UserRoles.USER,
      };
    } catch (error) {
      this.logger.error(`User validation failed: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Verifies a JWT token
   * @param token The token to verify
   * @param type The expected token type
   * @returns The decoded token payload
   */
  async verifyToken(token: string, type: TokenType): Promise<JwtPayloadWithClaims> {
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const secret = type === TokenType.ACCESS
        ? this.configService.get<string>('JWT_SECRET')
        : this.configService.get<string>('JWT_REFRESH_SECRET');
      
      if (!secret) {
        throw new Error('JWT secret not configured');
      }

      const payload = await this.jwtService.verifyAsync<JwtPayloadWithClaims>(token, { secret });
      
      // Verify token type matches
      if (payload.type !== type) {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Initiates the password reset process
   * @param email User's email address
   * @returns Success status and message
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.userRepository.findByEmail(email);
      
      // Always return success to prevent email enumeration
      if (!user) {
        this.logger.debug(`Password reset requested for non-existent email: ${email}`);
        return { 
          success: true, 
          message: 'If an account with that email exists, a password reset link has been sent.' 
        };
      }

      // Generate a secure reset token
      const resetToken = randomBytes(this.PASSWORD_RESET_TOKEN_BYTES).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + this.RESET_TOKEN_EXPIRY);

      // Save the reset token to the user
      await this.userRepository.update(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetTokenExpiry,
      });

      // Send password reset email
      const resetUrl = `${this.clientUrl}/reset-password?token=${resetToken}`;
      
      try {
        await this.emailService.sendPasswordReset({
          email: user.email,
          name: user.firstName || 'User',
          resetUrl,
          expiryHours: this.RESET_TOKEN_EXPIRY / (60 * 60 * 1000), // Convert to hours
        });
      } catch (emailError) {
        this.logger.error(
          `Failed to send password reset email to ${user.email}:`,
          emailError
        );
        // Don't fail the request if email sending fails
      }

      return { 
        success: true, 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      };
    } catch (error) {
      this.logger.error(`Password reset request failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to process password reset request');
    }
  }

  /**
   * Resets a user's password using a valid reset token
   * @param token Password reset token
   * @param newPassword New password
   * @returns Success status and message
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!token || !newPassword) {
        throw new BadRequestException('Token and new password are required');
      }

      // Find user by reset token
      const user = await this.userRepository.findByPasswordResetToken(token);
      
      if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        throw new BadRequestException('Invalid or expired password reset token');
      }

      // Update the user's password
      const hashedPassword = await hash(newPassword, 12);
      await this.userRepository.update(user.id, {
        passwordHash: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0, // Reset failed login attempts
        lockedUntil: null, // Unlock the account if it was locked
      });

      // Send password reset confirmation email
      try {
        await this.emailService.sendPasswordResetConfirmation({
          email: user.email,
          name: user.firstName || 'User',
        });
      } catch (emailError) {
        this.logger.error(
          `Failed to send password reset confirmation to ${user.email}:`,
          emailError
        );
        // Don't fail the request if email sending fails
      }

      return { 
        success: true, 
        message: 'Your password has been successfully reset.' 
      };
    } catch (error) {
      this.logger.error(`Password reset failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Revokes all active sessions for a user
   * @param userId User ID
   */
  async revokeAllSessions(userId: string): Promise<void> {
    try {
      await this.refreshTokenRepository.revokeAllForUser(userId);
    } catch (error) {
      this.logger.error(`Failed to revoke sessions for user ${userId}:`, error);
      throw new InternalServerErrorException('Failed to revoke sessions');
    }
  }
}

@Injectable()
export class AuthServiceImpl {
  private readonly RESET_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds
  private readonly PASSWORD_RESET_TOKEN_BYTES = 32;
  private readonly logger = new Logger(AuthServiceImpl.name);
  private readonly clientUrl: string;

  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    @Inject('RefreshTokenRepository')
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('EmailService')
    private readonly emailService: EmailService,
  ) {
    this.clientUrl = this.configService.get<string>('CLIENT_URL', 'http://localhost:3000');
  }

  private getValidUserRole(role: unknown): UserRole {
    if (typeof role === 'string' && Object.values(UserRoles).includes(role as UserRole)) {
      return role as UserRole;
    }
    this.logger.warn(`Invalid role provided: ${role}. Defaulting to USER role`);
    return UserRoles.USER;
  }

  async login(loginDto: LoginDto, ipAddress: string, userAgent: string = ''): Promise<AuthResponse> {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(loginDto.email);
      if (!user) {
        this.logger.warn(`Login failed: User with email ${loginDto.email} not found`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if account is locked
      const now = new Date();
      const lockedUntil = user.lockedUntil ? new Date(user.lockedUntil) : null;
      if (lockedUntil && lockedUntil > now) {
        const remainingMinutes = Math.ceil((lockedUntil.getTime() - now.getTime()) / (60 * 1000));
        this.logger.warn(`Login failed: Account locked for user ${user.id}. Remaining time: ${remainingMinutes} minutes`);
        throw new UnauthorizedException(`Account is locked. Please try again in ${remainingMinutes} minutes.`);
      }

      // Verify password
      const isPasswordValid = await compare(loginDto.password, user.passwordHash);
      if (!isPasswordValid) {
        // Increment failed login attempts
        const failedAttempts = (user.failedLoginAttempts || 0) + 1;
        const maxAttempts = 5; // Configurable
        
        if (failedAttempts >= maxAttempts) {
          // Lock the account for 30 minutes
          const lockedUntil = new Date(now.getTime() + 30 * 60 * 1000);
          await this.userRepository.updateUser(user.id, {
            failedLoginAttempts: failedAttempts,
            lockedUntil,
          }); // Type assertion to handle partial update
          
          this.logger.warn(`Account locked for user ${user.id} due to too many failed login attempts`);
          throw new UnauthorizedException('Too many failed attempts. Account locked for 30 minutes.');
        }

        // Update failed attempts
        await this.userRepository.updateUser(user.id, { failedLoginAttempts: failedAttempts });
        
        const remainingAttempts = maxAttempts - failedAttempts;
        this.logger.warn(`Login failed: Invalid password for user ${user.id}. ${remainingAttempts} attempts remaining.`);
        throw new UnauthorizedException(`Invalid credentials. ${remainingAttempts} attempts remaining.`);
      }

      // Reset failed login attempts on successful login
      const hasFailedAttempts = user.failedLoginAttempts && user.failedLoginAttempts > 0;
      const isLocked = user.lockedUntil && new Date(user.lockedUntil) > new Date();
      if (hasFailedAttempts || isLocked) {
        await this.userRepository.updateUser(user.id, {
          failedLoginAttempts: 0,
          lockedUntil: null,
        }); // Type assertion to handle partial update
      }

      // Update last login
      this.logger.log(`Successful login for user: ${user.id}`);
      await this.userRepository.updateLastLogin(user.id, ipAddress);

      // Prepare user response
      const userResponse: UserResponse = {
        id: user.id,
        email: user.email,
        role: this.getValidUserRole(user.role),
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        emailVerified: user.emailVerified || false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      // Generate tokens with user data
      const tokens = await this.generateTokens(
        userResponse,
        ipAddress,
        userAgent
      );

      return {
        ...tokens
      };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Login error: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      throw new UnauthorizedException('Login failed. Please try again.');
    }
  }

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Password reset requested for email: ${email}`);
    
    try {
      // Validate email
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return { success: false, message: 'Please provide a valid email address' };
      }
      
      // Find user by email
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        // For security reasons, don't reveal if the email exists or not
        this.logger.log(`Password reset requested for non-existent email: ${email}`);
        return { 
          success: true, 
          message: 'If an account with that email exists, a password reset link has been sent' 
        };
      }
      
      // Generate a reset token
      const resetToken = randomBytes(this.PASSWORD_RESET_TOKEN_BYTES).toString('hex');
      const resetTokenExpires = new Date(Date.now() + this.RESET_TOKEN_EXPIRY);
      
      // Save the reset token to the user
      await this.userRepository.setPasswordResetToken(user.id, resetToken, resetTokenExpires);
      
      // Send password reset email
      const resetUrl = `${this.clientUrl}/reset-password?token=${resetToken}`;
      await this.emailService.sendPasswordResetEmail(user.email, {
        name: user.firstName || 'User',
        resetUrl
      });
      
      this.logger.log(`Password reset email sent to: ${email}`);
      
      return { 
        success: true, 
        message: 'If an account with that email exists, a password reset link has been sent' 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error in requestPasswordReset: ${errorMessage}`, error instanceof Error ? error.stack : '');
      // Don't reveal the error to the client for security reasons
      return { 
        success: false, 
        message: 'Error processing password reset request. Please try again later.' 
      };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    this.logger.log('Processing password reset');
    
    try {
      // Validate inputs
      if (!token || typeof token !== 'string') {
        return { success: false, message: 'Reset token is required' };
      }
      
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
        return { 
          success: false, 
          message: 'Password must be at least 8 characters long' 
        };
      }
      
      // Find user by token
      const user = await this.userRepository.findByResetToken(token);
      if (!user) {
        return { 
          success: false, 
          message: 'Invalid or expired reset token. Please request a new password reset.' 
        };
      }
      
      // Update the user's password and clear the reset token
      await this.userRepository.setPassword(user.id, newPassword);
      
      // Send password reset confirmation email
      try {
        await this.emailService.sendPasswordResetConfirmationEmail(user.email, {
          name: user.firstName || 'User'
        });
      } catch (emailError) {
        this.logger.warn(`Failed to send password reset confirmation email: ${emailError.message}`);
        // Continue even if email sending fails
      }
      
      return { 
        success: true, 
        message: 'Your password has been successfully reset. You can now log in with your new password.' 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error in resetPassword: ${errorMessage}`, error instanceof Error ? error.stack : '');
      
      return { 
        success: false, 
        message: 'An error occurred while resetting your password. Please try again.' 
      };
    }
  }

  async refreshToken(
    refreshTokenDto: RefreshTokenDto, 
    ipAddress: string, 
    userAgent: string = ''
  ): Promise<AuthResponse> {
    this.logger.log('Refreshing token');
    
    try {
      // Verify refresh token
      const payload = await this.verifyToken(refreshTokenDto.refreshToken, TokenType.REFRESH);
      
      // Check if the token is valid and of type refresh
      if (payload.type !== TokenType.REFRESH) {
        throw new UnauthorizedException('Invalid token type');
      }
      
      // Check if the token exists in the database and is not revoked
      const storedToken = await this.refreshTokenRepository.findByToken(refreshTokenDto.refreshToken);
      if (!storedToken) {
        throw new UnauthorizedException('Token not found');
      }
      
      if (storedToken.revoked) {
        throw new UnauthorizedException('Token has been revoked');
      }
      
      // Get the user associated with the token
      const user = await this.userRepository.findById(payload.userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      
      // Prepare user response
      const userResponse: UserResponse = {
        id: user.id,
        email: user.email,
        role: this.getValidUserRole(user.role),
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        emailVerified: user.emailVerified || false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
      
      // Generate new tokens
      const tokens = await this.generateTokens(userResponse, ipAddress, userAgent);
      
      // Revoke the old refresh token if it has an ID
      if (storedToken.id) {
        try {
          await this.refreshTokenRepository.revokeToken(storedToken.id);
        } catch (error) {
          this.logger.error('Failed to revoke old refresh token:', error instanceof Error ? error.message : 'Unknown error');
          // Continue even if revoking fails
        }
      }
      
      return tokens;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Failed to refresh token', error instanceof Error ? error.stack : 'Unknown error');
      throw new UnauthorizedException('Failed to refresh token');
    }
  }

  async logout(refreshToken: string, accessToken?: string): Promise<{ success: boolean }> {
    this.logger.log('Processing logout request');
    try {
      // Revoke access token if provided
      if (accessToken) {
        try {
          const token = accessToken.startsWith('Bearer ') ? accessToken.split(' ')[1] : accessToken;
          const payload = await this.verifyToken(token, TokenType.ACCESS);
          if (payload.jti) {
            await this.refreshTokenRepository.revokeToken(payload.jti);
          }
        } catch (error) {
          // Token might be expired, which is fine for logout
          this.logger.debug('Error revoking access token (may be expected):', error instanceof Error ? error.message : 'Unknown error');
        }
      }

      // Revoke refresh token if provided
      if (refreshToken) {
        try {
          const payload = await this.verifyToken(refreshToken, TokenType.REFRESH);
          if (payload.jti) {
            await this.refreshTokenRepository.revokeToken(payload.jti);
          }
        } catch (error) {
          // Token might be expired, which is fine for logout
          this.logger.debug('Error revoking refresh token (may be expected):', error instanceof Error ? error.message : 'Unknown error');
        }
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to complete logout:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error('Failed to complete logout');
    }
  }

  async validateUser(email: string, password: string): Promise<{ id: string; email: string; role: string } | null> {
    this.logger.debug(`Validating user: ${email}`);
    const user = await this.userRepository.findByEmail(email);
    
    if (!user || !user.isActive) {
      return null;
    }
    
    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return null;
    }

    const isPasswordValid = await compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
    };
  }
  async generateTokens(
    user: UserResponse,
    ipAddress: string,
    userAgent: string = ''
  ): Promise<AuthResponse> {
    if (!user || !user.id || !user.email || !user.role) {
      throw new BadRequestError('Invalid user data for token generation');
    }
    
    const now = Math.floor(Date.now() / 1000);
    const jti = uuidv4();
    
    try {
      // Get JWT configuration with fallbacks
      const accessTokenSecret = this.configService?.get<string>('JWT_SECRET') || env.JWT_SECRET;
      const refreshTokenSecret = this.configService?.get<string>('JWT_REFRESH_SECRET') || env.JWT_REFRESH_SECRET;
      const accessExpiresIn = this.configService?.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';
      const refreshExpiresIn = this.configService?.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
      
      if (!accessTokenSecret || !refreshTokenSecret) {
        throw new InternalServerError('JWT secrets are not properly configured');
      }
      
      // Calculate expiration timestamps in seconds
      const accessTokenExpiresInSeconds = this.parseJwtExpiration(accessExpiresIn);
      const refreshTokenExpiresInSeconds = this.parseJwtExpiration(refreshExpiresIn);
      
      const accessTokenExpiresAt = now + accessTokenExpiresInSeconds;
      const refreshTokenExpiresAt = now + refreshTokenExpiresInSeconds;
      
      // Create access token
      const accessToken = await this.jwtService.signAsync(
        {
          jti,
          userId: user.id,
          email: user.email,
          role: user.role,
          type: TokenType.ACCESS,
          iat: now,
          exp: accessTokenExpiresAt,
          iss: this.configService?.get<string>('JWT_ISSUER') || 'nestmap-api',
          aud: this.configService?.get<string>('JWT_AUDIENCE') || 'nestmap-client',
          sub: user.id,
        } as JwtPayloadWithClaims,
        {
          secret: accessTokenSecret,
          expiresIn: accessExpiresIn,
        }
      );
      
      // Create refresh token
      const refreshToken = await this.jwtService.signAsync(
        {
          jti,
          userId: user.id,
          email: user.email,
          role: user.role,
          type: TokenType.REFRESH,
          iat: now,
          exp: refreshTokenExpiresAt,
          iss: this.configService?.get<string>('JWT_ISSUER') || 'nestmap-api',
          aud: this.configService?.get<string>('JWT_AUDIENCE') || 'nestmap-client',
          sub: user.id,
        } as JwtPayloadWithClaims,
        {
          secret: refreshTokenSecret,
          expiresIn: refreshExpiresIn,
        }
      );
      
      // Store refresh token in the database
      await this.refreshTokenRepository.create({
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(refreshTokenExpiresAt * 1000),
        revoked: false,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        revokedAt: null,
      });
      
      // Sanitize user data before returning
      const sanitizedUser: Omit<UserResponse, 'passwordHash' | 'refreshToken'> = {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        emailVerified: user.emailVerified || false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
      
      return {
        accessToken,
        refreshToken,
        user: sanitizedUser,
        accessTokenExpiresAt: accessTokenExpiresAt * 1000, // Convert to milliseconds
        refreshTokenExpiresAt: refreshTokenExpiresAt * 1000 // Convert to milliseconds
      };
      } catch (error) {
        this.logger.error('Error generating tokens:', error);
        throw new InternalServerError('Failed to generate tokens');
      }
    }

    private async verifyToken(token: string, type: TokenType): Promise<JwtPayloadWithClaims> {
      if (!token) {
        throw new UnauthorizedError('No token provided');
      }

      try {
        const secret = type === TokenType.ACCESS
          ? this.configService.get<string>('JWT_SECRET')
          : this.configService.get<string>('JWT_REFRESH_SECRET');

        if (!secret) {
          throw new Error('JWT secret not configured');
        }

        const payload = await this.jwtService.verifyAsync<JwtPayloadWithClaims>(token, { secret });

        if (payload.type !== type) {
          throw new UnauthorizedError('Invalid token type');
        }

        return payload;
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          throw new UnauthorizedError('Token has expired');
        }
        if (error.name === 'JsonWebTokenError') {
          throw new UnauthorizedError('Invalid token');
        }
        throw error;
      }
    }

async generateTokens(
  user: UserResponse,
  ipAddress: string,
  userAgent?: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  user: Omit<UserResponse, 'passwordHash' | 'refreshToken'>;
}> {
  const tokenId = uuidv4();
  const now = new Date();
  const accessTokenExpiresIn = this.configService.get<number>('JWT_ACCESS_EXPIRATION_MINUTES', 15);
  const refreshTokenExpiresIn = this.configService.get<number>('JWT_REFRESH_EXPIRATION_DAYS', 7);

  // Create access token
  const accessToken = this.jwtService.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: tokenId,
      type: TokenType.ACCESS,
    },
    {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: `${accessTokenExpiresIn}m`,
    }
  );

  // Create refresh token
  const refreshToken = this.jwtService.sign(
    {
      sub: user.id,
      jti: tokenId,
      type: TokenType.REFRESH,
    },
    {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: `${refreshTokenExpiresIn}d`,
    }
  );

  // Store refresh token in database
  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + refreshTokenExpiresIn);

  await this.refreshTokenRepository.create({
    id: tokenId,
    userId: user.id,
    token: refreshToken,
    expiresAt: refreshTokenExpiry,
    createdAt: now,
    createdByIp: ipAddress,
    userAgent: userAgent || '',
    revoked: false,
  });

  // Return tokens and user info (without sensitive data)
  const { passwordHash, refreshToken: _, ...userWithoutSensitiveData } = user;
  return {
    accessToken,
    refreshToken,
    user: userWithoutSensitiveData,
  };
}

async revokeAllSessions(userId: string): Promise<void> {
  try {
    await this.refreshTokenRepository.revokeAllForUser(userId);
    this.logger.log(`Revoked all sessions for user: ${userId}`);
  } catch (error) {
    this.logger.error(`Failed to revoke sessions for user ${userId}:`, error);
    throw new InternalServerError('Failed to revoke sessions');
  }
}
}
