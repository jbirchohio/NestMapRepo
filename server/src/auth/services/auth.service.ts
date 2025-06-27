import type { 
  LoginDto, 
  RegisterDto,
  RequestPasswordResetDto, 
  ResetPasswordDto,
  ChangePasswordDto,
  UserResponse
} from '@shared/src/types/auth/dto/index.js';
import type { AuthResponse } from '@shared/src/types/auth/jwt.js';
import { verifyToken } from '../jwt/index.js';
import { UserRole } from '@shared/src/types/auth/permissions.js';
import type { IAuthService } from '../interfaces/auth.service.interface.js';
import type { RefreshTokenRepository } from '../interfaces/refresh-token.repository.interface.js';
import type { UserRepository } from '../../common/repositories/user/user.repository.interface.js';
import { logger } from '../../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { mapToUser } from './map-to-user.js';
export class AuthService implements IAuthService {
    private readonly logger = logger;
    
    /**
     * Verify if the provided access token is valid
     * @param accessToken - The JWT access token to verify
     * @returns Promise that resolves to true if the token is valid, false otherwise
     */
    async isAuthenticated(accessToken: string): Promise<boolean> {
        if (!accessToken) return false;
        
        try {
            const result = await verifyToken(accessToken, 'access');
            return result.valid;
        } catch (error) {
            this.logger.error('Error verifying token:', error);
            return false;
        }
    }
    
    /**
     * Get the current user's information using their access token
     * @param accessToken - The JWT access token
     * @returns Promise that resolves to the user's information or null if not found
     */
    async getCurrentUser(accessToken: string): Promise<UserResponse | null> {
        if (!accessToken) return null;
            
        try {
            const result = await verifyToken(accessToken, 'access');
            if (!result.valid || !result.payload || !result.payload.userId) return null;
            
            // Get the user from the repository using the user ID from the token
            const userId = result.payload.userId;
            const user = await this.userRepository.findById(userId);
            if (!user) return null;
            
            // Ensure we have a valid role, default to MEMBER if not specified
            const userRole = user.role && Object.values(UserRole).includes(user.role as UserRole)
                ? (user.role as UserRole)
                : UserRole.MEMBER;
            
            // Convert to UserResponse format
            return this.formatUserResponse({
                ...user,
                role: userRole // Ensure we use the validated role
            });
        } catch (error) {
            this.logger.error('Error getting current user:', error);
            return null;
        }
    }
    
    private readonly JWT_SECRET = 'fallback-secret-key';
    private readonly JWT_EXPIRES_IN = '15m';

    /**
     * Formats a user object from the database to match the UserResponse type
     * @param user - The user object from the database
     * @returns A properly formatted UserResponse object
     */
    private formatUserResponse(user: any /** FIXANYERROR: Replace 'any' */): UserResponse {
        return {
            id: user.id,
            email: user.email,
            role: user.role as UserRole,
            firstName: user.first_name || user.firstName || null,
            lastName: user.last_name || user.lastName || null,
            emailVerified: user.email_verified || user.emailVerified || false,
            createdAt: (user.created_at || user.createdAt)?.toISOString?.() || new Date().toISOString(),
            updatedAt: (user.updated_at || user.updatedAt)?.toISOString?.() || new Date().toISOString(),
            lastLoginAt: (user.last_login_at || user.lastLoginAt)?.toISOString?.() || null,
            displayName: [user.first_name || user.firstName, user.last_name || user.lastName].filter(Boolean).join(' ') || user.email,
            avatarUrl: user.avatar_url || user.avatarUrl || null
        };
    }

    private readonly REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days in seconds
    constructor(private readonly refreshTokenRepository: RefreshTokenRepository, private readonly userRepository: UserRepository) { }
    async login(loginData: LoginDto, ip: string, userAgent: string): Promise<AuthResponse> {
        const { email, password } = loginData;
        
        // Find user by email
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new Error('Invalid credentials');
        }
        
        // Verify password using the repository's verifyPassword method
        const isPasswordValid = await this.userRepository.verifyPassword(user.id, password);
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
        const userResponse = this.formatUserResponse(user);
        const userForAuth = mapToUser(userResponse, user);
        
        return {
            user: userForAuth,
            tokens: {
                access_token: accessToken,
                refresh_token: refreshToken.token,
                expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
                token_type: 'Bearer'
            }
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
        const userResponse = this.formatUserResponse(user);
        const userForAuth = mapToUser(userResponse, user);
        
        return {
            user: userForAuth,
            tokens: {
                access_token: newAccessToken,
                refresh_token: newRefreshToken.token,
                expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
                token_type: 'Bearer'
            }
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
        
        // Verify current password using the repository's verifyPassword method
        const isPasswordValid = await this.userRepository.verifyPassword(userId, currentPassword);
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
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
        return `Bearer.${encodedPayload}.signature`;
    }

    /**
     * Formats a user object from the database to match the UserResponse type
     * @param user - The user object from the database
     * @returns A properly formatted UserResponse object
     */

    private generateRefreshToken(): string {
        return `rf_${uuidv4()}_${Date.now()}`;
    }
    
    async register(registerData: RegisterDto, ip: string, userAgent: string): Promise<AuthResponse> {
        const { email, password, firstName, lastName } = registerData;
        
        // Check if user already exists
        const existingUser = await this.userRepository.findByEmail(email);
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
            emailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        // Generate tokens
        return this.login(registerData, ip, userAgent);
    }
}
