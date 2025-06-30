import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Req, 
  Res, 
  HttpStatus, 
  UseGuards, 
  UnauthorizedException, 
  BadRequestException, 
  InternalServerErrorException,
  ExecutionContext,
  Inject,
  forwardRef,
  LoggerService,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request as ExpressRequest, Response as ExpressResponse, Response } from 'express';
import { 
  ApiTags, 
  ApiOperation, 
  ApiBody, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiOkResponse, 
  ApiUnauthorizedResponse, 
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse
} from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';

// Import DTOs and types from shared
import { 
  LoginDto, 
  RegisterDto, 
  RequestPasswordResetDto, 
  ResetPasswordDto, 
  ChangePasswordDto,
  AuthTokens
} from '@shared/types/auth/index.js';
import { UserRole } from '@prisma/client';
// Import shared auth types
import { AuthErrorCode } from '@shared/types/auth/auth.js';
import type { AuthenticatedRequest } from '@shared/schema/types/auth/custom-request';

// Import services
import { IAuthService } from '../interfaces/auth.service.interface.js';

// Import base controller
import { BaseController } from '../../common/controllers/base.controller.js';

// Define a type for the user data we want to expose
interface UserResponse {
  id: string;
  email: string;
  role: string;
  organizationId?: string | null;
}

interface AuthUserResponse {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresIn: number;
}

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresIn: number;
  user: {
    id: string;
    email: string;
    role: string;
    organizationId?: string | null;
  };
};

@ApiTags('auth')
@Controller('auth')
export class PrismaAuthController extends BaseController {
  constructor(
    @Inject('IAuthService')
    private readonly authService: IAuthService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) 
    protected readonly logger: LoggerService
  ) {
    super(PrismaAuthController.name);
  }

  /**
   * Handle user login
   */
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ 
    description: 'User logged in successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
                organizationId: { type: 'string', nullable: true }
              }
            }
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  async login(
    @Body() loginDto: LoginDto, 
    @Res({ passthrough: true }) res: ExpressResponse
  ) {
    try {
      const result = await this.authService.login(loginDto);
      
      // Set refresh token as HTTP-only cookie
      const response = res as unknown as Response;
      response.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: result.refreshTokenExpiresIn * 1000, // Convert to milliseconds
        path: '/auth/refresh-token'
      });
      
      // Return access token and user data
      return this.success(
        {
          accessToken: result.accessToken,
          user: {
            id: result.user.id,
            email: result.user.email,
            role: result.user.role,
            organizationId: result.user.organizationId
          }
        },
        'Login successful',
        { statusCode: 200 }
      );
    } catch (error) {
      this.handleAuthError(error, 'login');
    }
  }

  /**
   * Handle user registration
   */
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({ 
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
                organizationId: { type: 'string', nullable: true }
              }
            }
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Invalid registration data' })
  async register(
    @Body() registerData: RegisterDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response
  ) {
    try {
      const ip = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      const result = await this.authService.register(registerData, ip, userAgent);
      
      // Set HTTP-only cookie for refresh token
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: result.refreshTokenExpiresIn * 1000
      });
      
      // Return access token and user data in response body
      const { refreshToken, refreshTokenExpiresIn, ...responseData } = result;
      
      return this.success(responseData, 'User registered successfully', { statusCode: HttpStatus.CREATED });
    } catch (error) {
      this.handleAuthError(error, 'register');
      throw error;
    }
  }

  /**
   * Handle token refresh
   */
  @Post('refresh-token')
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiOkResponse({ 
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
                organizationId: { type: 'string', nullable: true }
              }
            }
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  async refreshToken(@Req() req: AuthenticatedRequest) {
    try {
      const user = this.getCurrentUserFromRequest(req);
      const refreshToken = req.cookies?.refreshToken || '';
      
      if (!refreshToken) {
        throw new UnauthorizedException('No refresh token provided');
      }
      
      const result = await this.authService.refreshToken({
        userId: user.id,
        refreshToken
      });
      
      // Set new refresh token as HTTP-only cookie
      if (req.res) {
        const response = req.res as unknown as Response;
        response.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: result.refreshTokenExpiresIn * 1000,
          path: '/auth/refresh-token'
        });
      }
      
      return this.success({
        accessToken: result.accessToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId
        }
      }, 'Token refreshed successfully');
    } catch (error) {
      this.handleAuthError(error, 'refreshToken');
    }
  }

  /**
   * Handle user logout
   */
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout' })
  @ApiNoContentResponse({ description: 'User logged out successfully' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async logout(
    @Req() req: AuthenticatedRequest, 
    @Res({ passthrough: true }) res: ExpressResponse
  ) {
    try {
      const user = this.getCurrentUserFromRequest(req);
      await this.authService.logout(user.id);
      
      // Clear the refresh token cookie
      const response = res as unknown as Response;
      response.clearCookie('refreshToken', {
        path: '/auth/refresh-token',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      res.status(HttpStatus.NO_CONTENT).send();
    } catch (error) {
      this.handleAuthError(error, 'logout');
      throw error;
    }
  }

  /**
   * Handle password change
   */
  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change the current user\'s password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({ description: 'Password changed successfully' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated or invalid credentials' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() changePasswordData: ChangePasswordDto
  ) {
    try {
      const user = this.getCurrentUserFromRequest(req);
      await this.authService.changePassword(user.id, changePasswordData);
      
      return this.success(
        { message: 'Password changed successfully' },
        'Password changed successfully',
        { statusCode: 200 }
      );
    } catch (error) {
      this.handleAuthError(error, 'changePassword');
      throw error; // Let NestJS handle the error
    }
  }

  /**
   * Handle password reset request
   */
  @Post('request-password-reset')
  @ApiOperation({ summary: 'Request a password reset' })
  @ApiBody({ type: RequestPasswordResetDto })
  @ApiOkResponse({ 
    description: 'If the email exists, a password reset link has been sent',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string',
          example: 'If an account with that email exists, a password reset link has been sent'
        }
      }
    }
  })
  async requestPasswordReset(
    @Body() requestData: RequestPasswordResetDto
  ) {
    try {
      await this.authService.requestPasswordReset(requestData.email);
      
      return this.success(
        { message: 'If an account exists with this email, a password reset link has been sent' },
        'Password reset email sent',
        { statusCode: 200 }
      );
    } catch (error) {
      // Don't leak information about whether the email exists
      this.logger.warn(`Password reset request failed for email: ${requestData.email}`, error);
      return this.success(
        { message: 'If an account exists with this email, a password reset link has been sent' },
        'Password reset email sent',
        { statusCode: 200 }
      );
    }
  }

  /**
   * Handle password reset with token
   */
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with a valid token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ 
    description: 'Password has been reset successfully',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string',
          example: 'Password has been reset successfully'
        }
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Invalid or expired token' })
  async resetPassword(
    @Body() resetData: ResetPasswordDto
  ) {
    try {
      await this.authService.resetPassword(resetData);
      
      return this.success(
        { message: 'Password has been reset successfully' },
        'Password reset successful',
        { statusCode: 200 }
      );
    } catch (error) {
      this.handleAuthError(error, 'resetPassword');
      throw error; // Let NestJS handle the error
    }
  }

  /**
   * Implementation of the base controller's getCurrentUser method
   * @param context The execution context
   * @returns The current user
   */
  protected override getCurrentUser(context: ExecutionContext): Express.User {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = this.getCurrentUserFromRequest(request);
    
    // Ensure we return a proper Express.User object with all required properties
    return {
      ...user,
      permissions: [],
      hasRole: () => false,
      hasPermission: () => false
    };
  }
  
  /**
   * Get the current authenticated user's profile
   * This is a convenience method that returns a more detailed response
   */
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ 
    description: 'Current user profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
            organizationId: { type: 'string', nullable: true }
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  getCurrentUserProfile(@Req() req: AuthenticatedRequest) {
    try {
      const user = this.getCurrentUserFromRequest(req);
      
      // Return only necessary user data
      const userData: UserResponse = {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      };
      
      return this.success(userData, 'User profile retrieved successfully', { statusCode: HttpStatus.OK });
    } catch (error) {
      this.handleAuthError(error, 'getCurrentUserProfile');
      throw error; // This will be caught by NestJS's exception filter
    }
  }



  /**
   * Get the current user from the request
  /**
   * Get the current user from the authenticated request
   * @param req The authenticated request
   * @returns The current user
   * @throws UnauthorizedException if no user is found in the request
   */
  private getCurrentUserFromRequest(req: AuthenticatedRequest): Express.User {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    // Ensure we return a proper Express.User object
    return {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      organizationId: req.user.organizationId ?? undefined,
      // Add any additional properties required by Express.User
      permissions: [],
      hasRole: () => false,
      hasPermission: () => false
    };
  }

  /**
   * Handle authentication errors consistently
   * @param error The error that occurred
   * @param context The context where the error occurred (method name)
   * @throws Appropriate HTTP exception based on error type
   */
  private handleAuthError(error: unknown, context: string): never {
    // Handle standard Error instances
    if (error instanceof Error) {
      // Check if it's an authentication error with a code
      if ('code' in error && typeof error.code === 'string') {
        const errorCode = error.code as AuthErrorCode;
        
        switch (errorCode) {
          case AuthErrorCode.INVALID_CREDENTIALS:
          case AuthErrorCode.EXPIRED_TOKEN:
          case AuthErrorCode.INVALID_TOKEN:
          case AuthErrorCode.TOKEN_REVOKED:
          case AuthErrorCode.MISSING_TOKEN:
            this.logger.warn(`[AuthError:${context}] ${errorCode}: ${error.message}`);
            throw new UnauthorizedException(error.message);
            
          case AuthErrorCode.USER_NOT_FOUND:
          case AuthErrorCode.EMAIL_EXISTS:
            this.logger.warn(`[ValidationError:${context}] ${error.message}`);
            throw new BadRequestException(error.message);
            
          case AuthErrorCode.INSUFFICIENT_PERMISSIONS:
            this.logger.warn(`[AuthError:${context}] Insufficient permissions`);
            throw new UnauthorizedException('Insufficient permissions');
            
          case AuthErrorCode.ACCOUNT_DISABLED:
          case AuthErrorCode.ACCOUNT_LOCKED:
            this.logger.warn(`[AuthError:${context}] Account is disabled`);
            throw new UnauthorizedException('Account is disabled');
        }
      }
      
      // Handle other error types
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error; // Re-throw existing HTTP exceptions
      }
      
      // Log and handle other errors
      this.logger.error(`[Error:${context}] ${error.message}`, error.stack);
    } else {
      // Handle non-Error objects
      this.logger.error(`[UnknownError:${context}] An unknown error occurred`);
    }
    
    throw new InternalServerErrorException('An unexpected error occurred');
  }
}

// Note: Remove the singleton export as NestJS will handle the controller instance
