import { Request, Response, NextFunction, RequestHandler } from 'express';
import { decode } from 'jsonwebtoken';
import { IAuthService } from './interfaces/auth.service.interface';
import { 
  LoginDto, 
  RequestPasswordResetDto, 
  ResetPasswordDto,
  RefreshTokenDto
} from './dtos/auth.dto';
import { rateLimiterMiddleware } from './middleware/rate-limiter.middleware';
import { isErrorWithMessage } from '../utils/error-utils';
import { Logger } from '@nestjs/common';
import { UserRole } from './types';

// DTOs
interface LoginDto {
  email: string;
  password: string;
}

interface RequestPasswordResetDto {
  email: string;
}

interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

interface RefreshTokenDto {
  refreshToken: string;
}

// Response types
interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    organizationId?: string | null;
  };
}

interface AuthResponseWithoutRefreshToken {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: string | null;
    organizationId: string | null;
  };
}

interface ErrorResponse {
  error: string;
  code?: string;
  message?: string;
  expired?: boolean;
}

// Utility function to check if an error has a message property
function isErrorWithMessage(error: unknown): error is { message: string; stack?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

// Rate limiter middleware for sensitive endpoints
const rateLimiterMiddleware: RequestHandler = (req, res, next) => {
  // In a real implementation, this would check against a rate limiter
  // For now, we'll just pass through
  next();
};

/**
 * Modern class-based Auth Controller implementation
 * This replaces the legacy function-based controller
 */
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: IAuthService) {}

  private handleError(error: unknown, context: string, res: Response): Response {
    if (isErrorWithMessage(error)) {
      this.logger.error(`[${context}] Error: ${error.message}`, error.stack);
      
      // Handle specific error types
      if (error.message.includes('credentials')) {
        return res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      } else if (error.message.includes('token')) {
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
  login: RequestHandler[] = [
    rateLimiterMiddleware,
    async (req: Request, res: Response<AuthResponseWithoutRefreshToken | ErrorResponse>, next: NextFunction): Promise<void> => {
      try {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || '';
        
        const loginData: LoginDto = req.body;
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
      } catch (error) {
        this.handleError(error, 'Login', res);
      }
    }
  ];

  /**
   * Refresh access token
   */
  refreshToken: RequestHandler[] = [
    async (req: Request, res: Response<AuthResponseWithoutRefreshToken | ErrorResponse>, next: NextFunction): Promise<void> => {
      try {
        // Try to get refresh token from cookie first, then from body
        const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || '';
        
        if (!refreshToken) {
          res.status(401).json({
            error: 'Refresh token is required',
            code: 'REFRESH_TOKEN_REQUIRED'
          });
          return;
        }

        const response = await this.authService.refreshToken(
          { refreshToken },
          ip,
          userAgent
        );

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
      } catch (error) {
        this.handleError(error, 'RefreshToken', res);
      }
    }
  ];

  /**
   * Logout user
   */
  logout: RequestHandler[] = [
    async (req: Request, res: Response<{ success: boolean } | ErrorResponse>, next: NextFunction): Promise<void> => {
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
      } catch (error) {
        this.handleError(error, 'Logout', res);
      }
    }
  ];

  /**
   * Logout from all devices
   */
  logoutAllDevices: RequestHandler[] = [
    async (req: Request, res: Response<{ success: boolean } | ErrorResponse>, next: NextFunction): Promise<void> => {
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
      } catch (error) {
        this.handleError(error, 'LogoutAllDevices', res);
      }
    }
  ];

  /**
   * Request password reset
   */
  requestPasswordReset: RequestHandler[] = [
    rateLimiterMiddleware, // Apply rate limiting
    async (req: Request, res: Response<{ success: boolean; message: string } | ErrorResponse>, next: NextFunction): Promise<void> => {
      try {
        const { email } = req.body as RequestPasswordResetDto;
        await this.authService.requestPasswordReset(email);
        
        res.status(200).json({ 
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.' 
        });
      } catch (error) {
        this.handleError(error, 'RequestPasswordReset', res);
      }
    }
  ];

  /**
   * Reset password with token
   */
  resetPassword: RequestHandler[] = [
    async (req: Request, res: Response<{ success: boolean; message?: string } | ErrorResponse>, next: NextFunction): Promise<void> => {
      try {
        const { token, newPassword } = req.body as ResetPasswordDto;
        await this.authService.resetPassword(token, newPassword);
        
        res.status(200).json({ 
          success: true,
          message: 'Password has been reset successfully.' 
        });
      } catch (error) {
        this.handleError(error, 'ResetPassword', res);
      }
    }
  ];
}
