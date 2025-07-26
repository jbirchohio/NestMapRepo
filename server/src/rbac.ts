import { Request, Response, NextFunction } from 'express';
import { getDatabase } from './db/connection';
import { users, tripCollaborators, trips } from './db/schema';
import { eq, and } from './utils/drizzle-shim';

const db = getDatabase();

// Define role constants
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin', 
  MANAGER: 'manager',
  USER: 'member',
  GUEST: 'guest'
} as const;

export const TRIP_ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor', 
  VIEWER: 'viewer',
  COMMENTER: 'commenter'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
export type TripRole = typeof TRIP_ROLES[keyof typeof TRIP_ROLES];

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
  id: string;
  authId: string;
  username: string;
  email: string;
  role: UserRole;
  organizationId?: string;
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
  return rolePermissions.includes(permission as any);
}

// Get user's role for a specific trip
export async function getUserTripRole(userId: string, tripId: number): Promise<TripRole | null> {
  try {
    // Check if user owns the trip (implicit admin role)
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, tripId));

    if (trip && trip.userId === userId) {
      return TRIP_ROLES.ADMIN;
    }

    // Check collaborator role
    const [collaborator] = await db
      .select()
      .from(tripCollaborators)
      .where(
        and(
          eq(tripCollaborators.tripId, tripId),
          eq(tripCollaborators.userId, userId),
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
      .where(eq(users.authId, authId));

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      authId: user.authId,
      username: user.username,
      email: user.email,
      role: (user.role as UserRole) || USER_ROLES.USER,
      organizationId: user.organizationId || undefined,
    };
  } catch (error) {
    console.error('Error getting user with role:', error);
    return null;
  }
}

// Check if user can access trip (any level of access)
export async function canAccessTrip(userId: string, tripId: number): Promise<boolean> {
  const tripRole = await getUserTripRole(userId, tripId);
  return tripRole !== null;
}

// Get all trips user has access to with their roles
export async function getUserTripsWithRoles(userId: string) {
  try {
    // Get trips user owns
    const ownedTrips = await db
      .select({
        ...trips,
        userRole: 'admin' as const,
      })
      .from(trips)
      .where(eq(trips.userId, userId));

    // Get trips user collaborates on  
    const collaboratedTrips = await db
      .select({
        id: trips.id,
        title: trips.title,
        userRole: tripCollaborators.role,
      })
      .from(trips)
      .innerJoin(tripCollaborators, eq(trips.id, tripCollaborators.tripId))
      .where(
        and(
          eq(tripCollaborators.userId, userId),
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



