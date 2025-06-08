import { Request, Response, NextFunction } from 'express';
import { User } from '../../shared/types/auth';

/**
 * Interface for authenticated requests with user information
 */
export interface AuthenticatedRequest extends Request {
  user: User;
  auth?: any;
  organizationId?: string | number;
  requestId?: string;
  startTime?: [number, number];
  token?: string;
  isAuthenticated(): boolean;
  hasRole(role: string | string[]): boolean;
  hasPermission(permission: string | string[]): boolean;
}

/**
 * Middleware to extend the Request object with custom methods
 */
export const extendRequest = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // Add isAuthenticated method
  req.isAuthenticated = function (): boolean {
    return !!this.user && !!this.user.id;
  };

  // Add hasRole method
  req.hasRole = function (role: string | string[]): boolean {
    if (!this.user) return false;
    
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(this.user.role);
  };

  // Add hasPermission method
  req.hasPermission = function (permission: string | string[]): boolean {
    if (!this.user) return false;
    
    // If user is admin, they have all permissions
    if (this.user.role === 'admin' || this.user.role === 'superadmin') {
      return true;
    }

    const permissions = Array.isArray(permission) ? permission : [permission];
    
    // Check if user has any of the required permissions
    // This is a basic implementation - you might want to check against user's actual permissions
    // stored in the database or JWT token
    return permissions.some(p => {
      // Example: Check if permission is in the user's permissions array
      // This assumes user.permissions is an array of permission strings
      return this.user.permissions?.includes(p) || false;
    });
  };

  next();
};

/**
 * Middleware to ensure the request is authenticated
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }
  next();
};

/**
 * Middleware to check if user has required role(s)
 */
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    const hasRole = requiredRoles.some(role => req.user?.role === role);

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has required permission(s)
 */
export const requirePermission = (permissions: string | string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
    const hasPermission = requiredPermissions.every(permission => 
      req.hasPermission(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
    }

    next();
  };
};
