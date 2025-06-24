// Database schema types - Shared between client and server

export type UserRole = 'admin' | 'manager' | 'member' | 'guest';
export type OrganizationPlan = 'free' | 'pro' | 'enterprise';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: UserRole;
  organizationId: string;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: OrganizationPlan;
  isActive: boolean;
  billingEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Trip {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  createdById: string;
  organizationId: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TripMember {
  id: string;
  tripId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
  updatedAt: Date;
}

// Add more types as needed for your application

// Database enums
export const UserRoles: UserRole[] = ['admin', 'manager', 'member', 'guest'];
export const OrganizationPlans: OrganizationPlan[] = ['free', 'pro', 'enterprise'];

// Type guards
export function isUserRole(role: string): role is UserRole {
  return UserRoles.includes(role as UserRole);
}

export function isOrganizationPlan(plan: string): plan is OrganizationPlan {
  return OrganizationPlans.includes(plan as OrganizationPlan);
}
