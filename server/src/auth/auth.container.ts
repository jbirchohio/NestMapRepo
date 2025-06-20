import { UserRepositoryImpl } from './repositories/user.repository.js';
import { RefreshTokenRepositoryImpl } from './repositories/refresh-token.repository.js';
import { AuthController } from './controllers/auth.controller.js';
// Use SecureAuth as the source of truth for JWT
import { authenticate, verifyRefreshToken, requireRole } from '../../middleware/secureAuth.js';
import { EmailService } from '../email/interfaces/email.service.interface.js';

import { UserRepository } from '../common/repositories/user/user.repository.interface.js';
import { RefreshTokenRepository } from './interfaces/refresh-token.repository.interface.js';
import { logger } from '../../utils/logger.js';

export interface AuthContainerDependencies {
  emailService?: EmailService;
  configService?: any;
  userRepository?: UserRepository;
  refreshTokenRepository?: RefreshTokenRepository;
  errorService?: ErrorService;
}

/**
 * Initialize and configure all auth-related dependencies
 * Uses SecureAuth middleware as the source of truth for JWT authentication
 */
export class AuthContainer {
  // Repositories
  public readonly userRepository: UserRepository;
  public readonly refreshTokenRepository: RefreshTokenRepository;
  
  // Services
  public readonly emailService: EmailService;

  // Controllers
  public readonly authController: AuthController;

  // Config
  private readonly logger = logger;

  constructor(deps: AuthContainerDependencies = {}) {
    // Initialize repositories
    this.userRepository = deps.userRepository || new UserRepositoryImpl();
    this.refreshTokenRepository = deps.refreshTokenRepository || new RefreshTokenRepositoryImpl();
    
    // Initialize email service with a simple implementation
    this.emailService = deps.emailService || {
      sendEmail: async () => {
        this.logger.info('Email service not configured');
      },
      sendPasswordResetEmail: async () => {
        this.logger.info('Password reset email service not configured');
      },
      sendPasswordResetConfirmationEmail: async () => {
        this.logger.info('Password reset confirmation email service not configured');
      },
      sendPaymentReceiptEmail: async () => {
        this.logger.info('Payment receipt email service not configured');
      }
    };
    
    // Initialize auth controller with SecureAuth middleware
    this.authController = new AuthController(
      this.userRepository,
      this.refreshTokenRepository,
      this.emailService
    );
  }

  /**
   * Register all auth routes with the Express app
   * Uses SecureAuth middleware for JWT handling
   */
  public registerRoutes(app: any) {
    try {
      // Authentication routes using SecureAuth middleware
      app.post('/api/auth/login', this.authController.login.bind(this.authController));
      app.post('/api/auth/refresh-token', verifyRefreshToken, this.authController.refreshToken.bind(this.authController));
      app.post('/api/auth/logout', this.authController.logout.bind(this.authController));
      
      // Password reset routes
      app.post('/api/auth/forgot-password', this.authController.requestPasswordReset.bind(this.authController));
      app.post('/api/auth/reset-password', this.authController.resetPassword.bind(this.authController));
      
      // User management routes with authentication
      app.get('/api/auth/me', authenticate, this.authController.getCurrentUser.bind(this.authController));
      
      this.logger.info('Auth routes registered successfully using SecureAuth middleware');
    } catch (error) {
      this.logger.error('Failed to register auth routes', error);
      throw error;
    }
  }

  /**
   * Get authentication middleware from SecureAuth
   */
  public getAuthMiddleware() {
    return {
      authenticate,
      verifyRefreshToken,
      requireRole
    };
  }
}

/**
 * Legacy export for backward compatibility
 */
export function initAuthContainer(deps: AuthContainerDependencies = {}) {
  const container = new AuthContainer(deps);
  
  return {
    userRepository: container.userRepository,
    refreshTokenRepository: container.refreshTokenRepository,
    emailService: container.emailService,
    authController: container.authController,
    registerAuthRoutes: (app: any) => container.registerRoutes(app),
    getAuthMiddleware: () => container.getAuthMiddleware()
  };
}