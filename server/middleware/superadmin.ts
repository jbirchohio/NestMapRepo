import { Request, Response, NextFunction } from 'express';
import { USER_ROLES } from '../db/schema.js';

// Extended request interface for authenticated users
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    organization_id?: number;
    displayName?: string;
  };
}

// Middleware to check superadmin permissions
export const requireSuperadmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check if user is authenticated first
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if user has valid superadmin role
  const validSuperadminRoles = [
    USER_ROLES.SUPERADMIN_OWNER,
    USER_ROLES.SUPERADMIN_STAFF,
    USER_ROLES.SUPERADMIN_AUDITOR
  ];
  
  if (!req.user.role || !validSuperadminRoles.includes(req.user.role as any)) {
    return res.status(403).json({ error: 'Superadmin access required' });
  }
  
  next();
};

// Middleware for superadmin owner level permissions
export const requireSuperadminOwner = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check if user is authenticated first
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if user has superadmin owner role
  if (req.user.role !== USER_ROLES.SUPERADMIN_OWNER) {
    return res.status(403).json({ error: 'Superadmin owner access required' });
  }
  
  next();
};

// Audit logging function for superadmin actions
export const logSuperadminAction = async (
  adminUserId: number,
  action: string,
  targetType: string,
  targetId?: number,
  details?: any
) => {
  try {
    const { db } = await import('../db');
    const { superadminAuditLogs } = await import('@shared/schema');
    
    await db.insert(superadminAuditLogs).values({
      superadmin_user_id: adminUserId,
      action,
      target_type: targetType,
      target_id: targetId?.toString() || '',
      details,
      ip_address: null, // Could be extracted from request if needed
      user_agent: null, // Could be extracted from request if needed
    });
  } catch (error) {
    console.error('Failed to log superadmin action:', error);
    // Don't throw error to avoid breaking the main operation
  }
};