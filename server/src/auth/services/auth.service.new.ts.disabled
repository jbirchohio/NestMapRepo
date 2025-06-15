import { compare, hash } from 'bcrypt';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import { 
  Injectable, 
  Logger, 
  UnauthorizedException, 
  BadRequestException, 
  InternalServerErrorException,
  Inject,
  NotFoundException 
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  LoginDto, 
  AuthResponse, 
  TokenType, 
  UserRole, 
  UserRoles,
  UserResponse,
  TokenPayload
} from '../dtos/auth.dto';
import { UserRepository } from '../interfaces/user.repository.interface';
import { RefreshTokenRepository } from '../interfaces/refresh-token.repository.interface';
import { EmailService } from '../../email/interfaces/email.service.interface';
import { User } from '../interfaces/user.interface';

// Type for JWT payload with our custom claims
interface JwtPayloadWithClaims {
  jti: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  sub: string;
  type: TokenType;
  userId: string;
  email: string;
  role: UserRole;
}

interface RegisterDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
}

interface PasswordResetTokenPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
  jti: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
  private readonly PASSWORD_RESET_TOKEN_BYTES = 32;
  private readonly clientUrl: string;
  private readonly logger = new Logger(AuthService.name);
  
  // Token expiration times in seconds
  private readonly ACCESS_TOKEN_EXPIRES_IN = 15 * 60; // 15 minutes
  private readonly REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days

  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    @Inject('RefreshTokenRepository')
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('EmailService')
    private readonly emailService: EmailService
  ) {
    this.clientUrl = this.configService.get<string>('CLIENT_URL') || 'http://localhost:3000';
  }

  /**
   * Maps a database user to the User interface
   * @param dbUser The database user object
   * @returns A properly typed User object
   */
  private mapToUser(dbUser: any): Omit<User, 'passwordHash'> {
    // Handle both email verification field names (emailVerified from database, isEmailVerified in our interface)
    const isEmailVerified = dbUser.isEmailVerified ?? dbUser.emailVerified ?? false;
    
    // Create the user object with all required fields
    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      passwordHash: dbUser.passwordHash || '', // Will be omitted in return
      firstName: dbUser.firstName || undefined,
      lastName: dbUser.lastName || undefined,
      role: this.mapToUserRole(dbUser.role),
      isEmailVerified, // This is the required field in our User interface
      emailVerificationToken: dbUser.emailVerificationToken,
      emailVerificationExpires: dbUser.emailVerificationExpires,
      passwordResetToken: dbUser.passwordResetToken || dbUser.resetToken,
  }

  // Map role strings to UserRoles enum
  private mapToUserRole(role: string): UserRole {
    const normalizedRole = role.toLowerCase();
    if (normalizedRole === UserRoles.ADMIN) return UserRoles.ADMIN;
    if (normalizedRole === UserRoles.SUPER_ADMIN) return UserRoles.SUPER_ADMIN;
    return UserRoles.USER;
  }

  /**
   * Handles user login
   */
  async login(loginDto: LoginDto, ipAddress: string, userAgent: string = ''): Promise<AuthResponse> {
    if (!loginDto?.email || !loginDto?.password) {
      throw new BadRequestException('Email and password are required');
    }

    try {
      const user = await this.userRepository.findByEmail(loginDto.email);
      
      if (!user) {
        this.logger.warn(`Failed login attempt for non-existent email: ${loginDto.email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const timeLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000); // in minutes
        throw new UnauthorizedException(
          `Account is temporarily locked. Please try again in ${timeLeft} minute${timeLeft !== 1 ? 's' : ''}`
        );
      }

      // Verify password
      const isPasswordValid = await compare(loginDto.password, user.passwordHash);
      if (!isPasswordValid) {
        // Increment failed login attempts
        await this.userRepository.incrementFailedLoginAttempts(user.id);
        this.logger.warn(`Failed login attempt for user: ${user.id}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Reset failed login attempts on successful login
      if (user.failedLoginAttempts && user.failedLoginAttempts > 0) {
        await this.userRepository.resetFailedLoginAttempts(user.id);
      }

      // Generate tokens
      return this.generateTokens(user, ipAddress, userAgent);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Login failed: ${errorMessage}`, errorStack);
      
      // Re-throw as UnauthorizedException if it's not already a NestJS HTTP exception
      if (error instanceof BadRequestException || 
          error instanceof UnauthorizedException || 
          error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Login failed. Please try again.');
    }
  }

  /**
   * Generates access and refresh tokens for a user
   */
  public  async generateTokens(user: User, ipAddress: string, userAgent: string = ''): Promise<AuthResponse> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const jti = uuidv4();
      
      const accessTokenExpiresAt = now + this.ACCESS_TOKEN_EXPIRES_IN;
      const refreshTokenExpiresAt = now + this.REFRESH_TOKEN_EXPIRES_IN;

      // Create token payload with proper typing
      const tokenPayload: TokenPayload = {
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
      };

      // Create access token
      const accessToken = await this.jwtService.signAsync(
        tokenPayload,
        {
          secret: this.configService.get<string>('JWT_SECRET') || 'default_secret',
          expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
        }
      );

      // Create refresh token payload
      const refreshTokenPayload: TokenPayload = {
        ...tokenPayload,
        type: TokenType.REFRESH,
        exp: refreshTokenExpiresAt
      };

      // Create refresh token
      const refreshToken = await this.jwtService.signAsync(
        refreshTokenPayload,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'default_refresh_secret',
          expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
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

      // Map user to response type
      const userResponse = this.mapToUserResponse(user);

      return {
        accessToken,
        refreshToken,
        accessTokenExpiresAt: accessTokenExpiresAt * 1000, // Convert to milliseconds
        refreshTokenExpiresAt: refreshTokenExpiresAt * 1000, // Convert to milliseconds
        user: userResponse,
      };
    } catch (error) {
      this.logger.error('Error generating tokens:', error);
      throw new InternalServerErrorException('Failed to generate authentication tokens');
    }
  }

  /**
   * Handles user registration
   */
  async register(
    registerDto: RegisterDto,
    ipAddress: string,
    userAgent: string = ''
  ): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(registerDto.email);
      if (existingUser) {
        throw new BadRequestException('Email already in use');
      }

      // Create new user
      const newUser = await this.userRepository.create({
        ...registerDto,
        role: UserRoles.USER, // Default role
        isEmailVerified: false,
      });

      // Generate email verification token
      const emailVerificationToken = randomBytes(32).toString('hex');
      const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await this.userRepository.update(newUser.id, {
        emailVerificationToken,
        emailVerificationExpires,
      });

      // Send verification email
      try {
        await this.emailService.sendVerificationEmail(
          newUser.email,
          {
            name: newUser.firstName || 'User',
            verificationUrl: `${this.clientUrl}/verify-email?token=${emailVerificationToken}`,
          }
        );
      } catch (emailError) {
        this.logger.error(
          `Failed to send verification email to ${newUser.email}: ${emailError}`
        );
        // Don't fail the registration if email sending fails
      }

      // Return auth response without logging in automatically
      const user = await this.userRepository.findById(newUser.id);
      if (!user) {
        throw new InternalServerErrorException('Failed to create user');
      }
      
      // Generate tokens but don't log in yet - require email verification first
      return this.generateTokens(user, ipAddress, userAgent);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`User registration failed: ${errorMessage}`, errorStack);
      
      // Re-throw as BadRequestException if it's not already a NestJS HTTP exception
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to register user');
    }
  }

  /**
   * Handles password reset request
   */
  async requestPasswordReset(
    email: string,
    clientUrl: string = this.clientUrl
  ): Promise<{ success: boolean; message: string }> {
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    
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

      // Generate reset token
      const resetToken = randomBytes(this.PASSWORD_RESET_TOKEN_BYTES).toString('hex');
      const resetTokenExpires = new Date(Date.now() + this.RESET_TOKEN_EXPIRY_MS);

      // Save reset token to user
      await this.userRepository.update(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetTokenExpires,
      });

      // Send reset email
      try {
        const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;
        await this.emailService.sendPasswordResetEmail(
          user.email,
          {
            name: user.firstName || 'User',
            resetUrl,
            expiryHours: this.RESET_TOKEN_EXPIRY_MS / (60 * 60 * 1000), // Convert to hours
          }
        );
      } catch (emailError) {
        this.logger.error(
          `Failed to send password reset email to ${user.email}: ${emailError}`
        );
        // Don't fail the request if email sending fails
      }

      return { 
        success: true, 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      };
    } catch (error) {
      this.logger.error(`Password reset request failed: ${error}`);
      throw new InternalServerErrorException('Failed to process password reset request');
    }
  }

  /**
   * Handles password reset
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    if (!token || !newPassword) {
      throw new BadRequestException('Token and new password are required');
    }

    try {
      // Find user by reset token
      const user = await this.userRepository.findByResetToken(token);
      
      if (!user) {
        this.logger.debug(`Invalid or expired password reset token: ${token}`);
        throw new BadRequestException('Invalid or expired password reset token');
      }

      // Check if token has expired
      if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
        throw new BadRequestException('Password reset token has expired');
      }

      // Update password and clear reset token
      await this.userRepository.update(user.id, {
        password: newPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      });

      // Send password changed confirmation email
      try {
        await this.emailService.sendPasswordChangedConfirmation(
          user.email,
          {
            name: user.firstName || 'User',
          }
        );
      } catch (emailError) {
        this.logger.error(
          `Failed to send password changed confirmation to ${user.email}: ${emailError}`
        );
        // Don't fail the request if email sending fails
      }

      // Revoke all active sessions
      await this.revokeAllSessions(user.id);

      return { 
        success: true, 
        message: 'Your password has been reset successfully. Please log in with your new password.' 
      };
    } catch (error) {
      this.logger.error(`Password reset failed: ${error}`);
      
      // Re-throw as BadRequestException if it's not already a NestJS HTTP exception
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to reset password');
    }
  }

  /**
   * Revokes all active sessions for a user
   */
  async revokeAllSessions(userId: string): Promise<void> {
    try {
      await this.refreshTokenRepository.revokeAllForUser(userId);
      this.logger.log(`Revoked all sessions for user ${userId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to revoke sessions for user ${userId}: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to revoke sessions');
    }
  }
  }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Password reset failed: ${errorMessage}`);
    
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new InternalServerErrorException('Failed to reset password');
  }
}

/**
 * Log out a user by revoking their refresh token
 */
async logout(refreshToken: string): Promise<void> {
  try {
    if (!refreshToken) {
      return;
    }
    
    await this.refreshTokenRepository.revokeToken(refreshToken);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Logout failed: ${errorMessage}`);
    // Don't throw error on logout failure
  }
}

/**
 * Refresh an access token using a valid refresh token
 */
async refreshToken(refreshToken: string): Promise<AuthResponse> {
  try {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    // Verify the refresh token
    const tokenDoc = await this.refreshTokenRepository.findValidToken(refreshToken);
    if (!tokenDoc || tokenDoc.revoked) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Get the user
    const dbUser = await this.userRepository.findById(tokenDoc.userId);
    if (!dbUser) {
      throw new UnauthorizedException('User not found');
    }

    // Generate new tokens
    const user = this.mapToUser(dbUser);
    const tokens = await this.generateTokens(user);

    // Update the refresh token
    await this.refreshTokenRepository.revokeToken(refreshToken);
    await this.createRefreshToken(
      user.id,
      tokens.refreshToken,
      tokenDoc.ipAddress,
      tokenDoc.userAgent
    );

    return {
      ...tokens,
      user
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Token refresh failed: ${errorMessage}`);
    throw new UnauthorizedException('Failed to refresh token');
  }

/**
 * Sanitizes a user object by removing sensitive information
 */
private mapToUserResponse(user: User): UserResponse {
  if (!user) return null;
  
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    emailVerified: user.isEmailVerified || false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

/**
 * Creates a new refresh token in the database
 */
private async createRefreshToken(
  userId: string,
  token: string,
  ipAddress?: string,
  userAgent?: string
) {
  const expiresAt = new Date();
  expiresAt.setSeconds(
    expiresAt.getSeconds() +
      this.configService.get<number>('JWT_REFRESH_EXPIRES_IN', 60 * 60 * 24 * 7) // 7 days default
  );

  return this.refreshTokenRepository.create({
    token,
    userId,
    expiresAt,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    revoked: false,
  });
}
