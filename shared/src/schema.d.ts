export interface BaseEntity {
    id: string;
    createdAt?: string;
    updatedAt?: string;
}
export interface NewUser extends Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'emailVerified' | 'refreshTokens'> {
    password: string;
}
export interface NewTrip extends Omit<Trip, 'id' | 'createdAt' | 'updatedAt' | 'shareCode' | 'sharingEnabled' | 'completed' | 'completedAt'> {
}
export interface TripTraveler extends BaseEntity {
    id: string;
    tripId: string;
    userId: string;
    role: string;
    status: 'pending' | 'accepted' | 'declined' | 'removed';
    createdAt: string;
    updatedAt: string;
}
export interface NewTripTraveler {
    tripId: string;
    userId: string;
    role: string;
    status?: 'pending' | 'accepted' | 'declined' | 'removed';
}
export declare const USER_ROLES: {
    readonly SUPERADMIN_OWNER: "superadmin_owner";
    readonly SUPERADMIN_STAFF: "superadmin_staff";
    readonly SUPERADMIN_AUDITOR: "superadmin_auditor";
    readonly ADMIN: "admin";
    readonly MANAGER: "manager";
    readonly MEMBER: "member";
    readonly USER: "user";
    readonly GUEST: "guest";
};
export declare const TRIP_ROLES: {
    readonly ADMIN: "admin";
    readonly EDITOR: "editor";
    readonly VIEWER: "viewer";
    readonly COMMENTER: "commenter";
};
export declare const ORGANIZATION_PLANS: {
    readonly FREE: "free";
    readonly TEAM: "team";
    readonly PRO: "pro";
    readonly ENTERPRISE: "enterprise";
};
export declare const ORGANIZATION_PERMISSIONS: {
    readonly VIEW_ALL_TRIPS: "view_all_trips";
    readonly EDIT_ALL_TRIPS: "edit_all_trips";
    readonly CREATE_TRIPS: "create_trips";
    readonly DELETE_TRIPS: "delete_trips";
    readonly INVITE_MEMBERS: "invite_members";
    readonly MANAGE_MEMBERS: "manage_members";
    readonly VIEW_MEMBERS: "view_members";
    readonly MANAGE_BUDGETS: "manage_budgets";
    readonly EXPORT_DATA: "export_data";
    readonly ACCESS_ANALYTICS: "access_analytics";
    readonly MANAGE_ORGANIZATION: "manage_organization";
    readonly BILLING_ACCESS: "billing_access";
};
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
export type TripRole = typeof TRIP_ROLES[keyof typeof TRIP_ROLES];
export type OrganizationPlan = typeof ORGANIZATION_PLANS[keyof typeof ORGANIZATION_PLANS];
export interface User extends BaseEntity {
    email: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    role: UserRole;
    organizationId: string | null;
    isActive: boolean;
    lastLogin?: string | null;
    avatarUrl?: string | null;
    phoneNumber?: string | null;
    timezone?: string | null;
    emailVerified: boolean;
    emailVerificationToken?: string | null;
    emailVerificationExpires?: string | null;
    passwordResetToken?: string | null;
    passwordResetExpires?: string | null;
    refreshTokens?: string[];
}
export interface Trip extends BaseEntity {
    title: string;
    startDate: string;
    endDate: string;
    userId: string;
    organizationId: string;
    collaborators?: Record<string, string>;
    isPublic: boolean;
    shareCode?: string;
    sharingEnabled: boolean;
    sharePermission: 'view' | 'edit' | 'admin';
    city?: string;
    country?: string;
    location?: string;
    cityLatitude?: number;
    cityLongitude?: number;
    hotel?: string;
    hotelLatitude?: number;
    hotelLongitude?: number;
    completed: boolean;
    completedAt?: string | null;
    tripType?: string;
    clientName?: string;
    projectType?: string;
    budget?: number;
}
export interface NewTrip extends Omit<Trip, 'id' | 'createdAt' | 'updatedAt' | 'shareCode' | 'sharingEnabled' | 'completed' | 'completedAt'> {
}
export interface Activity extends BaseEntity {
    tripId: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
    locationName?: string;
    latitude?: number;
    longitude?: number;
    type: string;
    status: 'pending' | 'confirmed' | 'cancelled';
    notes?: string;
    cost?: number;
    currency?: string;
    bookingReference?: string;
    attachments?: string[];
    organizationId?: string;
    date?: string;
    time?: string;
    tag?: string;
    assignedTo?: string[];
    order?: number;
    travelMode?: string;
    completed?: boolean;
}
export declare function transformTripToFrontend(trip: Trip): {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    userId: string;
    organizationId: string;
    collaborators: Record<string, string> | undefined;
    isPublic: boolean;
    shareCode: string | undefined;
    sharingEnabled: boolean;
    sharePermission: "view" | "admin" | "edit";
    city: string | undefined;
    country: string | undefined;
    location: string | undefined;
    cityLatitude: number | undefined;
    cityLongitude: number | undefined;
    hotel: string | undefined;
    hotelLatitude: number | undefined;
    hotelLongitude: number | undefined;
    completed: boolean;
    completedAt: string | null | undefined;
    tripType: string | undefined;
    clientName: string | undefined;
    projectType: string | undefined;
    budget: number | undefined;
    createdAt: string | undefined;
    updatedAt: string | undefined;
};
export declare function transformActivityToFrontend(activity: Activity): {
    id: string;
    tripId: string;
    organizationId: string | undefined;
    title: string;
    date: string | undefined;
    time: string | undefined;
    locationName: string | undefined;
    latitude: number | undefined;
    longitude: number | undefined;
    notes: string | undefined;
    tag: string | undefined;
    assignedTo: string[] | undefined;
    order: number | undefined;
    travelMode: string | undefined;
    completed: boolean | undefined;
};
//# sourceMappingURL=schema.d.ts.map