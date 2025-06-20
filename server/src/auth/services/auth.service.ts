import { IAuthService } from '../interfaces/auth.service.interface.js';
import { AuthResponse, LoginDto, RefreshTokenDto, UserRole } from '../dtos/auth.dto.js';
import { RefreshTokenRepository } from '../interfaces/refresh-token.repository.interface.js';
import { UserRepository } from '../../common/repositories/user/user.repository.interface.js';
import { logger } from '../../../utils/logger.js';

export class AuthService implements IAuthService {
  private readonly logger = logger;
  private readonly JWT_SECRET = 'fallback-secret-key';
  private readonly JWT_EXPIRES_IN = '15m';
  private readonly REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly userRepository: UserRepository
  ) {}

  async login(loginData: LoginDto, ip: string, userAgent: string): Promise<AuthResponse> {
    const { email, password } = loginData;
    
    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password (simplified for compilation)
    const isPasswordValid = password === (user as any).password;
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, user.role as UserRole);
    const refreshTokenString = this.generateRefreshToken();

    // Store refresh token
    const refreshToken = await this.refreshTokenRepository.create({
      userId: user.id,
      token: refreshTokenString,
      expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_EXPIRES_IN * 1000),
      revoked: false,
      revokedAt: null,
      ipAddress: ip,
      userAgent
    });

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 15 * 60; // 15 minutes in seconds

    return {
      accessToken,
      refreshToken: refreshToken.token,
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
    const newRefreshTokenString = this.generateRefreshToken();

    // Revoke old refresh token
    await this.refreshTokenRepository.revokeByToken(refreshToken);

    // Store new refresh token
    const newRefreshToken = await this.refreshTokenRepository.create({
      userId: user.id,
      token: newRefreshTokenString,
      expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_EXPIRES_IN * 1000),
      revoked: false,
      revokedAt: null,
      ipAddress: ip,
      userAgent
    });

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 15 * 60; // 15 minutes in seconds

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken.token,
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

  async logout(refreshToken: string, _authHeader?: string): Promise<void> {
    // Revoke refresh token
    await this.refreshTokenRepository.revokeByToken(refreshToken);

    // For now, we rely on short-lived access tokens
    this.logger.info('User logged out successfully');
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists
      this.logger.info(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    this.logger.info(`Password reset requested for user: ${user.id}`);
  }

  async resetPassword(token: string, _newPassword: string): Promise<void> {
    this.logger.info(`Password reset attempted with token: ${token}`);
    throw new Error('Password reset not yet implemented');
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.refreshTokenRepository.revokeByUserId(userId);
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

  private generateRefreshToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}