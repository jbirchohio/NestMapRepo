import { z } from 'zod';

/**
 * User roles in the application
 */
// Support legacy roles while keeping the newer ones
/**
 * User roles in the application
 * Uses camelCase to follow TypeScript/JavaScript conventions
 */
export type UserRole =
  | 'user'
  | 'admin'
  | 'moderator'
  | 'superadmin'  // Legacy alias for superAdmin
  | 'superAdmin'  // Preferred camelCase
  | 'manager'
  | 'member'
  | 'guest';

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  /** Whether email notifications are enabled */
  email?: boolean;
  
  /** Whether push notifications are enabled */
  push?: boolean;
  
  /** Whether in-app notifications are enabled */
  inApp?: boolean;
  
  /** Additional notification preferences */
  [key: string]: unknown;
}

/**
 * User theme preference
 */
export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * User preferences
 */
export interface UserPreferences {
  /** User's preferred theme */
  theme?: ThemePreference;
  
  /** Notification preferences */
  notifications?: NotificationPreferences;
  
  /** Additional preferences */
  [key: string]: unknown;
}

/**
 * Base user interface containing all common fields
 * This should be used as the source of truth for user-related types
 */
export interface User {
  /** Unique numeric identifier for the user */
  id: number;
  
  /** Authentication provider's user ID */
  auth_id: string;
  
  /** User's username */
  username: string;
  
  /** User's email address */
  email: string;
  
  /** User's display name */
  display_name?: string;
  
  /** URL to user's avatar image */
  avatar_url?: string;
  
  /** User's role in the system */
  role: UserRole;
  
  /** Organization ID the user belongs to */
  organization_id?: number;
  
  /** User's company name */
  company?: string;
  
  /** User's job title */
  job_title?: string;
  
  /** Size of the user's team */
  team_size?: string;
  
  /** Primary use case for the application */
  use_case?: string;
  
  /** When the user account was created */
  created_at: Date;
  
  /** User preferences and settings */
  preferences?: UserPreferences;
  
  // Legacy fields for backward compatibility
  /** @deprecated Use display_name instead */
  firstName?: string;
  
  /** @deprecated Use display_name instead */
  lastName?: string;
  
  /** @deprecated Use avatar_url instead */
  avatar?: string;
  
  /** @deprecated Use created_at instead */
  emailVerified?: boolean;
  
  /** @deprecated Use created_at instead */
  createdAt?: string;
  
  /** @deprecated Use created_at instead */
  updatedAt?: string;
  
  /** @deprecated Use last_login from the database if needed */
  lastLogin?: string;
}

/**
 * Schema for validating user data
 */
export const userSchema = z.object({
  id: z.number({ invalid_type_error: 'User ID must be a number' }),
  auth_id: z.string({ required_error: 'Auth ID is required' }),
  username: z.string({ required_error: 'Username is required' }),
  email: z.string().email('Invalid email address'),
  display_name: z.string().optional(),
  // Legacy fields for backward compatibility
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  organization_id: z.number().optional(),
  avatar_url: z.string().url('Invalid avatar URL').optional(),
  role: z.enum([
    'user',
    'admin',
    'moderator',
    'superadmin',
    'superAdmin',
    'manager',
    'member',
    'guest'
  ]),
  company: z.string().optional(),
  job_title: z.string().optional(),
  team_size: z.string().optional(),
  use_case: z.string().optional(),
  created_at: z.date({ required_error: 'Creation date is required' }),
  // Legacy fields for backward compatibility
  emailVerified: z.boolean().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  lastLogin: z.string().datetime().optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    notifications: z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      inApp: z.boolean().optional(),
    }).optional(),
  }).optional(),
});

/**
 * Type for user creation data
 */
export interface CreateUserData {
  username: string;
  email: string;
  display_name?: string;
  auth_id: string;
  role?: UserRole;
  organization_id?: number;
  company?: string;
  job_title?: string;
  team_size?: string;
  use_case?: string;
  // Legacy fields
  firstName?: string;
  lastName?: string;
  avatar_url?: string;
}

/**
 * Schema for validating user creation data
 */
export const createUserSchema = z.object({
  username: z.string({ required_error: 'Username is required' }),
  email: z.string().email('Invalid email address'),
  display_name: z.string().optional(),
  auth_id: z.string({ required_error: 'Auth ID is required' }),
  role: z.enum([
    'user',
    'admin',
    'moderator',
    'superadmin',
    'superAdmin',
    'manager',
    'member',
    'guest'
  ]).default('user'),
  organization_id: z.number().optional(),
  company: z.string().optional(),
  job_title: z.string().optional(),
  team_size: z.string().optional(),
  use_case: z.string().optional(),
  // Legacy fields
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar_url: z.string().url('Invalid avatar URL').optional(),
});

/**
 * Schema for validating user update data
 */
export const updateUserSchema = z.object({
  display_name: z.string().optional(),
  company: z.string().optional(),
  job_title: z.string().optional(),
  team_size: z.string().optional(),
  use_case: z.string().optional(),
  avatar_url: z.string().url('Invalid avatar URL').optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    notifications: z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      inApp: z.boolean().optional(),
    }).optional(),
  }).optional(),
  // Password update fields
  currentPassword: z.string().min(8, 'Current password is required').optional(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').optional(),
  // Legacy fields
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

/**
 * Type for user update data
 */
export interface UpdateUserData {
  display_name?: string;
  company?: string;
  job_title?: string;
  team_size?: string;
  use_case?: string;
  avatar_url?: string;
  preferences?: UserPreferences;
  currentPassword?: string;
  newPassword?: string;
  // Legacy fields
  firstName?: string;
  lastName?: string;
}

/**
 * Type guard to check if an object is a valid User
 */
export function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'auth_id' in obj &&
    'username' in obj &&
    'email' in obj &&
    'role' in obj &&
    'created_at' in obj &&
    isUserRole((obj as User).role)
  );
}

/**
 * Type guard to check if an object is a valid UserRole
 */
export function isUserRole(role: unknown): role is UserRole {
  return typeof role === 'string' && [
    'user',
    'admin',
    'moderator',
    'superadmin',
    'superAdmin',
    'manager',
    'member',
    'guest'
  ].includes(role);
}
