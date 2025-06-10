import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { UserRepositoryImpl } from './repositories/user.repository';
import { RefreshTokenRepositoryImpl } from './repositories/refresh-token';
import { AuthService } from './services/auth.service.new';
import { AuthController } from './controllers/auth.controller';
import { EmailService } from '../email/interfaces/email.service.interface';
import { NodemailerEmailService } from '../email/services/nodemailer-email.service';
import { UserRepository } from './interfaces/user.repository.interface';
import { RefreshTokenRepository } from './interfaces/refresh-token.repository.interface';
import { AuthResponse } from './services/auth.service.new';

export interface AuthContainerDependencies {
  emailService?: EmailService;
  configService: ConfigService;
  jwtService?: JwtService;
  userRepository?: UserRepository;
  refreshTokenRepository?: RefreshTokenRepository;
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
  public readonly jwtService: JwtService;
  public readonly authService: AuthService;

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
    
    // Initialize JWT service with proper configuration
    this.jwtService = deps.jwtService || new JwtService({
      secret: this.configService.get<string>('JWT_SECRET', 'your-secret-key'),
      signOptions: {
        issuer: this.configService.get('JWT_ISSUER', 'nestmap-api'),
        audience: this.configService.get('JWT_AUDIENCE', 'nestmap-client'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      },
    });
    
    // Initialize email service if not provided
    this.emailService = deps.emailService || new NodemailerEmailService(this.configService);
    
    // Initialize auth service with all required dependencies
    this.authService = new AuthService(
      this.userRepository,
      this.refreshTokenRepository,
      this.jwtService,
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

    // Initialize auth controller
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
      
      // User management routes
      app.get('/api/auth/me', ...this.authController.getCurrentUser);
      
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
export const initAuthContainer = (deps: AuthContainerDependencies) => {
  const container = new AuthContainer({
    ...deps,
    // Ensure required services are provided or use defaults
    emailService: deps.emailService || new NodemailerEmailService(deps.configService),
    jwtService: deps.jwtService || new JwtService({
      secret: deps.configService.get<string>('JWT_SECRET', 'your-secret-key'),
      signOptions: {
        issuer: deps.configService.get('JWT_ISSUER', 'nestmap-api'),
        audience: deps.configService.get('JWT_AUDIENCE', 'nestmap-client'),
        expiresIn: deps.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      },
    }),
  });
  
  return {
    userRepository: container.userRepository,
    refreshTokenRepository: container.refreshTokenRepository,
    authService: container.authService,
    authController: container.authController,
    registerAuthRoutes: (app: any) => container.registerRoutes(app),
  };
};
