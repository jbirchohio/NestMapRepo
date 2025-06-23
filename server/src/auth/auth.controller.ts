import type { Request, Response, NextFunction, RequestHandler } from '../../express-augmentations.ts';
import type { Request as ExpressRequest } from 'express-serve-static-core';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { decode } from 'jsonwebtoken';
import { 
  LoginDto, 
  RegisterDto,
  RequestPasswordResetDto, 
  ResetPasswordDto, 
  ChangePasswordDto,
  AuthResponse
} from '@shared/types/auth/dto';
import { UserRole } from '@shared/types/auth/permissions';
import { rateLimiterMiddleware } from './middleware/rate-limiter.middleware.js';
import { isErrorWithMessage } from '../utils/error-utils.js';
import { Logger } from '@nestjs/common';
import { UserRole } from './jwt/types.js';
// DTOs and types are imported from shared types package
// Response types
// Using shared types for responses
interface ErrorResponse {
    error: string;
    code?: string;
    message?: string;
    expired?: boolean;
}
/**
 * Modern class-based Auth Controller implementation
 * This replaces the legacy function-based controller
 */
export class AuthController {
    private readonly logger = new Logger(AuthController.name);
    constructor(private readonly authService: IAuthService) { }
    private handleError(error: unknown, context: string, res: Response): Response {
        if (isErrorWithMessage(error)) {
            this.logger.error(`[${context}] Error: ${error.message}`, error.stack);
            // Handle specific error types
            if (error.message.includes('credentials')) {
                return res.status(401).json({
                    error: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS'
                });
            }
            else if (error.message.includes('token')) {
                return res.status(401).json({
                    error: error.message,
                    code: 'INVALID_TOKEN'
                });
            }
        }
        // Default error response
        return res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
    /**
     * Login user
     */
    login = [
        rateLimiterMiddleware,
        async (req: ExpressRequest, res: Response<AuthResponseWithoutRefreshToken | ErrorResponse>, _next: NextFunction): Promise<void> => {
            try {
                const ip = req.ip || req.socket?.remoteAddress || 'unknown';
                const userAgent = req.headers['user-agent'] || '';
                const loginData = req.validatedData as LoginDto;
                const response = await this.authService.login(loginData, ip, userAgent);
                // Set refresh token in HTTP-only cookie
                res.cookie('refreshToken', response.refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                    path: '/api/auth/refresh-token'
                });
                // Don't send refresh token in response body when using cookies
                const { refreshToken, ...rest } = response;
                res.status(200).json(rest);
            }
            catch (error) {
                this.handleError(error, 'Login', res);
            }
        }
    ];
    /**
     * Refresh access token
     */
    refreshToken = [
        async (req: ExpressRequest, res: Response<AuthResponseWithoutRefreshToken | ErrorResponse>, _next: NextFunction): Promise<void> => {
            try {
                // Try to get refresh token from cookie first, then from body
                const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
                const ip = req.ip || req.socket?.remoteAddress || 'unknown';
                const userAgent = req.headers['user-agent'] || '';
                if (!refreshToken) {
                    res.status(401).json({
                        error: 'Refresh token is required',
                        code: 'REFRESH_TOKEN_REQUIRED'
                    });
                    return;
                }
                const response = await this.authService.refreshToken({ refreshToken }, ip, userAgent);
                // Set the new refresh token in an HTTP-only cookie
                res.cookie('refreshToken', response.refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                    path: '/api/auth/refresh-token'
                });
                // Don't send refresh token in response body when using cookies
                const { refreshToken: _, ...rest } = response;
                res.status(200).json(rest);
            }
            catch (error) {
                this.handleError(error, 'RefreshToken', res);
            }
        }
    ];
    /**
     * Logout user
     */
    logout = [
        async (req: ExpressRequest, res: Response<{
            success: boolean;
        } | ErrorResponse>, _next: NextFunction): Promise<void> => {
            try {
                const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
                const authHeader = req.headers.authorization;
                if (!refreshToken) {
                    res.status(400).json({ error: 'Refresh token is required', code: 'REFRESH_TOKEN_REQUIRED' });
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
                this.handleError(error, 'Logout', res);
            }
        }
    ];
    /**
     * Logout from all devices
     */
    logoutAllDevices = [
        async (req: ExpressRequest, res: Response<{
            success: boolean;
        } | ErrorResponse>): Promise<void> => {
            try {
                const user = (req as any).user;
                if (!user) {
                    res.status(401).json({
                        error: 'Authentication required',
                        code: 'AUTH_REQUIRED'
                    });
                    return;
                }
                // Revoke all user tokens
                await this.authService.revokeAllSessions(user.id);
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
                this.handleError(error, 'LogoutAllDevices', res);
            }
        }
    ];
    /**
     * Request password reset
     */
    requestPasswordReset = [
        rateLimiterMiddleware, // Apply rate limiting
        async (req: ExpressRequest, res: Response<{
            success: boolean;
            message: string;
        } | ErrorResponse>): Promise<void> => {
            try {
const { email } = req.validatedData as RequestPasswordResetDto;
                await this.authService.requestPasswordReset(email);
                res.status(200).json({
                    success: true,
                    message: 'If an account with that email exists, a password reset link has been sent.'
                });
            }
            catch (error) {
                this.handleError(error, 'RequestPasswordReset', res);
            }
        }
    ];
    /**
     * Reset password with token
     */
    resetPassword = [
        async (req: ExpressRequest, res: Response<{
            success: boolean;
            message?: string;
        } | ErrorResponse>): Promise<void> => {
            try {
                const { token, newPassword } = req.validatedData as ResetPasswordDto;
                await this.authService.resetPassword(token, newPassword);
                res.status(200).json({
                    success: true,
                    message: 'Password has been reset successfully.'
                });
            }
            catch (error) {
                this.handleError(error, 'ResetPassword', res);
            }
        }
    ];
}
