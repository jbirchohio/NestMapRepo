import { AuthController } from './controllers/auth.controller.js';
import { AuthService } from './services/auth.service.js';
import { RefreshTokenRepositoryImpl } from './repositories/refresh-token.repository.js';
import { UserRepositoryImpl } from './repositories/user.repository.js';

/**
 * Dependency injection container for authentication module
 */
export class AuthContainer {
  private static instance: AuthContainer;
  private _authController: AuthController | null = null;
  private _authService: AuthService | null = null;
  private _refreshTokenRepository: RefreshTokenRepositoryImpl | null = null;
  private _userRepository: UserRepositoryImpl | null = null;

  private constructor() {}

  public static getInstance(): AuthContainer {
    if (!AuthContainer.instance) {
      AuthContainer.instance = new AuthContainer();
    }
    return AuthContainer.instance;
  }

  public get refreshTokenRepository(): RefreshTokenRepositoryImpl {
    if (!this._refreshTokenRepository) {
      this._refreshTokenRepository = new RefreshTokenRepositoryImpl();
    }
    return this._refreshTokenRepository;
  }

  public get userRepository(): UserRepositoryImpl {
    if (!this._userRepository) {
      this._userRepository = new UserRepositoryImpl();
    }
    return this._userRepository;
  }

  public get authService(): AuthService {
    if (!this._authService) {
      this._authService = new AuthService(
        this.refreshTokenRepository,
        this.userRepository
      );
    }
    return this._authService;
  }

  public get authController(): AuthController {
    if (!this._authController) {
      this._authController = new AuthController(this.authService);
    }
    return this._authController;
  }
}

// Export singleton instance
export const authContainer = AuthContainer.getInstance();