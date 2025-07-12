import { Request, Response, NextFunction } from 'express';
import { USER_ROLES } from '../db/schema.js';
import { AuthUser } from '../src/types/auth-user.js';

// Create a type that represents the custom properties we're adding to the request
type CustomRequestProps = {
  user?: AuthUser;
  organizationId?: string | null;
};

// Define a custom request type that includes our AuthUser
export type AuthenticatedRequest = Request & {
  user: AuthUser; // Make user required in AuthenticatedRequest
  organizationId?: string | null;
};

// Middleware to check superadmin permissions
export const requireSuperadmin = (req: Request, res: Response, next: NextFunction) => {
  // Check if user is authenticated first
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if user has valid superadmin role
  const validSuperadminRoles = [
    'superadmin_owner',
    'superadmin_staff',
    'superadmin_auditor'
  ];
  
  if (!req.user.role || !validSuperadminRoles.includes(req.user.role.toLowerCase())) {
    return res.status(403).json({ error: 'Superadmin access required' });
  }
  
  next();
};

// Middleware for superadmin owner level permissions
export const requireSuperadminOwner = (req: Request, res: Response, next: NextFunction) => {
  // Check if user is authenticated first
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if user has superadmin owner role
  if (req.user.role.toLowerCase() !== 'superadmin_owner') {
    return res.status(403).json({ error: 'Superadmin owner access required' });
  }
  
  next();
};

// Audit logging function for superadmin actions
export const logSuperadminAction = async (
  adminUserId: string,
  action: string,
  targetType: string,
  targetId?: string,
  details?: any,
  targetUserId?: string,
  targetOrganizationId?: string,
  request?: Request
) => {
  try {
    const { db } = await import('../db.js');
    const { superadminAuditLogs } = await import('../db/superadminSchema.js');
    
    // Extract IP and user agent from request if available
    let ipAddress = '.js';
    let userAgent = '.js';
    
    if (request) {
      // Handle x-forwarded-for header
      const forwardedFor = request.headers['x-forwarded-for'];
      if (Array.isArray(forwardedFor)) {
        ipAddress = forwardedFor[0] || '.js';
      } else if (typeof forwardedFor === 'string') {
        ipAddress = forwardedFor;
      }
      
      // Handle user-agent header
      const userAgentHeader = request.headers['user-agent'];
      if (Array.isArray(userAgentHeader)) {
        userAgent = userAgentHeader[0] || '.js';
      } else if (typeof userAgentHeader === 'string') {
        userAgent = userAgentHeader;
      }
    }
    
    await db.insert(superadminAuditLogs).values({
      adminUserId,
      action: `superadmin_${action}`,
      entityType: targetType,
      entityId: targetId,
      targetUserId,
      targetOrganizationId,
      details: details ? JSON.parse(JSON.stringify(details)) : undefined,
      ipAddress,
      userAgent,
      severity: 'info'
    });
  } catch (error) {
    console.error('Failed to log superadmin action:', error);
    // Don't throw error to avoid breaking the main operation
  }
};