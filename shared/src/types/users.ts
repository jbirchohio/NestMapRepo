import { BaseModel, PaginationParams, PaginatedResponse } from './base.js';
import { Organization, OrganizationMember } from './organizations.js';

export type UserRole = 'superadmin' | 'admin' | 'manager' | 'user' | 'guest';

export interface User extends BaseModel {
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  organizationId: number | null;
  organization?: Organization | null;
  organizationMember?: OrganizationMember | null;
  emailVerified: boolean;
  lastLogin: Date | null;
  timezone: string;
  locale: string;
  settings: UserSettings;
  metadata?: Record<string, unknown>;
  permissions?: string[];
}

export interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    defaultView: 'list' | 'grid' | 'calendar';
    timeFormat: '12h' | '24h';
    dateFormat: string;
    weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, etc.
  };
  privacy: {
    profileVisibility: 'public' | 'organization' | 'private';
    activityFeed: boolean;
    locationSharing: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    loginAlerts: boolean;
    suspiciousActivityAlerts: boolean;
  };
}

export interface UserCreateInput {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  organizationId?: number | null;
  timezone?: string;
  locale?: string;
  emailVerified?: boolean;
  settings?: Partial<UserSettings>;
  metadata?: Record<string, unknown>;
}

export interface UserUpdateInput {
  email?: string;
  username?: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  role?: UserRole;
  organizationId?: number | null;
  timezone?: string;
  locale?: string;
  emailVerified?: boolean;
  lastLogin?: Date | string | null;
  settings?: Partial<UserSettings>;
  metadata?: Record<string, unknown>;
}

export interface UserListParams extends PaginationParams {
  search?: string;
  role?: UserRole | UserRole[];
  organizationId?: number | string;
  emailVerified?: boolean;
  status?: 'active' | 'inactive' | 'suspended' | 'invited';
  sortBy?: 'name' | 'email' | 'createdAt' | 'lastLogin' | 'role';
  sortOrder?: 'asc' | 'desc';
}

export type UserListResponse = PaginatedResponse<User>;

export interface UserProfile extends Omit<User, 'password' | 'metadata'> {
  organizations: Organization[];
  stats: {
    trips: number;
    activities: number;
    upcomingTrips: number;
    pastTrips: number;
  };
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  usersByRole: Record<UserRole, number>;
  usersByStatus: {
    active: number;
    inactive: number;
    suspended: number;
    invited: number;
  };
  growthRate: number;
  lastUpdated: Date;
}

export interface UserActivity {
  id: string | number;
  action: string;
  entityType: string;
  entityId: string | number;
  timestamp: Date | string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}
