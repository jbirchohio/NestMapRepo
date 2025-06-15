import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { RepositoriesModule } from '../common/repositories/repositories.module';
import { AuthUserRepositoryProvider, RefreshTokenRepositoryProvider } from '../common/repositories/repository.providers';

/**
 * Auth module that handles authentication and authorization
 * Imports the repositories module to use standardized repositories
 */
@Module({
  imports: [
    RepositoriesModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthUserRepositoryProvider,
    RefreshTokenRepositoryProvider,
  ],
  exports: [AuthService],
})
export class AuthModule {}
