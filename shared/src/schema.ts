// Define base interfaces
export interface BaseEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NewUser extends Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'emailVerified' | 'refreshTokens'> {
  password: string;
}

export interface NewTrip extends Omit<Trip, 'id' | 'createdAt' | 'updatedAt' | 'shareCode' | 'sharingEnabled' | 'completed' | 'completedAt'> {}

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

export const USER_ROLES = {
  SUPERADMIN_OWNER: 'superadmin_owner',
  SUPERADMIN_STAFF: 'superadmin_staff',
  SUPERADMIN_AUDITOR: 'superadmin_auditor',
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member',
  USER: 'user',
  GUEST: 'guest',
} as const;

export const TRIP_ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
  COMMENTER: 'commenter',
} as const;

export const ORGANIZATION_PLANS = {
  FREE: 'free',
  TEAM: 'team',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

export const ORGANIZATION_PERMISSIONS = {
  VIEW_ALL_TRIPS: 'view_all_trips',
  EDIT_ALL_TRIPS: 'edit_all_trips',
  CREATE_TRIPS: 'create_trips',
  DELETE_TRIPS: 'delete_trips',
  INVITE_MEMBERS: 'invite_members',
  MANAGE_MEMBERS: 'manage_members',
  VIEW_MEMBERS: 'view_members',
  MANAGE_BUDGETS: 'manage_budgets',
  EXPORT_DATA: 'export_data',
  ACCESS_ANALYTICS: 'access_analytics',
  MANAGE_ORGANIZATION: 'manage_organization',
  BILLING_ACCESS: 'billing_access',
} as const;

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

export interface NewTrip extends Omit<Trip, 'id' | 'createdAt' | 'updatedAt' | 'shareCode' | 'sharingEnabled' | 'completed' | 'completedAt'> {}

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

export function transformTripToFrontend(trip: Trip) {
  return {
    id: trip.id,
    title: trip.title,
    startDate: trip.startDate,
    endDate: trip.endDate,
    userId: trip.userId,
    organizationId: trip.organizationId,
    collaborators: trip.collaborators,
    isPublic: trip.isPublic,
    shareCode: trip.shareCode,
    sharingEnabled: trip.sharingEnabled,
    sharePermission: trip.sharePermission,
    city: trip.city,
    country: trip.country,
    location: trip.location,
    cityLatitude: trip.cityLatitude,
    cityLongitude: trip.cityLongitude,
    hotel: trip.hotel,
    hotelLatitude: trip.hotelLatitude,
    hotelLongitude: trip.hotelLongitude,
    completed: trip.completed,
    completedAt: trip.completedAt,
    tripType: trip.tripType,
    clientName: trip.clientName,
    projectType: trip.projectType,
    budget: trip.budget,
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
  };
}

export function transformActivityToFrontend(activity: Activity) {
  return {
    id: activity.id,
    tripId: activity.tripId,
    organizationId: activity.organizationId,
    title: activity.title,
    date: activity.date,
    time: activity.time,
    locationName: activity.locationName,
    latitude: activity.latitude,
    longitude: activity.longitude,
    notes: activity.notes,
    tag: activity.tag,
    assignedTo: activity.assignedTo,
    order: activity.order,
    travelMode: activity.travelMode,
    completed: activity.completed,
  };
}
