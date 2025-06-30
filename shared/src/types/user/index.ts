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
  /** Unique identifier for the user */
  id: string;
  
  /** User's email address */
  email: string;
  
  /** User's first name */
  firstName?: string;
  
  /** User's last name */
  lastName?: string;
  
  /** URL to user's avatar image */
  avatar?: string;
  
  /** User's role in the system */
  role: UserRole;
  
  /** Whether the user's email has been verified */
  emailVerified: boolean;
  
  /** When the user account was created (ISO string) */
  createdAt: string;
  
  /** When the user account was last updated (ISO string) */
  updatedAt: string;
  
  /** When the user last logged in (ISO string) */
  lastLogin?: string;
  
  /** User preferences and settings */
  preferences?: UserPreferences;
}

/**
 * Schema for validating user data
 */
export const userSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().optional(),
    organizationId: z.string().uuid('Invalid organization ID format').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
  role: z.enum(['user', 'admin', 'moderator', 'superadmin', 'superAdmin', 'manager', 'member', 'guest']),
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
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
  email: string;
  firstName?: string;
  lastName?: string;
  password: string;
  role?: UserRole;
}

/**
 * Schema for validating user creation data
 */
export const createUserSchema = userSchema.pick({
  email: true,
  firstName: true,
  lastName: true,
}).extend({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['user', 'admin', 'moderator']).optional().default('user'),
});

/**
 * Type for user update data
 */
export type UpdateUserData = Partial<Omit<CreateUserData, 'password'>> & {
  currentPassword?: string;
  newPassword?: string;
};

/**
 * Type guard to check if an object is a valid User
 */
export function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj &&
    'role' in obj &&
    'emailVerified' in obj &&
    'createdAt' in obj &&
    'updatedAt' in obj
  );
}

/**
 * Type guard to check if an object is a valid UserRole
 */
export function isUserRole(role: unknown): role is UserRole {
  return (
    typeof role === 'string' &&
    [
      'user',
      'admin',
      'moderator',
      'superadmin',
      'superAdmin',  // Using camelCase
      'super_admin',  // Keeping for backward compatibility
      'manager',
      'member',
      'guest',
    ].includes(role)
  );
}
