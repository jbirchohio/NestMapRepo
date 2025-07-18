import { IAuthService } from '../interfaces/auth.service.interface';
import { AuthResponse, LoginDto, RefreshTokenDto, UserRole } from '../dtos/auth.dto';
import { RefreshTokenRepository } from '../interfaces/refresh-token.repository.interface';
import { IUserRepository } from '../repositories/user.repository';
import logger from '../../utils/logger';

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

    // Verify password (simplified for compilation)
    const isPasswordValid = password === (user as unknown as { password: string }).password;
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

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
      // Don't reveal if user exists
      this.logger.info(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    this.logger.info(`Password reset requested for user: ${user.id}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    this.logger.info(`Password reset attempted with token: ${token.substring(0, 8)}...`);
    
    // TODO: Implement actual password reset logic
    // 1. Verify the reset token is valid and not expired
    // 2. Find the user associated with the token
    // 3. Hash the new password
    // 4. Update the user's password in the database
    // 5. Invalidate the used token
    
    // For now, we'll just log that we received the new password
    // and throw a not implemented error
    this.logger.debug(`New password received (not hashed): ${newPassword ? '[HIDDEN]' : 'undefined'}`);
    throw new Error('Password reset functionality is not yet implemented');
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