import { Request, Response, NextFunction } from 'express.js';
import { db } from './db-connection.js';
import { users, tripCollaborators, trips } from '@shared/schema.js';
import { eq, and } from 'drizzle-orm.js';
import { USER_ROLES, TRIP_ROLES, type UserRole, type TripRole } from '@shared/schema.js';

// Permission definitions
export const PERMISSIONS = {
  // System-wide permissions
  MANAGE_USERS: 'manage_users',
  MANAGE_ORGANIZATIONS: 'manage_organizations',
  VIEW_ANALYTICS: 'view_analytics',
  EXPORT_DATA: 'export_data',
  
  // Trip-level permissions
  VIEW_TRIP: 'view_trip',
  EDIT_TRIP: 'edit_trip',
  DELETE_TRIP: 'delete_trip',
  MANAGE_COLLABORATORS: 'manage_collaborators',
  ADD_ACTIVITIES: 'add_activities',
  EDIT_ACTIVITIES: 'edit_activities',
  DELETE_ACTIVITIES: 'delete_activities',
  ADD_NOTES: 'add_notes',
  EDIT_NOTES: 'edit_notes',
  EXPORT_TRIP: 'export_trip',
} as const;

// Role-based permission mapping
export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_ORGANIZATIONS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.EXPORT_DATA,
  ],
  [USER_ROLES.MANAGER]: [
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.EXPORT_DATA,
  ],
  [USER_ROLES.USER]: [],
  [USER_ROLES.GUEST]: [],
};

export const TRIP_ROLE_PERMISSIONS = {
  [TRIP_ROLES.ADMIN]: [
    PERMISSIONS.VIEW_TRIP,
    PERMISSIONS.EDIT_TRIP,
    PERMISSIONS.DELETE_TRIP,
    PERMISSIONS.MANAGE_COLLABORATORS,
    PERMISSIONS.ADD_ACTIVITIES,
    PERMISSIONS.EDIT_ACTIVITIES,
    PERMISSIONS.DELETE_ACTIVITIES,
    PERMISSIONS.ADD_NOTES,
    PERMISSIONS.EDIT_NOTES,
    PERMISSIONS.EXPORT_TRIP,
  ],
  [TRIP_ROLES.EDITOR]: [
    PERMISSIONS.VIEW_TRIP,
    PERMISSIONS.EDIT_TRIP,
    PERMISSIONS.ADD_ACTIVITIES,
    PERMISSIONS.EDIT_ACTIVITIES,
    PERMISSIONS.ADD_NOTES,
    PERMISSIONS.EDIT_NOTES,
    PERMISSIONS.EXPORT_TRIP,
  ],
  [TRIP_ROLES.VIEWER]: [
    PERMISSIONS.VIEW_TRIP,
    PERMISSIONS.EXPORT_TRIP,
  ],
  [TRIP_ROLES.COMMENTER]: [
    PERMISSIONS.VIEW_TRIP,
    PERMISSIONS.ADD_NOTES,
  ],
};

export interface AuthenticatedUser {
  id: number;
  auth_id: string;
  username: string;
  email: string;
  role: UserRole;
  organization_id?: number;
}

export interface UserWithTripRole extends AuthenticatedUser {
  tripRole?: TripRole;
}

// Check if user has system-wide permission
export function hasSystemPermission(user: AuthenticatedUser, permission: string): boolean {
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return userPermissions.includes(permission);
}

// Check if user has trip-level permission
export function hasTripPermission(tripRole: TripRole, permission: string): boolean {
  const rolePermissions = TRIP_ROLE_PERMISSIONS[tripRole] || [];
  return rolePermissions.includes(permission);
}

// Get user's role for a specific trip
export async function getUserTripRole(userId: number, tripId: number): Promise<TripRole | null> {
  try {
    // Check if user owns the trip (implicit admin role)
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, tripId));

    if (trip && trip.user_id === userId) {
      return TRIP_ROLES.ADMIN;
    }

    // Check collaborator role
    const [collaborator] = await db
      .select()
      .from(tripCollaborators)
      .where(
        and(
          eq(tripCollaborators.trip_id, tripId),
          eq(tripCollaborators.user_id, userId),
          eq(tripCollaborators.status, 'accepted')
        )
      );

    return collaborator?.role as TripRole || null;
  } catch (error) {
    console.error('Error getting user trip role:', error);
    return null;
  }
}

// Middleware to check system permissions
export function requireSystemPermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as AuthenticatedUser;
    
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!hasSystemPermission(user, permission)) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        required: permission,
        userRole: user.role
      });
    }

    next();
  };
}

// Middleware to check trip permissions
export function requireTripPermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as AuthenticatedUser;
    const tripId = parseInt(req.params.id || req.body.trip_id);
    
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!tripId) {
      return res.status(400).json({ message: 'Trip ID required' });
    }

    try {
      const tripRole = await getUserTripRole(user.id, tripId);
      
      if (!tripRole) {
        return res.status(404).json({ message: 'Trip not found or access denied' });
      }

      if (!hasTripPermission(tripRole, permission)) {
        return res.status(403).json({ 
          message: 'Insufficient trip permissions',
          required: permission,
          userRole: tripRole
        });
      }

      // Add trip role to request for use in handlers
      (req.user as UserWithTripRole).tripRole = tripRole;
      next();
    } catch (error) {
      console.error('Error checking trip permission:', error);
      res.status(500).json({ message: 'Permission check failed' });
    }
  };
}

// Utility function to get user with role info
export async function getUserWithRole(authId: string): Promise<AuthenticatedUser | null> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.auth_id, authId));

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      auth_id: user.auth_id,
      username: user.username,
      email: user.email,
      role: (user.role as UserRole) || USER_ROLES.USER,
      organization_id: user.organization_id || undefined,
    };
  } catch (error) {
    console.error('Error getting user with role:', error);
    return null;
  }
}

// Check if user can access trip (any level of access)
export async function canAccessTrip(userId: number, tripId: number): Promise<boolean> {
  const tripRole = await getUserTripRole(userId, tripId);
  return tripRole !== null;
}

// Get all trips user has access to with their roles
export async function getUserTripsWithRoles(userId: number) {
  try {
    // Get trips user owns
    const ownedTrips = await db
      .select({
        ...trips,
        userRole: 'admin' as const,
      })
      .from(trips)
      .where(eq(trips.user_id, userId));

    // Get trips user collaborates on
    const collaboratedTrips = await db
      .select({
        ...trips,
        userRole: tripCollaborators.role,
      })
      .from(trips)
      .innerJoin(tripCollaborators, eq(trips.id, tripCollaborators.trip_id))
      .where(
        and(
          eq(tripCollaborators.user_id, userId),
          eq(tripCollaborators.status, 'accepted')
        )
      );

    return [...ownedTrips, ...collaboratedTrips];
  } catch (error) {
    console.error('Error getting user trips with roles:', error);
    return [];
  }
}

export default {
  PERMISSIONS,
  hasSystemPermission,
  hasTripPermission,
  getUserTripRole,
  requireSystemPermission,
  requireTripPermission,
  getUserWithRole,
  canAccessTrip,
  getUserTripsWithRoles,
};