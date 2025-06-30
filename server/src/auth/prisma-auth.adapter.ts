import { RequestHandler, Request, Response, NextFunction } from 'express';
import { prismaService } from './common/database/index.js';
import { PrismaAuthService } from './services/prisma-auth.service.js';
import { prismaAuthService } from './services/prisma-auth.service.js';
import { authenticateJWT, requireRole, requireOrganizationContext, requireOwnership } from './middleware/prisma-jwt.middleware.js';
import { UserRole } from '@shared/schema/types/auth/permissions';

/**
 * Adapter to integrate Prisma-based authentication with the existing Express app
 */
class PrismaAuthAdapter {
  private authService: PrismaAuthService;

  constructor() {
    this.authService = prismaAuthService;
  }

  /**
   * Initialize the authentication adapter
   * Can be used to set up any required services
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize the database connection if not already connected
      await prismaService.healthCheck();
      console.log('✅ Prisma Auth Adapter initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Prisma Auth Adapter:', error);
      throw error;
    }
  }

  /**
   * Middleware to authenticate requests using JWT
   */
  public authenticate(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      return authenticateJWT(req, res, next);
    };
  }

  /**
   * Middleware to require authentication
   */
  public requireAuth(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }
      next();
    };
  }

  /**
   * Middleware to require admin role
   */
  public requireAdmin(): RequestHandler {
    return requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  }

  /**
   * Middleware to require super admin role
   */
  public requireSuperAdmin(): RequestHandler {
    return requireRole([UserRole.SUPER_ADMIN]);
  }

  /**
   * Middleware to require organization context
   */
  public requireOrgContext(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      return requireOrganizationContext(req, res, next);
    };
  }

  /**
   * Middleware to require ownership of a resource
   * @param getResourceOwnerId Function to get the resource owner's ID from the request
   */
  public requireResourceOwnership(
    getResourceOwnerId: (req: Request) => Promise<string | null>
  ): RequestHandler {
    return requireOwnership(getResourceOwnerId);
  }

  /**
   * Get the auth service instance
   */
  public getAuthService(): PrismaAuthService {
    return this.authService;
  }
}

// Export a singleton instance
export const prismaAuthAdapter = new PrismaAuthAdapter();

export default prismaAuthAdapter;
