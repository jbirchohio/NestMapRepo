import type { Response, NextFunction, Request, RequestHandler } from 'express';
import { AppErrorCode } from '@shared/schema/types/error-codes';
import { UserRole } from '@prisma/client';
import logger from '../../utils/logger.js';

// Helper type for authenticated requests
type AuthenticatedRequest = Request & {
  user: Express.User;  // Use Express.User type which extends AuthUser
};

// Local error creation function
const createApiError = (code: AppErrorCode, message: string) => {
  const error = new Error(message) as any;
  error.code = code;
  return error;
};
/**
 * Middleware to ensure user is authenticated
 * @param logger Logger instance
 * @returns Express middleware function
 */
export const requireAuth = (logger: Logger): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      logger.warn('Authentication required but no user found in request');
      next(createApiError(AppErrorCode.UNAUTHORIZED, 'Authentication required'));
      return;
    }
    next();
  };
};
/**
 * Middleware to ensure user has a valid organization context
 * @param logger Logger instance
 * @returns Express middleware function
 */
export const requireOrgContext = (logger: Logger): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      logger.warn('Authentication required but no user found in request');
      next(createApiError(AppErrorCode.UNAUTHORIZED, 'Authentication required'));
      return;
    }
    if (!req.user.organizationId) {
      logger.warn('Organization context required but not found in user context');
      next(createApiError(AppErrorCode.BAD_REQUEST, 'Organization context required'));
      return;
    }
    next();
  };
};
/**
 * Middleware to ensure user has admin role
 * @param logger Logger instance
 * @returns Express middleware function
 */
export const requireAdmin = (logger: Logger): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      logger.warn('Admin access required but no user found in request');
      next(createApiError(AppErrorCode.FORBIDDEN, 'Admin access required'));
      return;
    }
    
    if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPER_ADMIN) {
      logger.warn(`User ${req.user.id} attempted to access admin-only route`);
      next(createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'));
      return;
    }
    
    next();
  };
};

/**
 * Middleware to ensure user has superadmin role
 * @param logger Logger instance
 * @returns Express middleware function
 */
export const requireSuperAdmin = (logger: Logger) => {
    return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            logger.warn('Authentication required but no user found in request');
            next(createApiError(AppErrorCode.UNAUTHORIZED, 'Authentication required'));
            return;
        }
        if (req.user.role !== UserRole.SUPER_ADMIN) {
            logger.warn(`User ${req.user.id} attempted to access superadmin-only resource`);
            next(createApiError(AppErrorCode.FORBIDDEN, 'Superadmin access required'));
            return;
        }
        next();
    };
};
/**
 * Middleware to validate resource ownership
 * @param getResourceOwnerId Function to extract owner ID from request
 * @param logger Logger instance
 * @returns Express middleware function
 */
export const requireOwnership = (getResourceOwnerId: (req: AuthenticatedRequest) => Promise<string | undefined>, logger: Logger) => {
    return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                logger.warn('Authentication required but no user found in request');
                next(createApiError(AppErrorCode.UNAUTHORIZED, 'Authentication required'));
                return;
            }
            // Skip ownership check for admins and super_admins
            if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN) {
                next();
                return;
            }
            const ownerId = await getResourceOwnerId(req);
            if (!ownerId) {
                logger.warn('Resource owner ID could not be determined');
                next(createApiError(AppErrorCode.NOT_FOUND, 'Resource not found'));
                return;
            }
            if (ownerId !== req.user.id) {
                logger.warn(`User ${req.user.id} attempted to access resource owned by ${ownerId}`);
                next(createApiError(AppErrorCode.FORBIDDEN, 'You do not have permission to access this resource'));
                return;
            }
            next();
        }
        catch (error) {
            logger.error('Error in ownership validation middleware', error);
            next(createApiError(AppErrorCode.INTERNAL_SERVER_ERROR, 'An error occurred while validating resource ownership'));
        }
    };
};
