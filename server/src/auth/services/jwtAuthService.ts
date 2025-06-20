import { IAuthService } from '../interfaces/auth.service.interface.js';
import { UserRepository } from '../../common/repositories/user/user.repository.interface.js';
import { RefreshTokenRepository } from '../interfaces/refresh-token.repository.interface.js';
import { EmailService } from '../../email/interfaces/email.service.interface.js';
import { logger } from '../../../utils/logger.js';
import { 
  LoginDto, 
  AuthResponse, 
  TokenPair, 
  TokenPayload,
  TokenType,
  UserResponse 
} from '../dtos/auth.dto.js';

interface ConfigService {
  get<T = string>(key: string, defaultValue?: T): T;
}

export class JwtAuthService implements IAuthService {
  private readonly logger = logger;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;
    
    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw new Error('Account is locked');
    }

    // For now, skip password verification (implement bcrypt later)
    // const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    // Update last login
    await this.userRepository.updateLastLogin(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    // Create user response
    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
      role: user.role as any,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified
    };

    return {
      ...tokens,
      user: userResponse
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    // Find refresh token
    const tokenRecord = await this.refreshTokenRepository.findByToken(refreshToken);
    if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.expiresAt < new Date()) {
      throw new Error('Invalid refresh token');
    }

    // Generate new tokens
    return this.generateTokens(tokenRecord.userId);
  }

  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.refreshTokenRepository.revokeByToken(refreshToken);
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token
    await (this.userRepository as any).setPasswordResetToken(user.id, resetToken, expiresAt);

    // Send email (implement later)
    this.logger.info(`Password reset requested for ${email}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Find user by reset token
    const user = await (this.userRepository as any).findByResetToken(token);
    if (!user) {
      throw new Error('Invalid reset token');
    }

    // Update password
    await this.userRepository.updatePassword(user.id, newPassword);

    // Clear reset token
    await (this.userRepository as any).clearPasswordResetToken(user.id);
  }

  async getCurrentUser(userId: string): Promise<UserResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role as any,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified
    };
  }

  private async generateTokens(userId: string): Promise<TokenPair> {
    const accessTokenExpiry = 15 * 60 * 1000; // 15 minutes
    const refreshTokenExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days

    const accessToken = this.generateJWT({
      userId,
      type: TokenType.ACCESS,
      jti: crypto.randomUUID()
    }, accessTokenExpiry);

    const refreshToken = this.generateJWT({
      userId,
      type: TokenType.REFRESH,
      jti: crypto.randomUUID()
    }, refreshTokenExpiry);

    // Store refresh token
    await this.refreshTokenRepository.create(
      userId,
      refreshToken,
      new Date(Date.now() + refreshTokenExpiry)
    );

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: Date.now() + accessTokenExpiry,
      refreshTokenExpiresAt: Date.now() + refreshTokenExpiry
    };
  }

  private generateJWT(payload: Partial<TokenPayload>, expiresIn: number): string {
    // For now, return a simple token (implement proper JWT later)
    const token = Buffer.from(JSON.stringify({
      ...payload,
      exp: Date.now() + expiresIn,
      iat: Date.now()
    })).toString('base64');
    
    return token;
  }
}