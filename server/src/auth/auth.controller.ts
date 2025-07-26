import { Request, Response, NextFunction } from 'express';
import { IAuthService } from './interfaces/auth.service.interface';
import { LoginDto, RegisterDto, RefreshTokenDto, RequestPasswordResetDto, ResetPasswordDto } from './dtos/auth.dto';

/**
 * Auth Controller implementation with proper Express types
 * This is the main auth controller used by the application
 */
export class AuthController {
  constructor(private readonly authService: IAuthService) {}

  /**
   * Login user
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip || req.socket?.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || '';
      
      const loginData: LoginDto = req.body;
      const response = await this.authService.login(loginData, ip, userAgent);
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Register user
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip || req.socket?.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || '';
      
      const registerData: RegisterDto = req.body;
      const response = await this.authService.register(registerData, ip, userAgent);
      
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip || req.socket?.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || '';
      
      const refreshData: RefreshTokenDto = req.body;
      const response = await this.authService.refreshToken(refreshData, ip, userAgent);
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.body.refreshToken;
      const authHeader = req.headers.authorization;
      
      await this.authService.logout(refreshToken, authHeader);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAllDevices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      
      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      await this.authService.revokeAllSessions(user.id);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body as RequestPasswordResetDto;
      await this.authService.requestPasswordReset(email);
      
      res.status(200).json({ 
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body as ResetPasswordDto;
      await this.authService.resetPassword(token, newPassword);
      
      res.status(200).json({ 
        success: true,
        message: 'Password has been reset successfully.' 
      });
    } catch (error) {
      next(error);
    }
  }
}

