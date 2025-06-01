/**
 * Organization Role Middleware
 * Integrates organization-level roles with existing authentication
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { organizationMembers } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { 
  OrganizationRole, 
  OrganizationPermissions,
  hasOrganizationPermission,
  getOrganizationPermissions 
} from '../rbac/organizationRoles';

// Extend Request type to include organization role information
declare global {
  namespace Express {
    interface Request {
      userOrgRole?: OrganizationRole;
      userOrgPermissions?: OrganizationPermissions;
    }
  }
}

/**
 * Middleware to load user's organization role and permissions
 */
export async function loadOrganizationRole(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip if user is not authenticated
    if (!req.user || !req.user.organizationId) {
      return next();
    }

    // Check if user has organization membership record
    const [membership] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.user_id, req.user.id),
          eq(organizationMembers.organization_id, req.user.organizationId),
          eq(organizationMembers.status, 'active')
        )
      );

    if (membership) {
      // Use organization-specific role
      req.userOrgRole = membership.org_role as OrganizationRole;
      
      // Parse custom permissions if they exist
      const customPermissions = membership.permissions as Partial<OrganizationPermissions> | null;
      req.userOrgPermissions = getOrganizationPermissions(req.userOrgRole, customPermissions || undefined);
    } else {
      // Fallback to system role mapping for backward compatibility
      const fallbackRole = mapSystemRoleToOrgRole(req.user.role || 'user');
      req.userOrgRole = fallbackRole;
      req.userOrgPermissions = getOrganizationPermissions(fallbackRole);
    }

    next();
  } catch (error) {
    console.error('Error loading organization role:', error);
    // Continue without role information rather than blocking the request
    next();
  }
}

/**
 * Map system roles to organization roles for backward compatibility
 */
function mapSystemRoleToOrgRole(systemRole: string): OrganizationRole {
  switch (systemRole) {
    case 'admin':
      return 'admin';
    case 'manager':
      return 'manager';
    case 'user':
      return 'member';
    case 'guest':
      return 'viewer';
    default:
      return 'member';
  }
}

/**
 * Middleware to check if user has a specific organization permission
 */
export function requireOrgPermission(permission: keyof OrganizationPermissions) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Super admin bypass
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Check organization permission
    if (!req.userOrgRole || !req.userOrgPermissions) {
      return res.status(403).json({ 
        error: 'Organization role not found',
        message: 'User must be a member of an organization'
      });
    }

    if (!req.userOrgPermissions[permission]) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `This action requires the '${permission}' permission`,
        userRole: req.userOrgRole,
        requiredPermission: permission
      });
    }

    next();
  };
}

/**
 * Middleware to check if user can access a specific trip
 */
export function requireTripAccess(action: 'view' | 'edit' | 'delete') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Super admin bypass
      if (req.user.role === 'super_admin') {
        return next();
      }

      const tripId = parseInt(req.params.id || req.body.tripId);
      if (!tripId) {
        return res.status(400).json({ error: 'Trip ID required' });
      }

      // Get trip information (assuming this is available via storage)
      const trip = await req.app.locals.storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ error: 'Trip not found' });
      }

      // Check if user is trip owner
      const isOwnTrip = trip.userId === req.user.id;

      // Check if user is a trip collaborator
      const isCollaborator = await checkTripCollaborator(req.user.id, tripId);

      // Check organization role permissions
      if (!req.userOrgRole || !req.userOrgPermissions) {
        return res.status(403).json({ 
          error: 'Organization role not found',
          message: 'User must be a member of an organization'
        });
      }

      // Use enhanced permission checking
      const hasAccess = canAccessTripWithRole(
        req.userOrgRole,
        isOwnTrip,
        isCollaborator,
        action,
        req.userOrgPermissions
      );

      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          message: `Cannot ${action} this trip`,
          userRole: req.userOrgRole,
          action
        });
      }

      next();
    } catch (error) {
      console.error('Error checking trip access:', error);
      res.status(500).json({ error: 'Failed to verify trip access' });
    }
  };
}

/**
 * Check if user is a collaborator on a trip
 */
async function checkTripCollaborator(userId: number, tripId: number): Promise<boolean> {
  try {
    const { tripCollaborators } = await import('@shared/schema');
    
    const [collaboration] = await db
      .select()
      .from(tripCollaborators)
      .where(
        and(
          eq(tripCollaborators.user_id, userId),
          eq(tripCollaborators.trip_id, tripId),
          eq(tripCollaborators.status, 'accepted')
        )
      );

    return !!collaboration;
  } catch (error) {
    console.error('Error checking trip collaboration:', error);
    return false;
  }
}

/**
 * Enhanced trip access checking with organization roles
 */
function canAccessTripWithRole(
  userRole: OrganizationRole,
  isOwnTrip: boolean,
  isCollaborator: boolean,
  action: 'view' | 'edit' | 'delete',
  permissions: OrganizationPermissions
): boolean {
  switch (action) {
    case 'view':
      return permissions.viewAllTrips || isOwnTrip || isCollaborator;
    
    case 'edit':
      if (isOwnTrip && permissions.editOwnTrips) return true;
      if (permissions.editAllTrips) return true;
      return isCollaborator; // Trip collaborators can edit
    
    case 'delete':
      if (isOwnTrip && permissions.deleteOwnTrips) return true;
      return permissions.deleteAllTrips;
    
    default:
      return false;
  }
}