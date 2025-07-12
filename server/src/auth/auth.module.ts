import { Module } from '@nestjs/common.js';
import { ConfigModule } from '@nestjs/config.js';
import { AuthController } from './controllers/auth.controller.js.js';
import { JwtAuthService } from './services/jwtAuthService.js.js';
import { RepositoriesModule } from '../common/repositories/repositories.module.js.js';
import { AuthUserRepositoryProvider, RefreshTokenRepositoryProvider } from '../common/repositories/repository.providers.js.js';
import { EmailModule } from '../email/email.module.js.js';

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
export class AuthModule {}
