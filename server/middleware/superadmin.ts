import type { Request, Response, NextFunction } from '../../express-augmentations.ts';
import { USER_ROLES } from '../db/schema.js';
import type { AuthUser } from '../src/types/auth-user.ts';
// Create a type that represents the custom properties we're adding to the request
type CustomRequestProps = {
    user?: AuthUser;
    organizationId?: string | null;
    organization_id?: string | null;
};
// Define a custom request type that includes our AuthUser
export type AuthenticatedRequest = Request & {
    user: AuthUser; // Make user required in AuthenticatedRequest
    organizationId?: string | null;
    organization_id?: string | null;
};
// Extend the Express Request type to include our custom properties
declare module 'express-serve-static-core' {
    interface Request extends CustomRequestProps {
    }
}
// Middleware to check superadmin permissions
export const requireSuperadmin = (req: Request, res: Response, next: NextFunction) => {
    // Type assertion to access user property
    const user = (req as any).user as AuthUser | undefined;
    // Check if user is authenticated first
    if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    // Check if user has valid superadmin role
    const validSuperadminRoles = [
        'superadmin_owner',
        'superadmin_staff',
        'superadmin_auditor'
    ];
    if (!user.role || !validSuperadminRoles.includes(user.role.toLowerCase())) {
        return res.status(403).json({ error: 'Superadmin access required' });
    }
    next();
};
// Middleware for superadmin owner level permissions
export const requireSuperadminOwner = (req: Request, res: Response, next: NextFunction) => {
    // Type assertion to access user property
    const user = (req as any).user as AuthUser | undefined;
    // Check if user is authenticated first
    if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    // Check if user has superadmin owner role
    if (user.role.toLowerCase() !== 'superadmin_owner') {
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
    details?: Record<string, unknown>,
    targetUserId?: string,
    targetOrganizationId?: string,
    request?: Request
) => {
    try {
        const { db } = await import('../db');
        const { superadminAuditLogs } = await import('../db/superadminSchema');
        // Extract IP and user agent from request if available
        let ipAddress = '';
        let userAgent = '';
        if (request) {
            // Handle x-forwarded-for header
            const forwardedFor = request.headers['x-forwarded-for'];
            if (Array.isArray(forwardedFor)) {
                ipAddress = forwardedFor[0] || '';
            }
            else if (typeof forwardedFor === 'string') {
                ipAddress = forwardedFor;
            }
            // Handle user-agent header
            const userAgentHeader = request.headers['user-agent'];
            if (Array.isArray(userAgentHeader)) {
                userAgent = userAgentHeader[0] || '';
            }
            else if (typeof userAgentHeader === 'string') {
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
    }
    catch (error) {
        console.error('Failed to log superadmin action:', error);
        // Don't throw error to avoid breaking the main operation
    }
};
