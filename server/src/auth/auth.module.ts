import type { Module } from '@nestjs/common';
import type { ConfigModule } from '@nestjs/config';
import type { AuthController } from './controllers/auth.controller.js';
import type { JwtAuthService } from './services/jwtAuthService.js';
import type { RepositoriesModule } from '../common/repositories/repositories.module.js';
import type { AuthUserRepositoryProvider, RefreshTokenRepositoryProvider } from '../common/repositories/repository.providers.js';
import type { EmailModule } from '../email/email.module.js';
/**
 * Auth module that handles authentication and authorization
 * Uses JwtAuthService which leverages secureJwt for token operations
 */
@Module({
    imports: [
        ConfigModule,
        RepositoriesModule,
        EmailModule,
    ],
    controllers: [AuthController],
    providers: [
        JwtAuthService,
        AuthUserRepositoryProvider,
        RefreshTokenRepositoryProvider,
    ],
    exports: [JwtAuthService],
})
export class AuthModule {
}
