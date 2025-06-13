import { Request, Response, NextFunction, RequestHandler } from 'express';
import { IAuthService } from '../interfaces/auth.service.interface';
import { 
  AuthResponse,
  LoginDto, 
  UserResponse,
  RequestPasswordResetDto, 
  ResetPasswordDto
} from '../dtos/auth.dto';
import { rateLimiterMiddleware } from '../middleware/rate-limiter.middleware';
import { isErrorWithMessage } from '../../utils/error-utils';
import { Logger } from '@nestjs/common';

// Response type that excludes the refresh token when sending to client
type AuthResponseWithoutRefreshToken = Omit<AuthResponse, 'refreshToken'>;

export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: IAuthService) {}

  private handleError(error: unknown, context: string): void {
    if (isErrorWithMessage(error)) {
      this.logger.error(`[${context}] Error: ${error.message}`, error.stack);
    } else {
      this.logger.error(`[${context}] Unknown error occurred`);
    }
  }

  private sanitizeUserResponse(user: UserResponse): Omit<UserResponse, 'createdAt' | 'updatedAt'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { createdAt, updatedAt, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  login: RequestHandler[] = [
    rateLimiterMiddleware,
    async (req: Request, res: Response<AuthResponseWithoutRefreshToken | { error: string }>, next: NextFunction): Promise<void> => {
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

        // Sanitize user data before sending response
        const { refreshToken, user, ...rest } = response; // refreshToken is already handled by the cookie above
        const sanitizedUser = this.sanitizeUserResponse(user);
        res.status(200).json({ ...rest, user: sanitizedUser });
      } catch (error) {
        this.handleError(error, 'Login');
        next(error);
      }
    }
  ];

  refreshToken: RequestHandler[] = [
    async (req: Request, res: Response<AuthResponseWithoutRefreshToken | { error: string }>, next: NextFunction): Promise<void> => {
      try {
        // Try to get refresh token from cookie first, then from body
        const refreshToken = (req.cookies?.refreshToken || req.body.refreshToken) as string | undefined;
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || '';

        if (!refreshToken) {
          res.status(400).json({ error: 'Refresh token is required' });
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
        const { refreshToken: _, user, ...rest } = response;
        const sanitizedUser = this.sanitizeUserResponse(user);
        res.status(200).json({ ...rest, user: sanitizedUser });
      } catch (error) {
        this.handleError(error, 'RefreshToken');
        next(error);
      }
    }
  ];

  logout: RequestHandler[] = [
    async (req: Request, res: Response<{ success: boolean } | { error: string }>, next: NextFunction): Promise<void> => {
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
      } catch (error) {
        this.handleError(error, 'Logout');
        next(error);
      }
    }
  ];

  requestPasswordReset: RequestHandler[] = [
    rateLimiterMiddleware, // Apply rate limiting
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { email } = req.body as RequestPasswordResetDto;
        await this.authService.requestPasswordReset(email);
        res.status(200).json({ 
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.' 
        });
      } catch (error) {
        this.handleError(error, 'RequestPasswordReset');
        next(error);
      }
    }
  ];

  resetPassword: RequestHandler[] = [
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { token, newPassword } = req.body as ResetPasswordDto;
        await this.authService.resetPassword(token, newPassword);
        res.status(200).json({ 
          success: true,
          message: 'Password has been reset successfully.' 
        });
      } catch (error) {
        this.handleError(error, 'ResetPassword');
        next(error);
      }
    }
  ];
}
