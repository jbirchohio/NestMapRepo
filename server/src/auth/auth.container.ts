import { Logger, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UserRepositoryImpl } from './repositories/user.repository.js';
import { RefreshTokenRepositoryImpl } from './repositories/refresh-token.repository.js';
import { JwtAuthService } from './services/jwtAuthService.js';
import { AuthController } from './controllers/auth.controller.js';
import { EmailService } from '../email/interfaces/email.service.interface.js';
import { NodemailerEmailService } from '../email/services/nodemailer-email.service.js';
import { ErrorService } from '../common/services/error.service.js';
import { UserRepository } from '../common/repositories/user/user.repository.interface.js';
import { RefreshTokenRepository } from './interfaces/refresh-token.repository.interface.js';
import { IAuthService } from './interfaces/auth.service.interface.js';

export interface AuthContainerDependencies {
  emailService?: EmailService;
  configService: ConfigService;
  userRepository?: UserRepository;
  refreshTokenRepository?: RefreshTokenRepository;
  errorService: ErrorService;
}

/**
 * Initialize and configure all auth-related dependencies
 */
export class AuthContainer {
  // Repositories
  public readonly userRepository: UserRepository;
  public readonly refreshTokenRepository: RefreshTokenRepository;
  
  // Services
  public readonly emailService: EmailService;
  public readonly authService: IAuthService;

  // Controllers
  public readonly authController: AuthController;

  // Config
  private readonly configService: ConfigService;
  private readonly logger = new Logger('AuthContainer');

  constructor(deps: AuthContainerDependencies) {
    this.configService = deps.configService;
    
    // Initialize repositories
    this.userRepository = deps.userRepository || new UserRepositoryImpl();
    this.refreshTokenRepository = deps.refreshTokenRepository || new RefreshTokenRepositoryImpl();
    
    // Initialize email service if not provided
    this.emailService = deps.emailService || new NodemailerEmailService(
      this.configService,
      deps.errorService
    );
    
    // Initialize auth service
    this.authService = new JwtAuthService(
      this.userRepository,
      this.refreshTokenRepository,
      this.configService,
      this.emailService
    );
    
    // Initialize JWT module for token verification
    JwtModule.register({
      secret: this.configService.get<string>('JWT_SECRET', 'your-secret-key'),
      signOptions: {
        issuer: this.configService.get('JWT_ISSUER', 'nestmap-api'),
        audience: this.configService.get('JWT_AUDIENCE', 'nestmap-client'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      },
    });

    // Initialize auth controller with the new auth service
    this.authController = new AuthController(this.authService);
  }

  /**
   * Register all auth routes with the Express app
   */
  public registerRoutes(app: any) {
    try {
      // Authentication routes
      app.post('/api/auth/login', ...this.authController.login);
      app.post('/api/auth/refresh-token', ...this.authController.refreshToken);
      app.post('/api/auth/logout', ...this.authController.logout);
      
      // Password reset routes
      app.post('/api/auth/forgot-password', ...this.authController.requestPasswordReset);
      app.post('/api/auth/reset-password', ...this.authController.resetPassword);
      
      // User management routes - note: getCurrentUser is a single handler, not an array
      app.get('/api/auth/me', this.authController.getCurrentUser);
      
      this.logger.log('Auth routes registered successfully');
    } catch (error) {
      this.logger.error('Failed to register auth routes', error);
      throw error;
    }
  }
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use AuthContainer class directly instead
 */
export function initAuthContainer(deps: AuthContainerDependencies) {
  const container = new AuthContainer(deps);
  
  return {
    userRepository: container.userRepository,
    refreshTokenRepository: container.refreshTokenRepository,
    emailService: container.emailService,
    authService: container.authService,
    authController: container.authController,
    registerAuthRoutes: (app: any) => container.registerRoutes(app),
  };
}
