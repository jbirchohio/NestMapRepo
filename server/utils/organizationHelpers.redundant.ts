import type { Request } from '../../express-augmentations.ts';
import type { AuthUser } from '../src/types/auth-user.js';
/**
 * Gets the organization ID from the request user object
 */
export function getOrganizationId(req: Request): string | undefined {
    const user = (req as any).user as AuthUser | undefined;
    if (!user)
        return undefined;
    return user.organization_id;
}
/**
 * Ensures the user has an organization ID
 * Throws an error if not found
 */
export function requireOrganizationId(req: Request): string {
    const orgId = getOrganizationId(req);
    if (!orgId) {
        throw new Error('Organization ID is required');
    }
    return orgId;
}
