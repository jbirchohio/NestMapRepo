import { Request, Response, NextFunction } from 'express';
import { USER_ROLES } from '../../shared/schema';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    organization_id?: number;
    displayName?: string;
  };
}

/**
 * Middleware to require superadmin permissions
 */
export function requireSuperadmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const superadminRoles = [
    USER_ROLES.SUPERADMIN_OWNER,
    USER_ROLES.SUPERADMIN_STAFF,
    USER_ROLES.SUPERADMIN_AUDITOR
  ];

  if (!superadminRoles.includes(req.user.role as any)) {
    return res.status(403).json({ message: 'Superadmin access required' });
  }

  next();
}

/**
 * Middleware to require superadmin staff or owner (excludes auditor)
 */
export function requireSuperadminStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const staffRoles = [
    USER_ROLES.SUPERADMIN_OWNER,
    USER_ROLES.SUPERADMIN_STAFF
  ];

  if (!staffRoles.includes(req.user.role as any)) {
    return res.status(403).json({ message: 'Superadmin staff access required' });
  }

  next();
}

/**
 * Middleware to require superadmin owner
 */
export function requireSuperadminOwner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.role !== USER_ROLES.SUPERADMIN_OWNER) {
    return res.status(403).json({ message: 'Superadmin owner access required' });
  }

  next();
}

/**
 * Create audit log entry for superadmin actions
 */
export function logSuperadminAction(action: string, targetType: string, targetId: string, details?: Record<string, any>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Store audit info in res.locals for the route handler to save
    res.locals.auditLog = {
      action,
      targetType,
      targetId: req.params[targetId] || targetId,
      details: details || req.body,
      superadminUserId: req.user?.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };
    next();
  };
}