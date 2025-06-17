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
import { User, UserRole, isUserRole, getDefaultUserRole } from '../interfaces/user.interface';
import { decodeToken, blacklistToken, TokenPayload } from '../jwt';

// Extend the AuthResponse interface to include token expiration times
export interface ExtendedAuthResponse extends IAuthResponse {
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
}

// Helper function to get a valid user role or default
function getValidUserRole(role?: string): UserRole {
  return isUserRole(role) ? role : getDefaultUserRole();
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
  // Logger instance for service
  private readonly logger = new Logger(AuthService.name);
  
  /**
   * Parses time string (like '15m', '1h', '7d') to seconds
   * @param timeString Time string in format number + unit (s, m, h, d)
   * @param defaultSeconds Default value in seconds if parsing fails
   * @returns Time in seconds
   */
  private parseTimeToSeconds(timeString: string, defaultSeconds: number): number {
    const match = timeString.match(/^(\d+)([smhd])?$/);
    if (!match) return defaultSeconds;
    
    const value = parseInt(match[1], 10);
    const unit = match[2] || 's';
    
    switch(unit) {
      case 's': return value; // seconds
      case 'm': return value * 60; // minutes
      case 'h': return value * 60 * 60; // hours
      case 'd': return value * 60 * 60 * 24; // days
      default: return defaultSeconds;
    }
  }
  // Token configuration with default values
  private readonly RESET_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour
  private readonly PASSWORD_RESET_TOKEN_BYTES = 32;
  private readonly clientUrl: string;
  private readonly userRepository: UserRepository;
  private readonly refreshTokenRepository: RefreshTokenRepository;
  private readonly jwtService: JwtService;
  private readonly configService: ConfigService;
  private readonly emailService: EmailService;

  constructor(
    @Inject('UserRepository') userRepository: UserRepository,
    @Inject('RefreshTokenRepository') refreshTokenRepository: RefreshTokenRepository,
    jwtService: JwtService,
    configService: ConfigService,
    @Inject('EmailService') emailService: EmailService
  ) {
    this.userRepository = userRepository;
    this.refreshTokenRepository = refreshTokenRepository;
    this.jwtService = jwtService;
    this.configService = configService;
    this.emailService = emailService;
    this.clientUrl = this.configService.get<string>('CLIENT_URL', 'http://localhost:3000');
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

      // Create a new user object with all required fields and optional defaults
      const userWithDefaults: User = {
        id: user.id,
        email: user.email,
        username: user.username ?? null,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        passwordHash: user.passwordHash,
        role: isUserRole(user.role) ? user.role : getDefaultUserRole(),
        emailVerified: user.emailVerified ?? false,
        emailVerificationToken: user.emailVerificationToken ?? null,
        emailVerificationExpires: user.emailVerificationExpires ?? null,
        passwordResetToken: user.passwordResetToken ?? null,
        passwordResetExpires: user.passwordResetExpires ?? null,
        resetToken: user.resetToken ?? null,
        resetTokenExpires: user.resetTokenExpires ?? null,
        failedLoginAttempts: user.failedLoginAttempts ?? 0,
        lockedUntil: user.lockedUntil ?? null,
        lastLogin: user.lastLoginAt ?? null,
        lastLoginAt: user.lastLoginAt ?? null,
        lastLoginIp: user.lastLoginIp ?? null,
        mfaSecret: user.mfaSecret ?? null,
        organizationId: user.organizationId ?? null,
        isActive: user.isActive ?? true,
        passwordChangedAt: user.passwordChangedAt ?? null,
        createdAt: user.createdAt ?? new Date(),
        updatedAt: user.updatedAt ?? new Date(),
        // Optional fields with defaults
        refreshTokens: user.refreshTokens ?? null,
        profileImageUrl: (user as any).profileImageUrl ?? null,
        timezone: (user as any).timezone ?? 'UTC',
        preferredLanguage: (user as any).preferredLanguage ?? 'en',
        metadata: (user as any).metadata ?? null
      };

      // Generate tokens with the properly typed user object
      const tokens = await this.generateTokens(userWithDefaults, ipAddress, userAgent);
      
      return {
        ...tokens,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Login failed: ${error.message}`, error.stack);
      } else {
        this.logger.error('Login failed with unknown error', String(error));
      }
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
      const jti = uuidv4();
      const now = Math.floor(Date.now() / 1000);
      
      

      // Get expiration times from config with sensible defaults
      const accessTokenExpiresIn = this.parseTimeToSeconds(
        this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
        900 // 15 minutes default
      );
      
      const refreshTokenExpiresIn = this.parseTimeToSeconds(
        this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
        604800 // 7 days default
      );
      
      // Calculate expiration timestamps
      const accessTokenExpiresAt = now + accessTokenExpiresIn;
      const refreshTokenExpiresAt = now + refreshTokenExpiresIn;

      // Ensure the role is valid
      const userRole = isUserRole(user.role) ? user.role : getDefaultUserRole();

      // Create token payloads
      const accessTokenPayload: JwtPayloadWithClaims = {
        jti: jti,
        iat: Math.floor(Date.now() / 1000),
        exp: accessTokenExpiresAt,
        iss: this.configService.get<string>('APP_NAME') || 'NestMap',
        aud: 'access',
        sub: user.id,
        type: 'access',
        userId: user.id,
        email: user.email,
        role: userRole,
      };

      const refreshTokenPayload: JwtPayloadWithClaims = {
        jti: jti,
        iat: Math.floor(Date.now() / 1000),
        exp: refreshTokenExpiresAt,
        iss: this.configService.get<string>('APP_NAME') || 'NestMap',
        aud: 'refresh',
        sub: user.id,
        type: 'refresh',
        userId: user.id,
        email: user.email,
        role: userRole,
      };

      // Generate tokens
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(accessTokenPayload, {
          secret: this.configService.get<string>('JWT_SECRET'),
          algorithm: 'HS256',
        }),
        this.jwtService.signAsync(refreshTokenPayload, {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          algorithm: 'HS256',
        }),
      ]);

      // Create refresh token
      const refreshTokenEntity = await this.refreshTokenRepository.create({
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(refreshTokenExpiresAt * 1000),
        ipAddress: ipAddress,
        userAgent: userAgent || null,
        revoked: false,
        revokedAt: null,
      });

      // Sanitize user data before returning
      const sanitizedUser: Omit<User, 'passwordHash' | 'refreshTokens'> = {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
        emailVerificationToken: 'emailVerificationToken' in user ? user.emailVerificationToken : null,
        emailVerificationExpires: 'emailVerificationExpires' in user ? user.emailVerificationExpires : null,
        passwordResetToken: 'passwordResetToken' in user ? user.passwordResetToken : null,
        passwordResetExpires: 'passwordResetExpires' in user ? user.passwordResetExpires : null,
        resetToken: 'resetToken' in user ? user.resetToken : null,
        resetTokenExpires: 'resetTokenExpires' in user ? user.resetTokenExpires : null,
        failedLoginAttempts: user.failedLoginAttempts || 0,
        lockedUntil: 'lockedUntil' in user ? user.lockedUntil : null,
        lastLogin: 'lastLogin' in user ? user.lastLogin : null,
        lastLoginAt: 'lastLoginAt' in user ? user.lastLoginAt : null,
        lastLoginIp: 'lastLoginIp' in user ? user.lastLoginIp : null,
        mfaSecret: 'mfaSecret' in user ? user.mfaSecret : null,
        organizationId: 'organizationId' in user ? user.organizationId : null,
        isActive: user.isActive !== undefined ? user.isActive : true,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        passwordChangedAt: 'passwordChangedAt' in user ? user.passwordChangedAt : null,
        profileImageUrl: 'profileImageUrl' in user ? user.profileImageUrl : null,
        timezone: 'timezone' in user ? user.timezone : null,
        preferredLanguage: 'preferredLanguage' in user ? user.preferredLanguage : null,
        metadata: 'metadata' in user ? user.metadata : null,
      };

      return {
        accessToken,
        refreshToken,
        user: sanitizedUser,
        accessTokenExpiresAt: accessTokenExpiresAt * 1000, // Convert to milliseconds
        refreshTokenExpiresAt: refreshTokenExpiresAt * 1000, // Convert to milliseconds
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error generating tokens: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException('Failed to generate authentication tokens');
    }
  }



  /**
   * Logs out a user by revoking their tokens
   * @param refreshToken The refresh token to revoke
   * @param accessToken Optional access token to revoke
   * @returns Success status
   */
  async logout(refreshToken: string, accessToken?: string): Promise<{ success: boolean }> {
    this.logger.log('Processing logout request');
    
    // Validate at least one token is provided
    if (!refreshToken && !accessToken) {
      this.logger.warn('No tokens provided for logout');
      return { success: false };
    }

    try {
      // Revoke access token if provided
      if (accessToken) {
        try {
          const token = accessToken.startsWith('Bearer ') ? accessToken.split(' ')[1] : accessToken;
          const payload = await this.verifyToken(token, TokenType.ACCESS);
          
          if (payload.jti) {
            await this.refreshTokenRepository.revokeToken(payload.jti);
            this.logger.log(`Revoked access token for user ${payload.userId || 'unknown'}`);
          }
        } catch (error) {
          // Token might be expired, which is fine for logout
          this.logger.debug('Error revoking access token (may be expected):', 
            error instanceof Error ? error.message : 'Unknown error');
        }
      }

      // Revoke refresh token if provided
      if (refreshToken) {
        try {
          const payload = await this.verifyToken(refreshToken, TokenType.REFRESH);
          
          if (payload.jti) {
            await this.refreshTokenRepository.revokeToken(payload.jti);
            this.logger.log(`Revoked refresh token for user ${payload.userId || 'unknown'}`);
          }
        } catch (error) {
          // Token might be expired, which is fine for logout
          this.logger.debug('Error revoking refresh token (may be expected):', 
            error instanceof Error ? error.message : 'Unknown error');
        }
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to complete logout: ${errorMessage}`, 
        error instanceof Error ? error.stack : undefined);
      return { success: false };
    }
  }

  /**
   * Validates a user's credentials
   * @param email User's email
   * @param password User's password
   * @returns User data without password hash if valid, null otherwise
   */
  async validateUser(email: string, password: string): Promise<{ id: string; email: string; role: UserRole } | null> {
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

      // Ensure the role is a valid UserRole
      const validRole = isUserRole(user.role) ? user.role : getDefaultUserRole();

      return {
        id: user.id,
        email: user.email,
        role: validRole,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`User validation failed: ${errorMessage}`, errorStack);
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
      if (!user) {
        throw new BadRequestException('Invalid or expired password reset token');
      }

      // Check if token is expired
      const now = new Date();
      if (!user.passwordResetExpires || user.passwordResetExpires < now) {
        throw new BadRequestException('Password reset token has expired');
      }

      // Update user's password
      const hashedPassword = await hash(newPassword, 12);
      await this.userRepository.update(user.id, {
        passwordHash: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0, // Reset failed login attempts
        lockedUntil: null, // Unlock the account if it was locked
      });

      // Send password change confirmation email
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
        message: 'Password has been reset successfully' 
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Password reset failed: ${errorMessage}`, errorStack);
      throw error instanceof Error ? error : new Error('Failed to reset password');
    }
  }

  /**
   * Revokes all active sessions for a user
   * @param userId User ID
   */
  /**
   * Revokes all active sessions for a user
   * @param userId User ID
   * @returns Promise that resolves when all sessions are revoked
   */
  async revokeAllSessions(userId: string): Promise<void> {
    try {
      await this.refreshTokenRepository.revokeAllForUser(userId);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to revoke sessions for user ${userId}: ${errorMessage}`, 
        error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException('Failed to revoke sessions');
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
      if (!user) {
        throw new BadRequestException('Invalid or expired password reset token');
      }

      // Check if token is expired
      const now = new Date();
      if (!user.passwordResetExpires || user.passwordResetExpires < now) {
        throw new BadRequestException('Password reset token has expired');
      }

      // Hash new password
      const hashedPassword = await hash(newPassword, 10);
      
      // Update user password and clear reset token
      await this.userRepository.update(user.id, {
        passwordHash: hashedPassword,
        passwordChangedAt: new Date(),
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockedUntil: null
      });

      // Send confirmation email
      try {
        await this.emailService.sendPasswordResetConfirmation(user.email, {
          name: user.firstName || 'User',
          ipAddress: 'unknown',
          timestamp: new Date().toISOString()
        });
      } catch (emailError) {
        this.logger.error('Failed to send password reset confirmation email', emailError);
        // Don't fail the request if email fails
      }

      return { 
        success: true, 
        message: 'Password has been reset successfully' 
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Password reset failed: ${errorMessage}`, errorStack);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to reset password');
    }
  }

  /**
   * Refreshes an access token using a valid refresh token
   * @param refreshTokenDto Refresh token DTO containing the refresh token
   * @param ipAddress IP address of the client
   * @param userAgent User agent string
   * @returns New access and refresh tokens
   */
  async refreshToken(
    refreshTokenDto: RefreshTokenDto | string,
    ipAddress: string,
    userAgent: string = ''
  ): Promise<ExtendedAuthResponse> {
    this.logger.log('Refreshing token');
    
    try {
      // Handle both string and DTO input for backward compatibility
      const refreshToken = typeof refreshTokenDto === 'string' 
        ? refreshTokenDto 
        : refreshTokenDto.refreshToken;
      
      if (!refreshToken) {
        throw new BadRequestException('Refresh token is required');
      }

      // Verify refresh token
      let payload: JwtPayloadWithClaims;
      try {
        payload = await this.verifyToken(refreshToken, TokenType.REFRESH);
      } catch (error) {
        this.logger.warn('Invalid refresh token provided', error instanceof Error ? error.stack : undefined);
        throw new UnauthorizedException('Invalid refresh token');
      }
      
      // Check if the token is valid and of type refresh
      if (payload.type !== TokenType.REFRESH) {
        this.logger.warn('Invalid token type provided for refresh');
        throw new UnauthorizedException('Invalid token type');
      }
      
      // Check if the token exists in the database and is not revoked
      const storedToken = await this.refreshTokenRepository.findByToken(refreshToken);
      if (!storedToken) {
        this.logger.warn('Refresh token not found in database');
        throw new UnauthorizedException('Token not found');
      }
      
      if (storedToken.revoked) {
        this.logger.warn('Attempted to use revoked refresh token');
        throw new UnauthorizedException('Token has been revoked');
      }
      
      if (!payload.userId) {
        this.logger.warn('Refresh token missing user ID');
        throw new UnauthorizedException('Invalid token payload');
      }
      
      // Get the user associated with the token
      const user = await this.userRepository.findById(payload.userId);
      if (!user) {
        this.logger.warn(`User ${payload.userId} not found for refresh token`);
        throw new UnauthorizedException('User not found');
      }
      
      // Check if user is active
      if (!user.isActive) {
        this.logger.warn(`Inactive user ${user.id} attempted to refresh token`);
        throw new UnauthorizedException('User account is inactive');
      }
      
      // Prepare user response with all required fields
      const userResponse: User = {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        username: user.username ?? null,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        emailVerified: user.emailVerified ?? false,
        emailVerificationToken: user.emailVerificationToken ?? null,
        emailVerificationExpires: user.emailVerificationExpires ?? null,
        passwordResetToken: user.passwordResetToken ?? null,
        passwordResetExpires: user.passwordResetExpires ?? null,
        resetToken: user.resetToken ?? null,
        resetTokenExpires: user.resetTokenExpires ?? null,
        failedLoginAttempts: user.failedLoginAttempts ?? 0,
        lockedUntil: user.lockedUntil ?? null,
        lastLogin: user.lastLoginAt ?? null,
        lastLoginAt: user.lastLoginAt ?? null,
        lastLoginIp: user.lastLoginIp ?? null,
        mfaSecret: user.mfaSecret ?? null,
        organizationId: user.organizationId ?? null,
        isActive: user.isActive ?? true,
        passwordChangedAt: user.passwordChangedAt ?? null,
        role: isUserRole(user.role) ? user.role : getDefaultUserRole(),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
      
      // Generate new tokens
      const tokens = await this.generateTokens(userResponse, ipAddress, userAgent);
      
      // Revoke the old refresh token if it has an ID
      if (storedToken.id) {
        try {
          await this.refreshTokenRepository.revokeToken(storedToken.id);
          this.logger.log(`Revoked old refresh token for user ${user.id}`);
        } catch (error: unknown) {
          this.logger.error('Failed to revoke old refresh token:', error instanceof Error ? error.message : 'Unknown error');
          // Continue even if revoking fails
        }
      }
      
      return tokens;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to refresh token: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      throw new UnauthorizedException('Failed to refresh token');
    }
  }



  /**
   * Logs out a user by revoking their tokens
   * @param refreshToken The refresh token to revoke
   * @param accessToken Optional access token to revoke
   * @returns Success status
   */
  async logout(refreshToken: string, accessToken?: string): Promise<{ success: boolean }> {
    this.logger.log('Processing logout request');

    // Validate at least one token is provided
    if (!refreshToken && !accessToken) {
      this.logger.warn('No tokens provided for logout');
      return { success: false };
    }

    try {
      // Revoke access token if provided
      if (accessToken) {
        try {
          const token = accessToken.startsWith('Bearer ') ? accessToken.split(' ')[1] : accessToken;
          const payload = await this.verifyToken(token, TokenType.ACCESS);

          if (payload.jti) {
            await this.refreshTokenRepository.revokeToken(payload.jti);
            this.logger.log(`Revoked access token for user ${payload.userId || 'unknown'}`);
          }
        } catch (error) {
          // Token might be expired, which is fine for logout
          this.logger.debug('Error revoking access token (may be expected):', 
            error instanceof Error ? error.message : 'Unknown error');
        }
      }

      // Revoke refresh token if provided
      if (refreshToken) {
        try {
          const payload = await this.verifyToken(refreshToken, TokenType.REFRESH);

          if (payload.jti) {
            await this.refreshTokenRepository.revokeToken(payload.jti);
            this.logger.log(`Revoked refresh token for user ${payload.userId || 'unknown'}`);
          }
        } catch (error) {
          // Token might be expired, which is fine for logout
          this.logger.debug('Error revoking refresh token (may be expected):', 
            error instanceof Error ? error.message : 'Unknown error');
        }
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to complete logout: ${errorMessage}`, 
        error instanceof Error ? error.stack : undefined);
      return { success: false };
    }
  }

  /**
   * Validates user credentials
   * @param email User email
   * @param password User password
   * @returns User data if valid, null otherwise
   */
  async validateUser(email: string, password: string): Promise<{ id: string; email: string; role: UserRole } | null> {
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
      // Increment failed login attempts
      try {
        const failedAttempts = (user.failedLoginAttempts || 0) + 1;
        await this.userRepository.update(user.id, { failedLoginAttempts: failedAttempts });
        
        // Lock account after too many failed attempts
        if (failedAttempts >= 5) {
          const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
          await this.userRepository.update(user.id, { lockedUntil: lockUntil });
          this.logger.warn(`Account locked for user ${user.email} due to too many failed login attempts`);
        }
      } catch (error: unknown) {
        this.logger.error('Failed to update login attempts', error instanceof Error ? error.message : 'Unknown error');
      }
      return null;
    }

    // Reset failed login attempts on successful login
    try {
      await this.userRepository.update(user.id, { 
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
        lastLoginIp: 'unknown' // This would normally be set from the request
      });
    } catch (error: unknown) {
      this.logger.error('Failed to update last login info', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Return the validated user
    return {
      id: user.id,
      email: user.email,
      role: isUserRole(user.role) ? user.role : getDefaultUserRole()
    };
  }

  /**
   * Refreshes an access token using a refresh token
   * @param refreshTokenDto Refresh token DTO or string
   * @param ipAddress IP address of the client
   * @param userAgent User agent string
   * @returns New authentication response with fresh tokens
   */
  async refreshToken(
    refreshTokenInput: RefreshTokenDto | string,
    ipAddress: string,
    userAgent: string = ''
  ): Promise<ExtendedAuthResponse> {
    try {
      // Handle both string and DTO input
      const refreshToken = typeof refreshTokenInput === 'string' 
        ? refreshTokenInput 
        : refreshTokenInput.refreshToken;

      // Verify the refresh token
      const payload = await this.verifyToken(refreshToken, TokenType.REFRESH);
      
      // Check if the token exists in the database and is not revoked
      const storedToken = await this.refreshTokenRepository.findByToken(refreshToken);
      if (!storedToken) {
        this.logger.warn('Refresh token not found in database');
        throw new UnauthorizedException('Token not found');
      }

      if (storedToken.revoked) {
        this.logger.warn('Attempted to use revoked refresh token');
        throw new UnauthorizedException('Token has been revoked');
      }

      if (!payload.userId) {
        this.logger.warn('Refresh token missing user ID');
        throw new UnauthorizedException('Invalid token payload');
      }

      // Get the user associated with the token
      const user = await this.userRepository.findById(payload.userId);
      if (!user) {
        this.logger.warn(`User ${payload.userId} not found for refresh token`);
        throw new UnauthorizedException('User not found');
      }

      // Check if user is active
      if (!user.isActive) {
        this.logger.warn(`Inactive user ${user.id} attempted to refresh token`);
        throw new UnauthorizedException('User account is inactive');
      }
      
      // Prepare user response with all required fields
      const userResponse: User = {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        username: user.username ?? null,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        emailVerified: user.emailVerified ?? false,
        emailVerificationToken: user.emailVerificationToken ?? null,
        emailVerificationExpires: user.emailVerificationExpires ?? null,
        passwordResetToken: user.passwordResetToken ?? null,
        passwordResetExpires: user.passwordResetExpires ?? null,
        resetToken: user.resetToken ?? null,
        resetTokenExpires: user.resetTokenExpires ?? null,
        failedLoginAttempts: user.failedLoginAttempts ?? 0,
        lockedUntil: user.lockedUntil ?? null,
        lastLogin: user.lastLoginAt ?? null,
        lastLoginAt: user.lastLoginAt ?? null,
        lastLoginIp: user.lastLoginIp ?? null,
        mfaSecret: user.mfaSecret ?? null,
        organizationId: user.organizationId ?? null,
        isActive: user.isActive ?? true,
        passwordChangedAt: user.passwordChangedAt ?? null,
        role: isUserRole(user.role) ? user.role : getDefaultUserRole(),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
      
      // Generate new tokens
      const tokens = await this.generateTokens(userResponse, ipAddress, userAgent);
      
      // Revoke the old refresh token if it has an ID
      if (storedToken.id) {
        try {
          await this.refreshTokenRepository.revokeToken(storedToken.id);
          this.logger.log(`Revoked old refresh token for user ${user.id}`);
        } catch (error: unknown) {
          this.logger.error('Failed to revoke old refresh token:', error instanceof Error ? error.message : 'Unknown error');
          // Continue even if revoking fails
        }
      }
      
      return tokens;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to refresh token: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      throw new UnauthorizedException('Failed to refresh token');
    }
  }


  /**
   * Logs out a user by revoking their tokens
   * @param refreshToken The refresh token to revoke
   * @param accessToken Optional access token to revoke
   * @returns Success status
   */
  async logout(refreshToken: string, accessToken?: string): Promise<{ success: boolean }> {
    this.logger.log('Processing logout request');
    
    // Validate at least one token is provided
    if (!refreshToken && !accessToken) {
      this.logger.warn('No tokens provided for logout');
      return { success: false };
    }

    try {
      // Revoke access token if provided
      if (accessToken) {
        try {
          const token = accessToken.startsWith('Bearer ') ? accessToken.split(' ')[1] : accessToken;
          const payload = await this.verifyToken(token, TokenType.ACCESS);
          
          if (payload.jti) {
            await this.refreshTokenRepository.revokeToken(payload.jti);
            this.logger.log(`Revoked access token for user ${payload.userId || 'unknown'}`);
          }
        } catch (error) {
          // Token might be expired, which is fine for logout
          this.logger.debug('Error revoking access token (may be expected):', 
            error instanceof Error ? error.message : 'Unknown error');
        }
      }

      // Revoke refresh token if provided
      if (refreshToken) {
        try {
          const payload = await this.verifyToken(refreshToken, TokenType.REFRESH);
          
          if (payload.jti) {
            await this.refreshTokenRepository.revokeToken(payload.jti);
            this.logger.log(`Revoked refresh token for user ${payload.userId || 'unknown'}`);
          }
        } catch (error) {
          // Token might be expired, which is fine for logout
          this.logger.debug('Error revoking refresh token (may be expected):', 
            error instanceof Error ? error.message : 'Unknown error');
        }
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to complete logout: ${errorMessage}`, 
        error instanceof Error ? error.stack : undefined);
      return { success: false };
    }
  }

  /**
   * Validates user credentials
   * @param email User email
   * @param password User password
   * @returns User data if valid, null otherwise
   */
  async validateUser(email: string, password: string): Promise<{ id: string; email: string; role: UserRole } | null> {
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
      // Increment failed login attempts
      try {
        const failedAttempts = (user.failedLoginAttempts || 0) + 1;
        await this.userRepository.update(user.id, { failedLoginAttempts: failedAttempts });
        
        // Lock account after too many failed attempts
        if (failedAttempts >= 5) {
          const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
          await this.userRepository.update(user.id, { lockedUntil: lockUntil });
          this.logger.warn(`Account locked for user ${user.email} due to too many failed login attempts`);
        }
      } catch (error: unknown) {
        this.logger.error('Failed to update login attempts', error instanceof Error ? error.message : 'Unknown error');
      }
      return null;
    }
    
    // Reset failed login attempts on successful login
    try {
      await this.userRepository.update(user.id, { 
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
        lastLoginIp: 'unknown' // This would normally be set from the request
      });
    } catch (error: unknown) {
      this.logger.error('Failed to update last login info', error instanceof Error ? error.message : 'Unknown error');
    }

    return {
      id: user.id,
      email: user.email,
      role: getValidUserRole(user.role),
    };
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
if (!user || !user.id || !user.email || !user.role) {
  throw new BadRequestException('Invalid user data for token generation');
}

const now = Math.floor(Date.now() / 1000);
const jti = uuidv4();

try {
  // Get JWT configuration with fallbacks
  const accessTokenSecret = this.configService.get<string>('JWT_SECRET') || '';
  const refreshTokenSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || '';
  const accessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';
  const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
  
  if (!accessTokenSecret || !refreshTokenSecret) {
    throw new InternalServerErrorException('JWT secrets are not properly configured');
  }
  
  // Calculate expiration timestamps in seconds
  const accessTokenExpiresInSeconds = this.parseTimeToSeconds(accessExpiresIn, 900);
  const refreshTokenExpiresInSeconds = this.parseTimeToSeconds(refreshExpiresIn, 604800);
  
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
        expiresIn: accessExpiresIn
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
        expiresIn: refreshExpiresIn
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Error generating tokens: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
    throw new InternalServerErrorException('Failed to generate tokens');
  }
}

/**
   * Verifies a JWT token
   * @param token The token to verify
   * @param type The expected token type
   * @returns The decoded token payload
   */
  private async verifyToken(token: string, type: TokenType): Promise<JwtPayloadWithClaims> {
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

      if (payload.type !== type) {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Token verification failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          throw new UnauthorizedException('Token has expired');
        }
        if (error.name === 'JsonWebTokenError') {
          throw new UnauthorizedException('Invalid token');
        }
      }
      throw new UnauthorizedException('Token verification failed');
    }
  }

  /**
   * Revokes all refresh tokens for a user
   * @param userId User ID
   */
  async revokeAllSessions(userId: string): Promise<void> {
    try {
      await this.refreshTokenRepository.revokeAllForUser(userId);
      this.logger.log(`Revoked all sessions for user: ${userId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to revoke sessions for user ${userId}: ${errorMessage}`, 
        error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException('Failed to revoke sessions');
    }
  }

}
