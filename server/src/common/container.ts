import { PrismaUserRepository } from './repositories/prisma/user.repository.js';
import { UserContextService } from './services/user-context.service.js';
import { logger } from '../utils/logger.js';
import { createAuthzMiddleware } from './middleware/index.js';

// Initialize repositories
const userRepository = new PrismaUserRepository();

// Initialize services
const userContextService = new UserContextService(userRepository);

// Initialize authz middleware
const authz = createAuthzMiddleware(logger, userContextService);

// Export all dependencies
export const container = {
  // Repositories
  userRepository,
  
  // Services
  userContextService,
  
  // Middleware
  authz,
  
  // For backward compatibility (deprecated, will be removed in future)
  requireAuth: authz.requireAuth.bind(authz),
  requireOrgContext: authz.requireOrgContext.bind(authz),
  requireAdmin: authz.requireRole.bind(authz, 'admin'),
  requireSuperAdmin: authz.requireRole.bind(authz, 'super_admin'),
  requireOwnership: authz.requireOwnership.bind(authz, 'resource'),
};

export type Container = typeof container;
