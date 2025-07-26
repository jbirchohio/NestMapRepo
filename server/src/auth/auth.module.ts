import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './controllers/auth.controller';
import { JwtAuthService } from './services/jwtAuthService';
import { RepositoriesModule } from '../common/repositories/repositories.module';
import { UserRepositoryProvider, RefreshTokenRepositoryProvider } from '../common/repositories/repository.providers';
import { EmailModule } from '../email/email.module';

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
    UserRepositoryProvider,
    RefreshTokenRepositoryProvider,
  ],
  exports: [JwtAuthService],
})
export class AuthModule {}

