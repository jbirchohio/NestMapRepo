import { Response, NextFunction, RequestHandler, Request } from 'express';
import type { UserRole } from '@prisma/client';
import { AppErrorCode } from '@shared/schema/types/error-codes';
import { UserContextService } from '../services/user-context.service.js';
import { createApiError } from '../utils/error-utils.js';
import type { Logger } from '../interfaces/logger.interface.js';
import type { AuthUser } from '@shared/schema//types/auth/user.js';

// Extend the Express Request type to include our custom properties
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser & {
      permissions?: string[];
    };
    organizationId?: string | undefined;
  }
}

// Define types for permissions and resources
type ResourceType = 'USER' | 'TRIP' | 'ORGANIZATION' | 'ACTIVITY' | 'BOOKING' | 'INVOICE' | 'REPORT' | 'SETTING';
type PermissionAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'MANAGE';
type PermissionLevel = 'NONE' | 'READ' | 'WRITE' | 'ADMIN' | 'OWNER';

/**
 * @file authz.middleware.ts
 * @description Consolidated authentication and authorization middleware for the application.
 * Combines functionality from auth.middleware.ts, permission.middleware.ts, and prisma-auth.middleware.ts
 * into a single, well-documented solution.
 */

/**
 * Interface for permission check options
 */
interface PermissionOptions {
  /** The resource type being accessed */
  resource: ResourceType;
  /** The action being performed on the resource */
  action: PermissionAction;
  /** The permission level required */
  level?: PermissionLevel;
  /** Field name that identifies the resource owner (default: 'userId') */
  ownershipField?: string;
  /** Allow access if the user is the same as the resource owner (default: true) */
  allowSameUser?: boolean;
  /** Allow admins to bypass permission checks (default: true) */
  allowAdmins?: boolean;
}

// Request type is now extended via @shared/types/auth/express.d.ts

/**
 * Authentication and Authorization Middleware
 * 
 * This middleware provides a comprehensive set of methods for handling:
 * - Authentication verification
 * - Role-based access control (RBAC)
 * - Permission-based access control
 * - Resource ownership validation
 * - Organization context management
 */
export class AuthzMiddleware {
  constructor(
    private readonly logger: Logger,
    private readonly userContextService: UserContextService
  ) {}

  /**
   * Middleware to ensure user is authenticated
   * @example
   * router.get('/protected', authz.requireAuth(), controller.handler);
   */
  public requireAuth(): RequestHandler {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      try {
        await this.userContextService.setUserContext(req);
        
        if (!req.user) {
          this.logger.warn('Authentication required but no user found in request');
          next(createApiError(AppErrorCode.UNAUTHORIZED, 'Authentication required'));
          return;
        }
        
        next();
      } catch (error) {
        this.logger.error('Error in requireAuth middleware', { error });
        next(error);
      }
    };
  }

  /**
   * Middleware to ensure user has a valid organization context
   * @example
   * router.get('/org-data', authz.requireOrgContext(), controller.handler);
   */
  public requireOrgContext(): RequestHandler {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      try {
        await this.userContextService.setUserContext(req);

        if (!req.user) {
          this.logger.warn('Authentication required but no user found in request');
          next(createApiError(AppErrorCode.UNAUTHORIZED, 'Authentication required'));
          return;
        }

        const organizationId = this.userContextService.getOrganizationId(req);
        if (!organizationId) {
          this.logger.warn('Organization context required but not found in user context');
          next(createApiError(AppErrorCode.BAD_REQUEST, 'Organization context required'));
          return;
        }

        // Set the organization ID in the request for downstream middleware
        req.organizationId = organizationId;
        next();
      } catch (error) {
        this.logger.error('Error in requireOrgContext middleware: ' + (error instanceof Error ? error.message : String(error)));
        next(error);
      }
    };
  }

  /**
   * Middleware to check if user has a specific role or higher
   * @param requiredRole The minimum role required to access the route
   * @example
   * router.get('/admin', authz.requireRole(UserRole.ADMIN), adminController.handler);
   */
  public requireRole(requiredRole: UserRole): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction): void => {
      if (!req.user) {
        this.logger.warn('Authentication required but no user found in request');
        next(createApiError(AppErrorCode.UNAUTHORIZED, 'Authentication required'));
        return;
      }

      const roleHierarchy = {
        'super_admin': 4,
        'admin': 3,
        'manager': 2,
        'member': 1,
        'guest': 0
      } as const;

      const userRoleLevel = roleHierarchy[req.user.role as keyof typeof roleHierarchy] ?? -1;
      const requiredRoleLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] ?? 0;

      if (userRoleLevel < requiredRoleLevel) {
        this.logger.warn(`User ${req.user.id} with role ${req.user.role} attempted to access ${requiredRole}-only resource`);
        next(createApiError(AppErrorCode.FORBIDDEN, `Role ${requiredRole} or higher required`));
        return;
      }

      next();
    };
  }

  /**
   * Middleware to check specific permissions on a resource
   * @param options Permission check configuration
   * @example
   * router.get('/trip/:id', 
   *   authz.checkPermission({
   *     resource: ResourceType.TRIP,
   *     action: PermissionAction.READ,
   *     level: PermissionLevel.READ
   *   }),
   *   tripController.getTrip
   * );
   */
  public checkPermission(options: {
    resource: ResourceType;
    action: PermissionAction;
    allowAdmins?: boolean;
    allowOwners?: boolean;
    level?: PermissionLevel;
  }): RequestHandler {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          this.logger.warn('Authentication required but no user found in request');
          next(createApiError(AppErrorCode.UNAUTHORIZED, 'Authentication required'));
          return;
        }

        const {
          resource,
          action,
          allowAdmins = true,
          allowOwners = true,
          level = 'READ',
        } = options;

        // Check if user is admin and admins are allowed to bypass
        if (allowAdmins && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
          return next();
        }

        // Check if user has the required permission
        if (!req.user) {
          next(createApiError(AppErrorCode.UNAUTHORIZED, 'Authentication required'));
          return;
        }
        
        // Create a permission string in the format 'resource:action:level'
        const permissionString = `${resource.toLowerCase()}:${action.toLowerCase()}:${level.toLowerCase()}`;
        
        // Pass the request object to the permission check
        const hasPermission = this.userContextService.hasPermission(
          req,  // Pass the entire request object
          permissionString
        );
        
        // Safely check user permissions if they exist
        const userPermissions = (req.user as any)?.permissions as string[] | undefined;
        const userHasPermission = userPermissions?.includes(permissionString) || false;

        if (hasPermission || userHasPermission) {
          return next();
        }

        // Check ownership if allowed
        if (allowOwners && req.user.id === req.params.id) {
          return next();
        }

        this.logger.warn(`User ${req.user.id} does not have permission to ${action} ${resource}`);
        next(createApiError(AppErrorCode.FORBIDDEN, 'Insufficient permissions'));
      } catch (error) {
        this.logger.error(`Error in checkPermission middleware: ${error instanceof Error ? error.message : String(error)}`);
        next(error);
      }
    };
  }

  /**
   * Middleware to check resource ownership
   * @param resourceName Name of the resource (for logging)
   * @param idParam Name of the route parameter containing the resource ID (default: 'id')
   * @param ownerField Field in the resource that contains the owner's ID (default: 'userId')
   * @example
   * router.delete('/trip/:id', 
   *   authz.requireOwnership('trip'),
   *   tripController.deleteTrip
   * );
   */
  public requireOwnership(resourceName: string, ownerField: string = 'userId'): RequestHandler {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          this.logger.warn('Authentication required for ownership check');
          next(createApiError(AppErrorCode.UNAUTHORIZED, 'Authentication required'));
          return;
        }

        const resourceId = req.params.id || req.body.id;
        if (!resourceId) {
          this.logger.warn('No resource ID provided for ownership check');
          next(createApiError(AppErrorCode.BAD_REQUEST, 'Resource ID is required'));
          return;
        }

        // Admins can bypass ownership check
        if (req.user.role === 'admin' || req.user.role === 'super_admin') {
          return next();
        }

        // Check ownership - simplified for now
        // In a real implementation, you would check the database
        const isOwner = req.user.id === resourceId || 
                       (req.user.organizationId !== null && req.user.organizationId === resourceId);

        if (!isOwner) {
          this.logger.warn(`User ${req.user.id} is not the owner of ${resourceName} ${resourceId}`);
          next(createApiError(AppErrorCode.FORBIDDEN, 'You do not own this resource'));
          return;
        }

        next();
      } catch (error) {
        this.logger.error(`Error in requireOwnership middleware: ${error instanceof Error ? error.message : String(error)}`);
        next(error);
      }
    };
  }
}
