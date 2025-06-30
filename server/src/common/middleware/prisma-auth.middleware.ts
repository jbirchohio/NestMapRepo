import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppErrorCode } from '@shared/types/error-codes';
import { UserRole } from '@shared/schema/types/auth/permissions';
import { logger } from '../../utils/logger.js';
import { UserContextService } from '../services/user-context.service';

type AuthenticatedRequest = Request & {
  user: Express.User;
};

// Local error creation function
const createApiError = (code: AppErrorCode, message: string) => {
  const error = new Error(message) as any;
  error.code = code;
  return error;
};

interface AuthMiddlewareDependencies {
  userContextService: UserContextService;
  logger: typeof logger;
}

/**
 * Creates authentication middleware with the provided dependencies
 * @param deps Dependencies including user context service and logger
 * @returns Object containing authentication middleware functions
 */
export const createAuthMiddleware = (deps: AuthMiddlewareDependencies) => {
  const { userContextService, logger } = deps;

  /**
   * Middleware to ensure user is authenticated
   */
  const requireAuth = (): RequestHandler => {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      try {
        await userContextService.setUserContext(req);
        
        if (!req.user) {
          logger.warn('Authentication required but no user found in request');
          next(createApiError(AppErrorCode.UNAUTHORIZED, 'Authentication required'));
          return;
        }
        
        next();
      } catch (error) {
        logger.error({ error }, 'Error in requireAuth middleware');
        next(error);
      }
    };
  };

  /**
   * Middleware to ensure user has a valid organization context
   */
  const requireOrgContext = (): RequestHandler => {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      try {
        await userContextService.setUserContext(req);

        if (!req.user) {
          logger.warn('Authentication required but no user found in request');
          next(createApiError(AppErrorCode.UNAUTHORIZED, 'Authentication required'));
          return;
        }

        const organizationId = userContextService.getOrganizationId(req);
        if (!organizationId) {
          logger.warn('Organization context required but not found in user context');
          next(createApiError(AppErrorCode.BAD_REQUEST, 'Organization context required'));
          return;
        }

        // Set the organization ID in the request for downstream middleware
        req.organizationId = organizationId;
        next();
      } catch (error) {
        logger.error({ error }, 'Error in requireOrgContext middleware');
        next(error);
      }
    };
  };

  /**
   * Middleware to ensure user has admin role
   */
  const requireAdmin = (): RequestHandler => {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      try {
        await userContextService.setUserContext(req);

        if (!req.user) {
          logger.warn('Authentication required but no user found in request');
          next(createApiError(AppErrorCode.UNAUTHORIZED, 'Authentication required'));
          return;
        }

        const isAdmin = userContextService.hasAnyRole(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
        if (!isAdmin) {
          logger.warn('Admin role required but user does not have required role');
          next(createApiError(AppErrorCode.FORBIDDEN, 'Admin access required'));
          return;
        }

        next();
      } catch (error) {
        logger.error({ error }, 'Error in requireAdmin middleware');
        next(error);
      }
    };
  };

  /**
   * Middleware to ensure user has superadmin role
   */
  const requireSuperAdmin = (): RequestHandler => {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      try {
        await userContextService.setUserContext(req);

        if (!req.user) {
          logger.warn('Authentication required but no user found in request');
          next(createApiError(AppErrorCode.UNAUTHORIZED, 'Authentication required'));
          return;
        }

        const isSuperAdmin = userContextService.hasRole(req, UserRole.SUPER_ADMIN);
        if (!isSuperAdmin) {
          logger.warn('SuperAdmin role required but user does not have required role');
          next(createApiError(AppErrorCode.FORBIDDEN, 'SuperAdmin access required'));
          return;
        }

        next();
      } catch (error) {
        logger.error({ error }, 'Error in requireSuperAdmin middleware');
        next(error);
      }
    };
  };

  /**
   * Middleware to validate resource ownership
   * @param getResourceOwnerId Function to extract owner ID from request
   */
  const requireOwnership = (
    getResourceOwnerId: (req: AuthenticatedRequest) => Promise<string | undefined>
  ): RequestHandler => {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      try {
        await userContextService.setUserContext(req);

        if (!req.user) {
          logger.warn('Authentication required but no user found in request');
          next(createApiError(AppErrorCode.UNAUTHORIZED, 'Authentication required'));
          return;
        }

        // Skip ownership check for admins
        if (userContextService.hasAnyRole(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN])) {
          return next();
        }

        const resourceOwnerId = await getResourceOwnerId(req as AuthenticatedRequest);
        const userId = userContextService.getUserId(req);

        if (!resourceOwnerId || !userId) {
          logger.warn('Resource ownership validation failed: missing resource owner ID or user ID');
          next(createApiError(AppErrorCode.FORBIDDEN, 'Access to resource not allowed'));
          return;
        }

        if (resourceOwnerId !== userId) {
          logger.warn(`User ${userId} attempted to access resource owned by ${resourceOwnerId}`);
          next(createApiError(AppErrorCode.FORBIDDEN, 'Access to resource not allowed'));
          return;
        }

        next();
      } catch (error) {
        logger.error({ error }, 'Error in requireOwnership middleware');
        next(error);
      }
    };
  };

  return {
    requireAuth,
    requireOrgContext,
    requireAdmin,
    requireSuperAdmin,
    requireOwnership,
  };
};

// Export a default instance with the default logger for backward compatibility
const defaultAuthMiddleware = createAuthMiddleware({
  userContextService: new UserContextService(/* default user repository */),
  logger,
});

export const {
  requireAuth,
  requireOrgContext,
  requireAdmin,
  requireSuperAdmin,
  requireOwnership,
} = defaultAuthMiddleware;
