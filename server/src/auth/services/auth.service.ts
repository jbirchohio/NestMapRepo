import type { 
  LoginDto, 
  RegisterDto,
  RequestPasswordResetDto, 
  ResetPasswordDto,
  ChangePasswordDto,
  AuthResponse,
  UserResponse
} from '@shared/types/auth/dto/index.js';
import type { UserRole } from '@shared/types/auth/permissions.js';
import type { IAuthService } from '../interfaces/auth.service.interface.js';
import type { RefreshTokenRepository } from '../interfaces/refresh-token.repository.interface.js';
import type { UserRepository } from '../../common/repositories/user/user.repository.interface.js';
import { logger } from '../../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
export class AuthService implements IAuthService {
    private readonly logger = logger;
    private readonly JWT_SECRET = 'fallback-secret-key';
    private readonly JWT_EXPIRES_IN = '15m';
    private readonly REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days in seconds
    constructor(private readonly refreshTokenRepository: RefreshTokenRepository, private readonly userRepository: UserRepository) { }
    async login(loginData: LoginDto, ip: string, userAgent: string): Promise<AuthResponse> {
        const { email, password, tenantId } = loginData;
        
        // Find user by email and tenant
        const user = await this.userRepository.findByEmailAndTenant(email, tenantId);
        if (!user) {
            throw new Error('Invalid credentials');
        }
        
        // Verify password (in a real app, use bcrypt or similar)
        const isPasswordValid = await this.verifyPassword(password, user.password);
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
    async refreshToken(refreshToken: string, ip: string, userAgent: string): Promise<AuthResponse> {
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
    async requestPasswordReset(data: RequestPasswordResetDto): Promise<void> {
        const { email } = data;
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            // Don't reveal if user exists
            this.logger.info(`Password reset requested for non-existent email: ${email}`);
            return;
        }
        this.logger.info(`Password reset requested for user: ${user.id}`);
    }
    async resetPassword(data: ResetPasswordDto): Promise<void> {
        const { token, newPassword } = data;
        this.logger.info(`Password reset attempted with token: ${token}`);
        throw new Error('Password reset not yet implemented');
    }
    async revokeAllSessions(userId: string): Promise<void> {
        await this.refreshTokenRepository.revokeByUserId(userId);
        this.logger.info(`All sessions revoked for user: ${userId}`);
    }
    async changePassword(userId: string, data: ChangePasswordDto): Promise<void> {
        const { currentPassword, newPassword } = data;
        
        // Get user
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        
        // Verify current password
        const isPasswordValid = await this.verifyPassword(currentPassword, user.password);
        if (!isPasswordValid) {
            throw new Error('Current password is incorrect');
        }
        
        // Update password (in a real app, hash the new password)
        await this.userRepository.updatePassword(userId, newPassword);
        
        // Revoke all refresh tokens for security
        await this.revokeAllSessions(userId);
    }
    
    private async verifyPassword(plainText: string, hashed: string): Promise<boolean> {
        // In a real app, use bcrypt or similar for password hashing
        return plainText === hashed; // Simplified for example
    }
    
    private generateAccessToken(userId: string, role: UserRole): string {
        // In a real app, use jsonwebtoken or similar
        const payload = {
            sub: userId,
            role,
            jti: uuidv4(),
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes
        };
        // Base64 encode the payload (simplified JWT)
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
        return `Bearer.${encodedPayload}.signature`;
    }
    
    private generateRefreshToken(): string {
        return `rf_${uuidv4()}_${Date.now()}`;
    }
    
    async register(registerData: RegisterDto, ip: string, userAgent: string): Promise<AuthResponse> {
        const { email, password, firstName, lastName, tenantId } = registerData;
        
        // Check if user already exists
        const existingUser = await this.userRepository.findByEmailAndTenant(email, tenantId);
        if (existingUser) {
            throw new Error('User with this email already exists');
        }
        
        // Create user (in a real app, hash the password)
        const newUser = await this.userRepository.create({
            email,
            password, // In a real app, hash this
            firstName,
            lastName,
            role: 'user',
            tenantId,
            emailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        // Generate tokens
        return this.login(registerData, ip, userAgent);
    }
}
