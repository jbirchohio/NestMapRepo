import { PrismaUserRepository } from './repositories/prisma/user.repository.js';
import { UserContextService } from './services/user-context.service.js';
import { logger } from '../utils/logger.js';
import { createAuthMiddleware } from './middleware/prisma-auth.middleware.js';

// Initialize repositories
const userRepository = new PrismaUserRepository();

// Initialize services
const userContextService = new UserContextService(userRepository);

// Initialize middleware
const { 
  requireAuth, 
  requireOrgContext, 
  requireAdmin, 
  requireSuperAdmin, 
  requireOwnership 
} = createAuthMiddleware({ 
  userContextService, 
  logger 
});

// Export all dependencies
export const container = {
  // Repositories
  userRepository,
  
  // Services
  userContextService,
  
  // Middleware
  requireAuth,
  requireOrgContext,
  requireAdmin,
  requireSuperAdmin,
  requireOwnership,
};

export type Container = typeof container;
