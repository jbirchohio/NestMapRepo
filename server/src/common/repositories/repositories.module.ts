import type { Module } from '@nestjs/common';
import type { RepositoryProviders } from './repository.providers.ts';
/**
 * Module that registers all repository implementations
 * This centralizes repository registration and makes it easy to use repositories throughout the application
 */
@Module({
    providers: [...RepositoryProviders],
    exports: [...RepositoryProviders],
})
export class RepositoriesModule {
}
