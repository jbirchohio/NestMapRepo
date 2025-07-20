import { Module } from '@nestjs/common';
import { RepositoryProviders } from './repository.providers';

/**
 * Module that registers all repository implementations
 * This centralizes repository registration and makes it easy to use repositories throughout the application
 */
@Module({
  providers: [...RepositoryProviders],
  exports: [...RepositoryProviders],
})
export class RepositoriesModule {}
