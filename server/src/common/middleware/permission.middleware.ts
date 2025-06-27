import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../types.js';
import { Logger } from '@nestjs/common';
import { createApiError, ErrorType } from '../types';
import { PermissionManager, checkPermission } from '@shared/utils/permissions';
import { UserRole, ResourceType, PermissionAction, PermissionLevel } from '@shared/types/auth/permissions';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        organizationId: string | null;
        permissions?: string[];
        [key: string]: any /** FIXANYERROR: Replace 'any' */;
      };
    }
  }
}

interface PermissionOptions {
  resource: ResourceType;
  action: PermissionAction;
  level?: PermissionLevel;
  ownershipField?: string;
  allowSameUser?: boolean;
  allowAdmins?: boolean;
}

@injectable()
export class PermissionMiddleware {
  constructor(
    @inject(TYPES.Logger) private readonly logger: Logger,
    @inject(TYPES.PermissionManager) private readonly permissionManager: PermissionManager
  ) {}

  /**
   * Middleware to check if user is authenticated
   */
  public requireAuth() {
    return (req: Request, _res: Response, next: NextFunction): void => {
      if (!req.user) {
        this.logger.warn('Authentication required but no user found in request');
        next(createApiError(ErrorType.UNAUTHORIZED, 'Authentication required'));
        return;
      }
      next();
    };
  }

  /**
   * Middleware to check if user has organization context
   */
  public requireOrgContext() {
    return (req: Request, _res: Response, next: NextFunction): void => {
      if (!req.user?.organizationId) {
        this.logger.warn('Organization context required but not found in user context');
        next(createApiError(ErrorType.BAD_REQUEST, 'Organization context required'));
        return;
      }
      next();
    };
  }

  /**
   * Middleware to check if user has specific role or higher
   */
  public requireRole(requiredRole: UserRole) {
    return (req: Request, _res: Response, next: NextFunction): void => {
      if (!req.user) {
        this.logger.warn('Authentication required but no user found in request');
        next(createApiError(ErrorType.UNAUTHORIZED, 'Authentication required'));
        return;
      }

      const roleHierarchy: Record<UserRole, number> = {
        'super_admin': 4,
        'admin': 3,
        'manager': 2,
        'member': 1,
        'guest': 0
      };

      const userRoleLevel = roleHierarchy[req.user.role] ?? -1;
      const requiredRoleLevel = roleHierarchy[requiredRole] ?? 0;

      if (userRoleLevel < requiredRoleLevel) {
        this.logger.warn(`User ${req.user.id} with role ${req.user.role} attempted to access ${requiredRole}-only resource`);
        next(createApiError(ErrorType.FORBIDDEN, `Role ${requiredRole} or higher required`));
        return;
      }

      next();
    };
  }

  /**
   * Middleware to check specific permission
   */
  public checkPermission(options: PermissionOptions) {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        this.logger.warn('Authentication required but no user found in request');
        next(createApiError(ErrorType.UNAUTHORIZED, 'Authentication required'));
        return;
      }

      const {
        resource,
        action,
        level = 'own',
        ownershipField = 'userId',
        allowSameUser = true,
        allowAdmins = true
      } = options;

      // Check if user is admin and admins are allowed to bypass
      if (allowAdmins && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
        return next();
      }

      // Check if user is accessing their own resource
      if (allowSameUser && req.params[ownershipField] === req.user.id) {
        return next();
      }

      // Check permission using the permission manager
      const hasPermission = checkPermission(
        this.permissionManager,
        req.user.role,
        resource,
        action,
        level,
        {
          user: req.user,
          params: req.params,
          body: req.body,
          query: req.query
        }
      );

      if (!hasPermission) {
        this.logger.warn(`User ${req.user.id} does not have permission to ${action} ${resource}`);
        next(createApiError(ErrorType.FORBIDDEN, 'Insufficient permissions'));
        return;
      }

      next();
    };
  }

  /**
   * Middleware to check resource ownership
   */
  public requireOwnership(resourceName: string, idParam = 'id', ownerField = 'userId') {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        this.logger.warn('Authentication required but no user found in request');
        next(createApiError(ErrorType.UNAUTHORIZED, 'Authentication required'));
        return;
      }

      // Admins can bypass ownership check
      if (req.user.role === 'admin' || req.user.role === 'super_admin') {
        return next();
      }

      const resourceId = req.params[idParam];
      if (!resourceId) {
        this.logger.warn(`No ${resourceName} ID provided in request parameters`);
        next(createApiError(ErrorType.BAD_REQUEST, `Missing ${resourceName} ID`));
        return;
      }

      // In a real implementation, you would fetch the resource and check ownership
      // This is a simplified example
      const isOwner = await this.checkResourceOwnership(resourceName, resourceId, req.user.id, ownerField);

      if (!isOwner) {
        this.logger.warn(`User ${req.user.id} is not the owner of ${resourceName} ${resourceId}`);
        next(createApiError(ErrorType.FORBIDDEN, `You do not own this ${resourceName}`));
        return;
      }

      next();
    };
  }

  /**
   * Check if a user owns a resource
   * This is a simplified example - in a real app, you would query your database
   */
  private async checkResourceOwnership(
    resourceName: string,
    resourceId: string,
    userId: string,
    ownerField: string
  ): Promise<boolean> {
    // In a real implementation, you would query your database here
    // For example:
    // const resource = await this.resourceRepository.findById(resourceId);
    // return resource && resource[ownerField] === userId;
    
    // For now, we'll just return true to demonstrate the flow
    this.logger.debug(`Checking ownership of ${resourceName} ${resourceId} for user ${userId}`);
    return true;
  }
}

/**
 * Factory function to create permission middleware
 */
export function createPermissionMiddleware(
  logger: Logger,
  permissionManager: PermissionManager
): PermissionMiddleware {
  return new PermissionMiddleware(logger, permissionManager);
}
