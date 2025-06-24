/**
 * Auth Service Implementation
 * Implements the IAuthService interface
 */
import { compare, hash } from 'bcrypt';
import { sign, decode, verify } from 'jsonwebtoken';
import { db } from '../../db/db.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import type { IAuthService } from './interfaces/auth.service.interface.js';
import type { LoginDto, RefreshTokenDto, AuthResponse, UserRole } from './dtos/auth.dto.js';
import logger from '../../utils/logger.js';
import { redisClient } from '../../utils/redis.js';
export class AuthService implements IAuthService {
    private readonly SALT_ROUNDS = 10;
    
    // Pass through to secureJwt implementation
    public async generateAuthTokens(userId: string, email: string, role: string, organizationId?: string): Promise<AuthResponse> {
        const tokens = await generateSecureAuthTokens(userId, email, role as any);
        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            accessTokenExpiresAt: tokens.accessTokenExpiresAt,
            refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
            tokenType: 'Bearer',
            expiresIn: Math.floor((tokens.accessTokenExpiresAt.getTime() - Date.now()) / 1000),
            user: {
                id: userId,
                email,
                role: role as any,
                organizationId,
                emailVerified: true,
                isActive: true
            }
        };
    }

    public async refreshToken(refreshTokenDto: RefreshTokenDto, ip: string, userAgent: string): Promise<AuthResponse> {
        const result = await refreshSecureAccessToken(refreshTokenDto.refreshToken);
        if (!result) {
            throw new Error('Invalid or expired refresh token');
        }
        
        // Get user details
        const user = await db.query.users.findFirst({
            where: eq(users.id, result.userId)
        });
        
        if (!user) {
            throw new Error('User not found');
        }
        
        return {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            accessTokenExpiresAt: result.accessTokenExpiresAt,
            refreshTokenExpiresAt: result.refreshTokenExpiresAt,
            tokenType: 'Bearer',
            expiresIn: Math.floor((result.accessTokenExpiresAt.getTime() - Date.now()) / 1000),
            user: {
                id: user.id,
                email: user.email,
                role: user.role as any,
                organizationId: user.organizationId,
                emailVerified: user.emailVerified || false,
                isActive: user.isActive || true
            }
        };
    }
    
    /**
     * Verify a JWT token
     * @param token - The token to verify
     * @param type - The expected token type ('access' | 'refresh' | 'password_reset')
     * @returns Verification result with token payload if valid
     */
    public async verifyToken(token: string, type: TokenType): Promise<VerifyTokenResult> {
        return verifySecureToken(token, type);
    }
    
    /**
     * Revoke a specific token by its ID
     * @param tokenId - The token ID to revoke
     */
    public async revokeToken(tokenId: string): Promise<void> {
        return revokeToken(tokenId);
    }
    
    /**
     * Revoke all tokens for a specific user
     * @param userId - The user ID whose tokens to revoke
     */
    public async revokeAllUserTokens(userId: string): Promise<void> {
        return revokeAllUserTokens(userId);
    }
    
    /**
     * Decode a JWT token without verification
     * @param token - The token to decode
     * @returns Decoded token payload or null if invalid
     */
    public async decodeToken(token: string): Promise<TokenPayload | null> {
        try {
            const result = await this.verifyToken(token, 'access');
            return result.valid ? (result.payload as TokenPayload) : null;
        } catch (error) {
            logger.error('Error decoding token:', error);
            return null;
        }
    }
    /**
     * Generate JWT tokens for authentication
     * @deprecated Use generateAuthTokens instead
     */
    private async generateTokens(userId: string, email: string, role: UserRole, organizationId?: string): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }> {
        const tokens = await this.generateAuthTokens(userId, email, role, organizationId);
        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn
        };
    }
    /**
     * Verify and decode a JWT token
     */
    private async verifyToken(token: string): Promise<{
        valid: boolean;
        expired: boolean;
        payload?: any;
        error?: string;
    }> {
        try {
            // First check if token is in blacklist
            const isRevoked = await this.isTokenRevoked(token);
            if (isRevoked) {
                return {
                    valid: false,
                    expired: false,
                    error: 'Token has been revoked'
                };
            }
            const decoded = verify(token, this.JWT_SECRET);
            return {
                valid: true,
                expired: false,
                payload: decoded
            };
        }
        catch (error: any) {
            return {
                valid: false,
                expired: error.name === 'TokenExpiredError',
                error: error.message
            };
        }
    }
    /**
     * Check if a token has been revoked
     */
    private async isTokenRevoked(token: string): Promise<boolean> {
        try {
            const decoded = decode(token, { json: true }) as {
                jti?: string;
            } | null;
            if (!decoded?.jti)
                return false;
            const result = await redisClient.get(`revoked:${decoded.jti}`);
            return !!result;
        }
        catch (error) {
            this.logger.error('Error checking token revocation:', error);
            return false;
        }
    }
    /**
     * Revoke a token by adding it to the blacklist
     */
    private async revokeToken(tokenId: string, ttl: number): Promise<void> {
        try {
            await redisClient.set(`revoked:${tokenId}`, '1', 'EX', ttl);
        }
        catch (error) {
            this.logger.error('Error revoking token:', error);
            throw new Error('Failed to revoke token');
        }
    }
    /**
     * Authenticate a user and generate tokens
     */
    async login(loginData: LoginRequest, ip: string, userAgent: string): Promise<LoginResponse> {
        const { email, password } = loginData;
        // Find user by email
        const user = await db.query.users.findFirst({
            where: eq(users.email, email)
        });
        if (!user || !user.passwordHash) {
            throw new Error('Invalid credentials');
        }
        // Verify password
        const isPasswordValid = await compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new Error('Invalid credentials');
        }
        // Generate tokens
        const tokens = await this.generateAuthTokens(user.id, user.email, (user.role as UserRole) || 'user', user.organizationId || undefined);
        // Update last login
        await db.update(users)
            .set({ lastLoginAt: new Date() })
            .where(eq(users.id, user.id));
        // Log the login
        this.logger.info(`User logged in: ${user.email} from ${ip} using ${userAgent}`);
        // Return response
        return {
            ...tokens,
            tokenType: 'Bearer',
            user: {
                id: user.id,
                email: user.email,
                role: user.role as UserRole,
                organizationId: user.organizationId
            }
        };
    }
    /**
     * Refresh access token using a valid refresh token
     */
    async refreshToken(data: RefreshTokenRequest, ip: string, userAgent: string): Promise<LoginResponse> {
        const { refreshToken } = data;
        // Verify refresh token
        const result = await this.verifyToken(refreshToken, 'refresh');
        if (!result.valid || !result.payload) {
            throw new Error(result.error || 'Invalid refresh token');
        }
        // Get user from database
        const [user] = await db.select().from(users).where(eq(users.id, result.payload.sub));
        if (!user) {
            throw new Error('User not found');
        }
        // Generate new tokens
        const tokens = await this.generateAuthTokens(user.id, user.email, (user.role as UserRole) || 'user', user.organizationId || undefined);
        // Log the token refresh
        this.logger.info(`Token refreshed for user: ${user.email} from ${ip} using ${userAgent}`);
        return {
            ...tokens,
            tokenType: 'Bearer',
            user: {
                id: user.id,
                email: user.email,
                role: user.role as UserRole,
                organizationId: user.organizationId
            }
        };
    }
    /**
     * Logout a user by revoking their tokens
     */
    async logout(refreshToken: string, authHeader?: string): Promise<void> {
        // Revoke refresh token
        const refreshDecoded = decode(refreshToken, { json: true }) as {
            jti?: string;
            exp?: number;
        } | null;
        if (refreshDecoded?.jti && refreshDecoded.exp) {
            const ttl = Math.ceil((refreshDecoded.exp * 1000 - Date.now()) / 1000);
            if (ttl > 0) {
                await this.revokeToken(refreshDecoded.jti, ttl);
            }
        }
        // Also revoke access token if provided
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            if (token) {
                const decoded = decode(token, { json: true }) as {
                    jti?: string;
                    exp?: number;
                } | null;
                if (decoded?.jti && decoded.exp) {
                    const ttl = Math.ceil((decoded.exp * 1000 - Date.now()) / 1000);
                    if (ttl > 0) {
                        await this.revokeToken(decoded.jti, ttl);
                    }
                }
            }
        }
    }
    /**
     * Revoke all sessions for a user
     */
    async revokeAllSessions(userId: string): Promise<void> {
        // In a real implementation, this would:
        // 1. Track all active tokens for a user
        // 2. Add them all to the revoked tokens list
        // For now, we'll just log the action
        this.logger.info(`Revoked all sessions for user: ${userId}`);
    }
    /**
     * Request a password reset for a user
     */
    async requestPasswordReset(email: string): Promise<void> {
        const user = await db.query.users.findFirst({
            where: eq(users.email, email)
        });
        if (user) {
            // In a real implementation, you would:
            // 1. Generate a password reset token
            // 2. Store it with an expiry
            // 3. Send an email with the reset link
            this.logger.info(`Password reset requested for: ${email}`);
        }
    }
    /**
     * Reset a user's password using a valid reset token
     */
    async resetPassword(token: string, newPassword: string): Promise<void> {
        // In a real implementation, you would:
        // 1. Verify the reset token
        // 2. Find the associated user
        // 3. Update their password
        // 4. Invalidate the token
        // For now, we'll just log the attempt
        this.logger.info(`Password reset attempt with token: ${token.substring(0, 10)}...`);
    }
}
