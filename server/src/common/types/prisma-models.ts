// This file provides TypeScript types that map to our Prisma models
// It serves as a bridge between Prisma's generated types and our application

import { User, UserRole, UserStatus } from '@prisma/client';

// Re-export Prisma enums
export { UserRole, UserStatus };

// User type that matches our Prisma model
export interface PrismaUser extends Omit<User, 'passwordHash' | 'mfaSecret' | 'passwordResetToken'> {
  // Add any custom methods or computed properties here
  fullName?: string;
}

// Type for user creation (excludes auto-generated fields)
export type CreateUserInput = Omit<
  User,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'lastLoginAt' | 'lastActiveAt' | 'tokenVersion'
> & {
  // Make required fields explicitly required
  email: string;
  passwordHash: string;
  role: UserRole;
};

// Type for user updates
export type UpdateUserInput = Partial<CreateUserInput> & {
  id: string;
};

// Session types
export interface UserSession {
  id: string;
  userId: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt: Date;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  createdAt: Date;
  updatedAt: Date;
}

// User settings types
export interface UserSetting {
  id: string;
  userId: string;
  timezone?: string | null;
  locale?: string | null;
  theme?: string | null;
  emailNotifications: string;
  pushNotifications: string;
  createdAt: Date;
  updatedAt: Date;
}

// User activity log types
export interface UserActivityLog {
  id: string;
  userId: string;
  action: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// Organization types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  website?: string | null;
  industry?: string | null;
  size?: string | null;
  metadata: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// Helper types for pagination
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Type for JWT payload
export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: UserRole;
  orgId?: string;
  iat?: number;
  exp?: number;
}

// Type for authenticated request
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    orgId?: string;
  };
  token?: string;
}
