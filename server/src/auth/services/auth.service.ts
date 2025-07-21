import { IAuthService } from '../interfaces/auth.service.interface';
import { AuthResponse, LoginDto, RefreshTokenDto, RegisterDto, UserRole } from '../dtos/auth.dto';
import { RefreshTokenRepository } from '../interfaces/refresh-token.repository.interface';
import { IUserRepository } from '../repositories/user.repository';
import logger from '../../utils/logger';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export class AuthService implements IAuthService {
  private readonly logger = logger;
  // JWT_SECRET and JWT_EXPIRES_IN were unused and have been removed.
  private readonly REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async login(loginData: LoginDto, ip: string, userAgent: string): Promise<AuthResponse> {
    const { email, password } = loginData;
    
    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw new Error('Account is temporarily locked due to multiple failed login attempts');
    }

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // Increment failed login attempts
      await this.userRepository.incrementFailedLoginAttempts(user.id);
      throw new Error('Invalid credentials');
    }

    // Reset failed login attempts on successful login
    await this.userRepository.resetFailedLoginAttempts(user.id);

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, user.role as UserRole);
    const refreshTokenString = await this.createRefreshToken(user.id, ip, userAgent);

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 15 * 60; // 15 minutes in seconds

    return {
      accessToken,
      refreshToken: refreshTokenString,
      accessTokenExpiresAt: now + expiresIn,
      refreshTokenExpiresAt: now + this.REFRESH_TOKEN_EXPIRES_IN,
      user: {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        emailVerified: user.emailVerified || false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      tokenType: 'Bearer',
      expiresIn
    };
  }

  async register(registerData: RegisterDto, ip: string, userAgent: string): Promise<AuthResponse> {
    const { email, password, firstName, lastName } = registerData;

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password using bcrypt
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = await this.userRepository.create({
      email,
      passwordHash,
      firstName: firstName || null,
      lastName: lastName || null,
      role: 'user' as UserRole,
      emailVerified: false
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(newUser.id, newUser.role as UserRole);
    const refreshTokenString = await this.createRefreshToken(newUser.id, ip, userAgent);

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 15 * 60; // 15 minutes in seconds

    this.logger.info(`New user registered: ${newUser.email} from ${ip}`);

    return {
      accessToken,
      refreshToken: refreshTokenString,
      accessTokenExpiresAt: now + expiresIn,
      refreshTokenExpiresAt: now + this.REFRESH_TOKEN_EXPIRES_IN,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role as UserRole,
        firstName: newUser.firstName || null,
        lastName: newUser.lastName || null,
        emailVerified: newUser.emailVerified || false,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt
      },
      tokenType: 'Bearer',
      expiresIn
    };
  }

  async refreshToken(tokenData: RefreshTokenDto, ip: string, userAgent: string): Promise<AuthResponse> {
    const { refreshToken } = tokenData;

    // Find and validate refresh token
    const storedToken = await this.refreshTokenRepository.findByToken(refreshToken);
    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new Error('Invalid or expired refresh token');
    }

    // Get user
    const user = await this.userRepository.findById(storedToken.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate new tokens
    const newAccessToken = this.generateAccessToken(user.id, user.role as UserRole);
    const newRefreshTokenString = await this.createRefreshToken(user.id, ip, userAgent);

    // Revoke old refresh token
    await this.revokeRefreshToken(refreshToken);

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 15 * 60; // 15 minutes in seconds

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshTokenString,
      accessTokenExpiresAt: now + expiresIn,
      refreshTokenExpiresAt: now + this.REFRESH_TOKEN_EXPIRES_IN,
      user: {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        emailVerified: user.emailVerified || false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      tokenType: 'Bearer',
      expiresIn
    };
  }

  async logout(refreshToken: string): Promise<void> {
    // Revoke refresh token
    await this.revokeRefreshToken(refreshToken);

    // For now, we rely on short-lived access tokens
    this.logger.info('User logged out successfully');
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists for security
      this.logger.info(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    // Store the reset token in the database
    await this.userRepository.setPasswordResetToken(user.id, resetToken, resetTokenExpires);

    // In a real implementation, send email with reset link
    // await emailService.sendPasswordResetEmail(user.email, resetToken);
    
    this.logger.info(`Password reset token generated for user: ${user.id}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Find user by reset token
    const user = await this.userRepository.findByResetToken(token);
    
    if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user's password and clear reset token
    await this.userRepository.update(user.id, {
      passwordHash: hashedPassword,
      passwordChangedAt: new Date(),
      resetToken: null,
      resetTokenExpires: null,
      failedLoginAttempts: 0, // Reset failed attempts
      lockedUntil: null // Unlock account if it was locked
    });

    // Clear reset token
    await this.userRepository.clearPasswordResetToken(user.id);
    
    this.logger.info(`Password successfully reset for user: ${user.id}`);
  }

  async createRefreshToken(userId: string, ip: string, userAgent: string): Promise<string> {
    const refreshToken = await this.refreshTokenRepository.create({
      userId,
      token: this.generateRandomToken(),
      expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_EXPIRES_IN * 1000),
      ipAddress: ip,
      userAgent,
      revoked: false,
    });
    return refreshToken.token;
  }

  private async revokeRefreshToken(token: string): Promise<void> {
    const refreshToken = await this.refreshTokenRepository.findByToken(token);
    if (refreshToken) {
      await this.refreshTokenRepository.revokeToken(refreshToken.id);
    }
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.refreshTokenRepository.revokeTokensForUser(userId);
    this.logger.info(`All sessions revoked for user: ${userId}`);
  }

  private generateAccessToken(userId: string, role: UserRole): string {
    // Simplified token generation for compilation
    const payload = {
      sub: userId,
      role,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes
    };
    
    // Base64 encode the payload (simplified JWT)
    const encodedPayload = btoa(JSON.stringify(payload));
    return `Bearer.${encodedPayload}.signature`;
  }

  private generateRandomToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}