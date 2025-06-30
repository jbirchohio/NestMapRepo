import { AuthzMiddleware } from './authz.middleware';
import { UserContextService } from '../services/user-context.service';
import { Logger } from '../interfaces/logger.interface';

/**
 * Creates a new instance of AuthzMiddleware with the provided dependencies
 * @param logger Logger instance for logging
 * @param userContextService User context service for managing user state
 * @returns A new instance of AuthzMiddleware
 */
export const createAuthzMiddleware = (logger: Logger, userContextService: UserContextService): AuthzMiddleware => {
  return new AuthzMiddleware(logger, userContextService);
};

// Re-export the middleware for convenience
export * from './authz.middleware';

// Export types that might be needed by consumers
export type { PermissionOptions } from './authz.middleware';
