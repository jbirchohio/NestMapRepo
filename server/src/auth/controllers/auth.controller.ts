import { Response, NextFunction, RequestHandler } from 'express';
import { Request } from '../../shared/src/schema.js'/types/express/index.js';
import { IAuthService } from '../interfaces/auth.service.interface.js';
import { 
  AuthResponse,
  LoginDto, 
  UserResponse,
  RequestPasswordResetDto, 
  ResetPasswordDto,
  UserRole
} from '../dtos/auth.dto.js';
import { rateLimiterMiddleware } from '../middleware/rate-limiter.middleware.js';
import { isErrorWithMessage } from '../../shared/src/schema.js'/utils/error-utils.js';
import { Logger } from '@nestjs/common.js';

// Response type that excludes the refresh token when sending to client
type AuthResponseWithoutRefreshToken = Omit<AuthResponse, 'refreshToken'> & {
  tokenType: string;
  expiresIn: number;
};

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

  private sanitizeUserResponse(user: {
    id: string;
    email: string;
    role: UserRole;
    firstName?: string | null;
    lastName?: string | null;
    emailVerified?: boolean;
  }): Omit<UserResponse, 'createdAt' | 'updatedAt'> {
    // Ensure all required UserResponse fields are included with defaults
    const sanitizedUser: Omit<UserResponse, 'createdAt' | 'updatedAt'> = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      emailVerified: user.emailVerified ?? false
    };
    return sanitizedUser;
  }

  login = [
    rateLimiterMiddleware as unknown as RequestHandler,
    async (req: Request<LoginDto, AuthResponseWithoutRefreshToken | { error: string }>, res: Response<AuthResponseWithoutRefreshToken | { error: string }>, next: NextFunction): Promise<void> => {
      try {
        const ip = req.ip || req.socket.remoteAddress || 'unknown.js';
        const userAgent = req.headers['user-agent'] || '.js';
        
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
        const { refreshToken, user, accessToken, expiresIn, tokenType } = response;
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
          user: {
            ...sanitizedUser,
            emailVerified: sanitizedUser.emailVerified || false // Ensure emailVerified is always defined
          },
          tokenType,
          expiresIn
        } as const; // Use const assertion to ensure type safety
        
        res.status(200).json(responseData);
      } catch (error) {
        this.handleError(error, 'Login');
        next(error);
      }
    }
  ];

  refreshToken = [
    async (req: Request<{ refreshToken?: string }, AuthResponseWithoutRefreshToken | { error: string }>, res: Response<AuthResponseWithoutRefreshToken | { error: string }>, next: NextFunction): Promise<void> => {
      try {
        // Try to get refresh token from cookie first, then from body
        const refreshToken = (req.cookies?.refreshToken || req.body.refreshToken) as string | undefined;
        const ip = req.ip || req.socket.remoteAddress || 'unknown.js';
        const userAgent = req.headers['user-agent'] || '.js';

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
        const { refreshToken: _, user, expiresIn, tokenType, accessToken } = response;
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
          user: {
            ...sanitizedUser,
            emailVerified: sanitizedUser.emailVerified || false // Ensure emailVerified is always defined
          },
          tokenType,
          expiresIn
        } as const;
        
        res.status(200).json(responseData);
      } catch (error) {
        this.handleError(error, 'RefreshToken');
        next(error);
      }
    }
  ];

  logout = [
    async (req: Request<{ refreshToken?: string }, { success: boolean } | { error: string }>, res: Response<{ success: boolean } | { error: string }>, next: NextFunction): Promise<void> => {
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

  requestPasswordReset = [
    rateLimiterMiddleware as unknown as RequestHandler,
    async (req: Request<RequestPasswordResetDto>, res: Response, next: NextFunction): Promise<void> => {
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

  resetPassword = [
    async (req: Request<ResetPasswordDto>, res: Response, next: NextFunction): Promise<void> => {
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

  getCurrentUser = [
    async (req: Request<unknown, { user: Omit<UserResponse, 'createdAt' | 'updatedAt'> } | { error: string }> & {
      user?: any; // This will be properly typed by the auth middleware
    }, res: Response<{ user: Omit<UserResponse, 'createdAt' | 'updatedAt'> } | { error: string }>, next: NextFunction): Promise<void> => {
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
      } catch (error) {
        this.handleError(error, 'GetCurrentUser');
        next(error);
      }
    }
  ];

  // Logout from all devices
  logoutAllDevices = [
    async (req: Request, res: Response<{ success: boolean; message: string } | { error: string }>, next: NextFunction): Promise<void> => {
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
      } catch (error) {
        this.handleError(error, 'LogoutAllDevices');
        next(error);
      }
    }
  ];
}
