import type { Request, Response, NextFunction } from '../../express-augmentations.ts';
import prisma from './prisma';
import { User, Trip, TripCollaborator, UserRole, TripCollaboratorRole } from '@prisma/client';
// Permission definitions
export const USER_ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    MANAGER: 'manager',
    MEMBER: 'member',
    GUEST: 'guest',
} as const;

export const TRIP_ROLES = {
    OWNER: 'owner',
    EDITOR: 'editor',
    VIEWER: 'viewer',
    COMMENTER: 'commenter',
} as const;

export interface AuthenticatedUser {
    id: string;
    email: string;
    role: UserRole;
    organizationId?: string | null;
}

export interface UserWithTripRole extends AuthenticatedUser {
    tripRole?: TripCollaboratorRole | null;
}

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
    [UserRole.ADMIN]: [
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.MANAGE_ORGANIZATIONS,
        PERMISSIONS.VIEW_ANALYTICS,
        PERMISSIONS.EXPORT_DATA,
    ],
    [UserRole.MANAGER]: [
        PERMISSIONS.VIEW_ANALYTICS,
        PERMISSIONS.EXPORT_DATA,
    ],
    [UserRole.MEMBER]: [],
    [UserRole.GUEST]: [],
    [UserRole.SUPER_ADMIN]: [
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.MANAGE_ORGANIZATIONS,
        PERMISSIONS.VIEW_ANALYTICS,
        PERMISSIONS.EXPORT_DATA,
    ],
};

export const TRIP_ROLE_PERMISSIONS = {
    [TripCollaboratorRole.OWNER]: [
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
    [TripCollaboratorRole.EDITOR]: [
        PERMISSIONS.VIEW_TRIP,
        PERMISSIONS.EDIT_TRIP,
        PERMISSIONS.ADD_ACTIVITIES,
        PERMISSIONS.EDIT_ACTIVITIES,
        PERMISSIONS.ADD_NOTES,
        PERMISSIONS.EDIT_NOTES,
        PERMISSIONS.EXPORT_TRIP,
    ],
    [TripCollaboratorRole.VIEWER]: [
        PERMISSIONS.VIEW_TRIP,
        PERMISSIONS.EXPORT_TRIP,
    ],
};

export interface AuthenticatedUser {
    id: string;
    email: string;
    role: UserRole;
    organizationId?: string | null;
}
export interface UserWithTripRole extends AuthenticatedUser {
    tripRole?: TripCollaboratorRole | null;
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
export async function getUserTripRole(userId: string, tripId: string): Promise<TripCollaboratorRole | null> {
    try {
        // Check if user owns the trip (implicit admin role)
        const trip = await prisma.trip.findUnique({
            where: { id: tripId },
            select: { createdById: true },
        });
        if (trip && trip.createdById === userId) {
            return TripCollaboratorRole.OWNER;
        }
        // Check collaborator role
        const collaborator = await prisma.tripCollaborator.findUnique({
            where: {
                tripId_userId: {
                    tripId,
                    userId,
                },
                status: 'accepted',
            },
            select: { role: true },
        });
        return collaborator?.role || null;
    }
    catch (error) {
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
        }
        catch (error) {
            console.error('Error checking trip permission:', error);
            res.status(500).json({ message: 'Permission check failed' });
        }
    };
}
// Utility function to get user with role info
export async function getUserWithRole(authId: string): Promise<AuthenticatedUser | null> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: authId }, // Assuming authId is the user's ID in Prisma
        });
        if (!user) {
            return null;
        }
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationMemberships[0]?.organizationId || null, // Assuming user has one organization membership
        };
    }
    catch (error) {
        console.error('Error getting user with role:', error);
        return null;
    }
}
// Check if user can access trip (any level of access)
export async function canAccessTrip(userId: string, tripId: string): Promise<boolean> {
    const tripRole = await getUserTripRole(userId, tripId);
    return tripRole !== null;
}
// Get all trips user has access to with their roles
export async function getUserTripsWithRoles(userId: string) {
    try {
        // Get trips user owns
        const ownedTrips = await prisma.trip.findMany({
            where: { createdById: userId },
            select: {
                id: true,
                organizationId: true,
                createdById: true,
                title: true,
                description: true,
                status: true,
                startDate: true,
                endDate: true,
                timezone: true,
                location: true,
                latitude: true,
                longitude: true,
                isBusiness: true,
                isPersonal: true,
                isGroup: true,
                isPublic: true,
                metadata: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        // Get trips user collaborates on
        const collaboratedTrips = await prisma.tripCollaborator.findMany({
            where: {
                userId,
                status: 'accepted',
            },
            include: {
                trip: true,
            },
        });

        const combinedTrips = [
            ...ownedTrips.map(trip => ({ ...trip, userRole: TripCollaboratorRole.OWNER })),
            ...collaboratedTrips.map(collab => ({ ...collab.trip, userRole: collab.role })),
        ];

        // Remove duplicates based on trip ID
        const uniqueTrips = Array.from(new Map(combinedTrips.map(trip => [trip.id, trip])).values());

        return uniqueTrips;
    }
    catch (error) {
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
