import type { User as DbUser } from '../../../../db/schema.js';

export type UserRole = 'admin' | 'manager' | 'member' | 'guest';

export interface User extends Omit<DbUser, 'role' | 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'settings'> {
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  settings: UserSettings | null;
}

export interface UserCreateInput {
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  role?: UserRole;
  organizationId?: string | null;
  emailVerified?: boolean;
  isActive?: boolean;
  settings?: UserSettings;
}

export interface UserUpdateInput {
  email?: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role?: UserRole;
  organizationId?: string | null;
  emailVerified?: boolean;
  isActive?: boolean;
  settings?: UserSettings;
  lastLoginAt?: Date | null;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  organizationId: string | null;
  emailVerified: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
  timezone: string;
  locale: string;
  settings: UserSettings;
  isSuspended: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    defaultView?: string;
    timeFormat?: '12h' | '24h';
    dateFormat?: string;
    weekStartsOn?: number;
  };
  privacy?: {
    profileVisibility?: 'public' | 'private' | 'connections';
    activityFeed?: boolean;
    locationSharing?: boolean;
  };
  security?: {
    twoFactorEnabled?: boolean;
    loginAlerts?: boolean;
    suspiciousActivityAlerts?: boolean;
  };
}

export interface UserStats {
  totalTrips: number;
  upcomingTrips: number;
  pastTrips: number;
  totalExpenses: number;
  averageExpense: number;
  favoriteDestination: string | null;
  mostUsedAirline: string | null;
  mostUsedHotel: string | null;
  tripsByMonth: Array<{ month: string; count: number }>;
  expensesByCategory: Record<string, number>;
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface UserListParams {
  search?: string;
  role?: UserRole;
  organizationId?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeInactive?: boolean;
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}
