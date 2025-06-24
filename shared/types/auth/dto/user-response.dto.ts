import type { BaseUser } from '../user.js';
import type { UserRole } from '../permissions.js';

/**
 * User response DTO - represents the user data returned by the API
 * This is a flattened version of the User type with some fields renamed for client-side consistency
 */
export interface UserResponse extends Omit<BaseUser, 'display_name' | 'organization_id' | 'email_verified' | 'created_at' | 'updated_at' | 'last_login_at'> {
  /** User's role */
  role: UserRole;
  /** User's first name */
  firstName: string | null;
  /** User's last name */
  lastName: string | null;
  /** Whether the user's email has been verified */
  emailVerified: boolean;
  /** When the user was created (ISO timestamp) */
  createdAt: string;
  /** When the user was last updated (ISO timestamp) */
  updatedAt: string;
  /** When the user last logged in (ISO timestamp) */
  lastLoginAt?: string | null;
  /** User's display name */
  displayName?: string;
  /** URL to the user's avatar */
  avatarUrl?: string | null;
}
