import { Request } from 'express';
import { AuthUser } from '../middleware/auth';

/**
 * Gets the organization ID from the request user object
 */
export function getOrganizationId(req: Request): string | undefined {
  if (!req.user) return undefined;
  
  return (req.user as AuthUser).organization_id;
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
