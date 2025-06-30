/**
 * @file Defines shared types and enums related to users and authentication.
 * This file is the single source of truth for user roles and public user profiles.
 */

/**
 * Defines the possible roles a user can have within the system.
 * This is the canonical list of user roles.
 */
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
  GUEST = 'guest',
}

/**
 * Represents a user's public profile.
 * This interface defines the user data that is safe to be exposed to the client.
 * It should not contain any sensitive information like passwords or tokens.
 */
export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
  emailVerified: boolean;
  isActive: boolean;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
