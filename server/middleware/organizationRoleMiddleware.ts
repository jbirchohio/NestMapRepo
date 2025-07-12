import { Request, Response, NextFunction } from 'express';
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
      // Fetch permissions for this user/role/org
      const permissions = await getUserPermissionsByRole(
        req.user.id,
        req.user.role,
        req.user.organization_id || req.user.organizationId
      );
      if (permissions[permission] === true) {
        return next();
      }
      return res.status(403).json({ message: `Access denied: Missing permission '${permission}'` });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('RBAC permission check error', err);
      return res.status(500).json({ message: 'Permission check failed' });
    }
  };
}