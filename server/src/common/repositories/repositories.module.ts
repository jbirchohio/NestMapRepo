import { Module } from '@nestjs/common.js';
import { RepositoryProviders } from './repository.providers.js';

/**
 * Module that registers all repository implementations
 * This centralizes repository registration and makes it easy to use repositories throughout the application
 */
@Module({
  providers: [...RepositoryProviders],
  exports: [...RepositoryProviders],
})
export class RepositoriesModule {}
