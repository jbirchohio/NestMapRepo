import type { Request, Response, NextFunction } from 'express';
import { getUserPermissionsByRole } from '../permissions.js';
/**
 * Organization RBAC middleware. Checks if user has required org permission.
 * Usage: router.use(requireOrgPermission('invite_members'))
 */
export function requireOrgPermission(permission: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required" });
        }
        try {
            // Convert string IDs to numbers and fetch permissions
            const userId = parseInt(req.user.id, 10);
            const organizationId = req.user.organizationId ? parseInt(req.user.organizationId, 10) : undefined;
            const userRole = req.user.role || 'member'; // Default to 'member' role if not specified
            
            if (isNaN(userId)) {
                throw new Error('Invalid user ID format');
            }
            
            const permissions = await getUserPermissionsByRole(userId, userRole, organizationId);
            if (permissions[permission] === true) {
                return next();
            }
            return res.status(403).json({ message: `Access denied: Missing permission '${permission}'` });
        }
        catch (err) {
             
            console.error('RBAC permission check error', err);
            return res.status(500).json({ message: 'Permission check failed' });
        }
    };
}
