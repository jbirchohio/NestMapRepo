import { AuthController } from './controllers/auth.controller.js';
import { AuthService } from './services/auth.service.js';
import { PrismaRefreshTokenRepository } from '../common/repositories/prisma/refresh-token.prisma.repository.js';
import { PrismaUserRepository } from '../common/repositories/prisma/user.prisma.repository.js';
import { PrismaService } from '../core/database/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import { Redis } from 'ioredis';
/**
 * Dependency injection container for authentication module
 */
export class AuthContainer {
    private static instance: AuthContainer;
    private _authController: AuthController | null = null;
    private _authService: AuthService | null = null;
    private _refreshTokenRepository: PrismaRefreshTokenRepository | null = null;
    private _userRepository: PrismaUserRepository | null = null;
    private constructor() { }
    public static getInstance(): AuthContainer {
        if (!AuthContainer.instance) {
            AuthContainer.instance = new AuthContainer();
        }
        return AuthContainer.instance;
    }
    private prismaService: PrismaService;

    constructor() {
        this.prismaService = PrismaService.getInstance();
    }

    public getRefreshTokenRepository(): PrismaRefreshTokenRepository {
        if (!this._refreshTokenRepository) {
            this._refreshTokenRepository = new PrismaRefreshTokenRepository(this.prismaService.client);
        }
        return this._refreshTokenRepository;
    }

    public getUserRepository(): PrismaUserRepository {
        if (!this._userRepository) {
            this._userRepository = new PrismaUserRepository(this.prismaService.client);
        }
        return this._userRepository;
    }

    public get authService(): AuthService {
        if (!this._authService) {
            const jwtService = new JwtService({
                secret: process.env.JWT_SECRET || 'your-secret-key',
                signOptions: { expiresIn: '15m' },
            });
            
            // Note: In a real app, you'd want to properly initialize Redis
            const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
            
            // Create a mock request object with empty headers by default
            const mockRequest = { headers: {} };
            
            // Create a new instance of PrismaService for the AuthService
            const authPrismaService = new PrismaService();
            
            // Initialize AuthService with required dependencies
            this._authService = new AuthService(
                authPrismaService,
                jwtService,
                redis,
                mockRequest as any // Mock request object
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
