import type { Response, NextFunction, Request, RequestHandler } from 'express';
import type { AuthenticatedRequest } from '@shared/types/auth/custom-request.js';
import type { IAuthService } from '../interfaces/auth.service.interface.js';
import { LoginDto, RequestPasswordResetDto, ResetPasswordDto } from '@shared/types/auth/dto/index.js';
import type { AuthResponse } from '@shared/types/auth/jwt.js';
import type { User } from '@shared/types/auth/user.js';
import type { UserResponse } from '@shared/types/auth/dto/user-response.dto.js';
import type { UserRole } from '@shared/types/auth/permissions.js';
import { rateLimiterMiddleware } from '@server/auth/middleware/rate-limiter.middleware.js';
import { isErrorWithMessage } from '../../utils/error-utils.js';
import { Logger } from '@nestjs/common';

/**
 * Response type that excludes the refresh token when sending to client
 * This is used for login and token refresh responses
 */
interface AuthResponseWithoutRefreshToken {
    user: UserResponse | null;
    accessToken: string;
    accessTokenExpiresAt: number;
    refreshTokenExpiresAt: number;
    tokenType: string;
    expiresIn: number;
}

// Re-export the UserResponse type from shared types
// This is defined in @shared/types/auth/dto/user-response.dto.ts
export class AuthController {
    private readonly logger = new Logger(AuthController.name);
    constructor(private readonly authService: IAuthService) { }
    private handleError(error: unknown, context: string): void {
        if (isErrorWithMessage(error)) {
            this.logger.error(`[${context}] Error: ${error.message}`, error.stack);
        }
        else {
            this.logger.error(`[${context}] Unknown error occurred`);
        }
    }
    /**
     * Converts a User object to a UserResponse DTO
     * Handles both snake_case and camelCase property names
     */
    private sanitizeUserResponse(user: User): UserResponse {
        // Extract properties, handling both snake_case and camelCase
        const firstName = (user as any).first_name || (user as any).firstName || null;
        const lastName = (user as any).last_name || (user as any).lastName || null;
        const emailVerified = (user as any).email_verified || (user as any).emailVerified || false;
        const createdAt = (user as any).createdAt || (user as any).created_at || new Date().toISOString();
        const updatedAt = (user as any).updatedAt || (user as any).updated_at || new Date().toISOString();
        const lastLoginAt = (user as any).last_login_at || (user as any).lastLoginAt || null;
        const displayName = (user as any).display_name || (user as any).displayName || null;
        const avatarUrl = (user as any).avatar_url || (user as any).avatarUrl || null;

        // Create the response object with proper typing
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName,
            lastName,
            emailVerified,
            createdAt: typeof createdAt === 'string' ? createdAt : new Date(createdAt).toISOString(),
            updatedAt: typeof updatedAt === 'string' ? updatedAt : new Date(updatedAt).toISOString(),
            lastLoginAt: lastLoginAt ? (typeof lastLoginAt === 'string' ? lastLoginAt : new Date(lastLoginAt).toISOString()) : null,
            displayName: displayName || [firstName, lastName].filter(Boolean).join(' ') || user.email.split('@')[0],
            avatarUrl
        };
    }
    login = [
        rateLimiterMiddleware as unknown as RequestHandler,
        async (req: AuthenticatedRequest & { body: LoginDto }, res: Response<AuthResponseWithoutRefreshToken | { error: string }>, next: NextFunction): Promise<void> => {
            try {
                const ip = req.ip || (req.socket?.remoteAddress) || 'unknown';
                const userAgent = req.headers['user-agent'] || '';
                const loginData: LoginDto = req.body;
                const response = await this.authService.login(loginData, ip, userAgent);
                // Sanitize user data before sending response
                const { tokens, user } = response;
                const { access_token: accessToken, refresh_token: refreshToken } = tokens;
                
                // Set refresh token in HTTP-only cookie
                res.cookie('refreshToken', refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                    path: '/api/auth/refresh-token'
                });
                const expiresIn = 3600; // Default to 1 hour, adjust as needed
                const tokenType = 'Bearer';
                const sanitizedUser = this.sanitizeUserResponse(user);
                // Calculate token expiration timestamps (in seconds since epoch)
                const now = Math.floor(Date.now() / 1000);
                const accessTokenExpiresAt = now + expiresIn;
                const refreshTokenExpiresAt = now + (7 * 24 * 60 * 60); // 7 days in seconds
                // Create response object matching AuthResponseWithoutRefreshToken
                const responseData: AuthResponseWithoutRefreshToken = {
                    accessToken,
                    accessTokenExpiresAt,
                    refreshTokenExpiresAt,
                    user: sanitizedUser,
                    tokenType,
                    expiresIn
                }
                res.status(200).json(responseData);
            }
            catch (error) {
                this.handleError(error, 'Login');
                next(error);
            }
        }
    ];
    refreshToken = [
        async (req: Request<{
            refreshToken?: string;
        }, AuthResponseWithoutRefreshToken | {
            error: string;
        }>, res: Response<AuthResponseWithoutRefreshToken | {
            error: string;
        }>, next: NextFunction): Promise<void> => {
            try {
                // Try to get refresh token from cookie first, then from body
                const refreshToken = (req.cookies?.refreshToken || req.body.refreshToken) as string | undefined;
                const ip = req.ip || (req.socket?.remoteAddress) || 'unknown';
                const userAgent = req.headers['user-agent'] || '';
                if (!refreshToken) {
                    res.status(400).json({ error: 'Refresh token is required' });
                    return;
                }
                const response = await this.authService.refreshToken(refreshToken, ip, userAgent);
                const { tokens, user } = response;
                const { 
                    access_token: accessToken, 
                    refresh_token: newRefreshToken,
                    token_type: tokenType = 'Bearer'
                } = tokens;
                // Default to 1 hour if expires_in is not provided
                const expiresIn = 3600;
                
                // Set the new refresh token in an HTTP-only cookie
                res.cookie('refreshToken', newRefreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                    path: '/api/auth/refresh-token'
                });
                // Don't send refresh token in response body when using cookies
                const sanitizedUser = this.sanitizeUserResponse(user);
                // Calculate token expiration timestamps (in seconds since epoch)
                const now = Math.floor(Date.now() / 1000);
                const accessTokenExpiresAt = now + expiresIn;
                const refreshTokenExpiresAt = now + (7 * 24 * 60 * 60); // 7 days in seconds
                // Create response object matching AuthResponseWithoutRefreshToken
                const responseData: AuthResponseWithoutRefreshToken = {
                    accessToken,
                    accessTokenExpiresAt,
                    refreshTokenExpiresAt,
                    user: sanitizedUser,
                    tokenType,
                    expiresIn
                } as const;
                res.status(200).json(responseData);
            }
            catch (error) {
                this.handleError(error, 'RefreshToken');
                next(error);
            }
        }
    ];
    logout = [
        async (req: Request<{
            refreshToken?: string;
        }, {
            success: boolean;
        } | {
            error: string;
        }>, res: Response<{
            success: boolean;
        } | {
            error: string;
        }>, next: NextFunction): Promise<void> => {
            try {
                const refreshToken = (req.cookies?.refreshToken || req.body.refreshToken) as string | undefined;
                const authHeader = req.headers.authorization as string | undefined;
                if (!refreshToken) {
                    res.status(400).json({ error: 'Refresh token is required' });
                    return;
                }
                await this.authService.logout(refreshToken, authHeader);
                // Clear refresh token cookie
                res.clearCookie('refreshToken', {
                    path: '/api/auth/refresh-token',
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict'
                });
                res.status(200).json({ success: true });
            }
            catch (error) {
                this.handleError(error, 'Logout');
                next(error);
            }
        }
    ];
    requestPasswordReset = [
        rateLimiterMiddleware as unknown as RequestHandler,
        async (req: Request<RequestPasswordResetDto>, res: Response, next: NextFunction): Promise<void> => {
            try {
                const requestData: RequestPasswordResetDto = {
                    ...req.body,
                    resetUrl: process.env.PASSWORD_RESET_URL // Add reset URL from environment
                };
                await this.authService.requestPasswordReset(requestData);
                res.status(200).json({
                    success: true,
                    message: 'If an account with that email exists, a password reset link has been sent.'
                });
            }
            catch (error) {
                this.handleError(error, 'RequestPasswordReset');
                next(error);
            }
        }
    ];
    resetPassword = [
        async (req: Request<ResetPasswordDto>, res: Response, next: NextFunction): Promise<void> => {
            try {
                const resetData: ResetPasswordDto = req.body;
                await this.authService.resetPassword(resetData);
                res.status(200).json({
                    success: true,
                    message: 'Password has been reset successfully.'
                });
            }
            catch (error) {
                this.handleError(error, 'ResetPassword');
                next(error);
            }
        }
    ];
    getCurrentUser = [
        async (req: Request<unknown, {
            user: Omit<UserResponse, 'createdAt' | 'updatedAt'>;
        } | {
            error: string;
        }> & {
            user?: any; // This will be properly typed by the auth middleware
        }, res: Response<{
            user: Omit<UserResponse, 'createdAt' | 'updatedAt'>;
        } | {
            error: string;
        }>, next: NextFunction): Promise<void> => {
            try {
                // The user should be attached to the request by the authentication middleware
                const user = (req as any).user;
                if (!user) {
                    res.status(401).json({ error: 'Not authenticated' });
                    return;
                }
                // Sanitize the user data before sending
                const sanitizedUser = this.sanitizeUserResponse(user);
                res.status(200).json({ user: sanitizedUser });
            }
            catch (error) {
                this.handleError(error, 'GetCurrentUser');
                next(error);
            }
        }
    ];
    // Logout from all devices
    logoutAllDevices = [
        async (req: Request, res: Response<{
            success: boolean;
            message: string;
        } | {
            error: string;
        }>, next: NextFunction): Promise<void> => {
            try {
                // The user should be attached to the request by the authentication middleware
                const user = (req as any).user;
                if (!user) {
                    res.status(401).json({ error: 'Not authenticated' });
                    return;
                }
                // Revoke all sessions for the user
                await this.authService.revokeAllSessions(user.id);
                // Clear refresh token cookie if it exists
                if (req.cookies?.refreshToken) {
                    res.clearCookie('refreshToken', {
                        path: '/api/auth/refresh-token',
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'strict'
                    });
                }
                res.status(200).json({
                    success: true,
                    message: 'Logged out from all devices successfully'
                });
            }
            catch (error) {
                this.handleError(error, 'LogoutAllDevices');
                next(error);
            }
        }
    ];
}
