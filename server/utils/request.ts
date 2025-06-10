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
  req.hasPermission = function (_permission: string | string[]): boolean {
    if (!this.user) return false;
    
    // If user is admin, they have all permissions
    if (this.user.role === 'admin' || this.user.role === 'superadmin') {
      return true;
    }

    // This is a basic implementation. For now, we only check roles.
    // A more robust permission system would check a user.permissions array.
    return false;
  };

  next();
};

/**
 * Middleware to check if user has required role(s)
 */
export const requireRole = (roles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

    return next();
  };
};

/**
 * Middleware to check if user has required permission(s)
 */
export const requirePermission = (permissions: string | string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

    return next();
  };
};
