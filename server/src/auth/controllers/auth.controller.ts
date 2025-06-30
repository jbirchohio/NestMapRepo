import { Response, NextFunction, Request } from 'express';
import { 
  Controller, 
  UseGuards, 
  Post, 
  Body, 
  Req, 
  Res, 
  Get,
  UseInterceptors,
  ClassSerializerInterceptor,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  ExecutionContext,
  HttpStatus
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { 
  ApiTags, 
  ApiOperation, 
  ApiBody, 
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

import { BaseController } from '../../common/controllers/base.controller.js';
import type { ApiSuccessResponse } from '../../common/utils/response-formatter.util.js';
import { isErrorWithMessage } from '../../utils/error-utils.js';

import type { IAuthService } from '../interfaces/auth.service.interface.js';
import type { AuthenticatedRequest } from '@shared/types/auth/custom-request.js';
import { 
  LoginDto, 
  RequestPasswordResetDto, 
  ResetPasswordDto,
  AuthResponse as SharedAuthResponse,
  AuthTokens
} from '@shared/types/auth/index.js';
import type { User as PrismaUser } from '@prisma/client';
import type { User as SharedUser } from '@shared/schema/types/user';

// Define the User type that matches Express.User
type User = Omit<SharedUser, 'organizationId' | 'permissions'> & {
  permissions: string[];
  hasRole: (role: string | string[]) => boolean;
  hasPermission: (permission: string | string[]) => boolean;
  organizationId: string;
};

/**
 * Response type for authentication responses
 */
/**
 * Response type for authentication responses
 */
interface AuthResponse {
  user: SharedUser | null;
  tokens: AuthTokens;
}

/**
 * Response type for login/refresh token responses
 */
interface AuthResponseWithoutRefreshToken {
  user: SharedUser | null;
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
  tokenType: string;
  expiresIn: number;
}

/**
 * Type for user data stored in JWT
 */
type JwtUserPayload = {
  id: string;
  email: string;
  role: string;
  organizationId?: string | null;
  [key: string]: unknown;
};

/**
 * Type for refresh token request
 */
interface RefreshTokenRequest {
  refreshToken: string;
}

// Re-export the UserResponse type from shared types
// This is defined in @shared/src/types/auth/dto/user-response.dto.ts
@ApiTags('auth')
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController extends BaseController {
  constructor(
    private readonly authService: IAuthService
  ) {
    super('AuthController');
  }

  /**
   * Handles authentication errors consistently
   * @param error The caught error
   * @param context Context for error messages
   */
  private handleAuthError(error: unknown, context: string): never {
    if (isErrorWithMessage(error)) {
      this.logger.error(`[${context}] Error: ${error.message}`, error.stack);
      throw error;
    }
    this.logger.error(`[${context}] Unknown error occurred`);
    throw new InternalServerErrorException('An unexpected error occurred');
  }

  /**
   * Handles login requests
   */
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ 
    description: 'User logged in successfully',
    type: Object // Will be properly typed by Swagger
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiBadRequestResponse({ description: 'Invalid request data' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<ApiSuccessResponse<AuthResponseWithoutRefreshToken>> {
    try {
      const ip = req.ip || (req.socket?.remoteAddress) || 'unknown';
      const userAgent = req.headers['user-agent'] || '';
      
      const response = await this.authService.login(loginDto, ip, userAgent);
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
      
      const expiresIn = 3600; // 1 hour in seconds
      const tokenType = 'Bearer';
      
      // Calculate token expiration timestamps (in seconds since epoch)
      const now = Math.floor(Date.now() / 1000);
      const accessTokenExpiresAt = now + expiresIn;
      const refreshTokenExpiresAt = now + (7 * 24 * 60 * 60); // 7 days in seconds
      
      const responseData: AuthResponseWithoutRefreshToken = {
        user,
        accessToken,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        tokenType,
        expiresIn
      };
      
      return this.success(responseData);
    } catch (error) {
      this.handleAuthError(error, 'login');
      throw error;
    }
  }

  /**
   * Refreshes an access token using a refresh token
   */
  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ schema: { 
    type: 'object',
    properties: { refreshToken: { type: 'string' } } 
  }})
  @ApiOkResponse({ 
    description: 'Token refreshed successfully',
    type: Object // Will be properly typed by Swagger
  })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token' })
  async refreshToken(
    @Body() body: { refreshToken?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<ApiSuccessResponse<AuthResponseWithoutRefreshToken>> {
    try {
      // Try to get refresh token from cookie first, then from body
      const refreshToken = req.cookies?.refreshToken || body.refreshToken;
      
      if (!refreshToken) {
        throw new BadRequestException('Refresh token is required');
      }
      
      const ip = req.ip || (req.socket?.remoteAddress) || 'unknown';
      const userAgent = req.headers['user-agent'] || '';
      
      const response = await this.authService.refreshToken(refreshToken, ip, userAgent);
      const { tokens, user } = response;
      const { access_token: accessToken, refresh_token: newRefreshToken } = tokens;
      
      // Set the new refresh token in an HTTP-only cookie
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/auth/refresh-token'
      });
      
      const expiresIn = 3600; // 1 hour in seconds
      const tokenType = 'Bearer';
      
      // Calculate token expiration timestamps (in seconds since epoch)
      const now = Math.floor(Date.now() / 1000);
      const accessTokenExpiresAt = now + expiresIn;
      const refreshTokenExpiresAt = now + (7 * 24 * 60 * 60); // 7 days in seconds
      
      const responseData: AuthResponseWithoutRefreshToken = {
        user,
        accessToken,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        tokenType,
        expiresIn
      };
      
      return this.success(responseData);
    } catch (error) {
      this.handleAuthError(error, 'refreshToken');
      throw error;
    }
  }

  /**
   * Requests a password reset email
   */
  @Post('request-password-reset')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiBody({ type: RequestPasswordResetDto })
  @ApiOkResponse({ 
    description: 'Password reset email sent if account exists',
    schema: { 
      type: 'object', 
      properties: { 
        success: { type: 'boolean' },
        message: { type: 'string' }
      } 
    }
  })
  async requestPasswordReset(
    @Body() requestPasswordResetDto: RequestPasswordResetDto
  ): Promise<ApiSuccessResponse<{ success: boolean; message: string }>> {
    try {
      await this.authService.requestPasswordReset({
        email: requestPasswordResetDto.email,
        resetUrl: process.env.PASSWORD_RESET_URL || 'http://localhost:3000/reset-password'
      });
      
      return this.success({ 
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    } catch (error) {
      // Don't leak information about whether the email exists
      this.logger.error(`[requestPasswordReset] Error: ${error}`);
      return this.success({ 
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }
  }

  /**
   * Resets a user's password using a reset token
   */
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ 
    description: 'Password reset successful',
    schema: { 
      type: 'object', 
      properties: { 
        success: { type: 'boolean' },
        message: { type: 'string' }
      } 
    }
  })
  @ApiBadRequestResponse({ description: 'Invalid or expired token' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto
  ): Promise<ApiSuccessResponse<{ success: boolean; message: string }>> {
    try {
      await this.authService.resetPassword({
        token: resetPasswordDto.token,
        newPassword: resetPasswordDto.newPassword
      });
      
      return this.success({ 
        success: true,
        message: 'Your password has been reset successfully. You can now log in with your new password.'
      });
    } catch (error) {
      this.handleAuthError(error, 'resetPassword');
      throw error;
    }
  }

  /**
   * Get the current authenticated user
   * This is a wrapper around the auth service's getCurrentUser method
   * that adds Swagger documentation and proper response typing
   */
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get current user' })
  @ApiBearerAuth()
  @ApiOkResponse({ 
    description: 'Returns the currently authenticated user',
    type: Object
  })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  /**
   * Get the current authenticated user
   * This overrides the base controller method to provide a more specific implementation
   * that works with the auth service
   */
  protected getCurrentUser(context: ExecutionContext): User {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthorizedException('User not authenticated');
    }
    // Ensure the user object has the required methods and properties
    const user = {
      ...request.user,
      permissions: [],
      organizationId: request.user.organizationId || '',
    } as User;
    if (!user.hasRole) {
      user.hasRole = (role: string | string[]) => {
        const roles = Array.isArray(role) ? role : [role];
        return roles.includes(user.role);
      };
    }
    if (!user.hasPermission) {
      user.hasPermission = (permission: string | string[]) => {
        const permissions = Array.isArray(permission) ? permission : [permission];
        return user.permissions?.some((p: string) => permissions.includes(p)) || false;
      };
    }
    return user;
  }

  /**
   * Get current user endpoint
   * This is a convenience method that wraps the base controller method
   * and adds Swagger documentation
   */
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get current user' })
  @ApiBearerAuth()
  @ApiOkResponse({ 
    description: 'Returns the currently authenticated user',
    type: Object
  })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async getCurrentUserEndpoint(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ): Promise<ApiSuccessResponse<{ user: User }>> {
    try {
      // Get the user from the auth service
      const user = await this.authService.getCurrentUser(req.user.id);
      
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      
      // Ensure the user object has the required methods and properties
      const currentUser = {
        ...req.user,
        permissions: [],
        organizationId: req.user.organizationId || '',
      } as User;
      if (!currentUser.hasRole) {
        currentUser.hasRole = (role: string | string[]) => {
          const roles = Array.isArray(role) ? role : [role];
          return roles.includes(currentUser.role);
        };
      }
      if (!currentUser.hasPermission) {
        currentUser.hasPermission = (permission: string | string[]) => {
          const permissions = Array.isArray(permission) ? permission : [permission];
          return currentUser.permissions?.some((p: string) => permissions.includes(p)) || false;
        };
      }
      
      // Return the user with the success response
      return this.success({ user: currentUser });
    } catch (error) {
      this.handleAuthError(error, 'getCurrentUser');
      throw error;
    }
  }

  /**
   * Log out the current user
   */
  @Post('logout')
  @ApiOperation({ summary: 'Log out' })
  @ApiBody({ schema: { 
    type: 'object',
    properties: { refreshToken: { type: 'string' } } 
  }})
  @ApiOkResponse({ 
    description: 'Logged out successfully',
    schema: { 
      type: 'object',
      properties: { 
        success: { type: 'boolean' },
        message: { type: 'string' }
      } 
    }
  })
  @ApiBadRequestResponse({ description: 'Refresh token is required' })
  async logout(
    @Body() body: { refreshToken?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<ApiSuccessResponse<{ success: boolean; message: string }>> {
    try {
      // Try to get refresh token from cookie first, then from body
      const refreshToken = req.cookies?.refreshToken || body.refreshToken;
      const authHeader = req.headers.authorization as string | undefined;
      
      if (!refreshToken) {
        throw new BadRequestException('Refresh token is required');
      }
      
      await this.authService.logout(refreshToken, authHeader);
      
      // Clear refresh token cookie
      res.clearCookie('refreshToken', {
        path: '/api/auth/refresh-token',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      return this.success({ 
        success: true, 
        message: 'Successfully logged out' 
      });
    } catch (error) {
      this.handleAuthError(error, 'logout');
      throw error;
    }
  }

  /**
   * Log out from all devices
   */
  @Post('logout-all')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Log out from all devices' })
  @ApiBearerAuth()
  @ApiOkResponse({ 
    description: 'Logged out from all devices successfully',
    schema: { 
      type: 'object',
      properties: { 
        success: { type: 'boolean' },
        message: { type: 'string' }
      } 
    }
  })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async logoutAllDevices(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response
  ): Promise<ApiSuccessResponse<{ success: boolean; message: string }>> {
    try {
      if (!req.user) {
        throw new UnauthorizedException('Not authenticated');
      }
      
      // Revoke all sessions for the user
      await this.authService.revokeAllSessions(req.user.id);
      
      // Clear refresh token cookie if it exists
      if (req.cookies?.refreshToken) {
        res.clearCookie('refreshToken', {
          path: '/api/auth/refresh-token',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });
      }
      
      return this.success({ 
        success: true, 
        message: 'Logged out from all devices successfully' 
      });
    } catch (error) {
      this.handleAuthError(error, 'logoutAllDevices');
      throw error;
    }
  }

  /**
   * Safely gets a property from an object, handling both snake_case and camelCase
   */
  private getProperty<T>(obj: Record<string, any>, keys: string[], defaultValue: T): T {
    for (const key of keys) {
      if (obj && key in obj) {
        return obj[key] as T;
      }
    }
    return defaultValue;
  }
}
