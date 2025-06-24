/**
 * User-related type definitions
 * This serves as the single source of truth for user-related types
 */

import { UserRole } from './permissions.js';

/**
 * Base user interface with common fields
 */
export interface BaseUser {
  /** Unique user identifier */
  id: string;
  /** User's email address (unique) */
  email: string;
  /** User's display name */
  display_name: string;
  /** User's role in the system */
  role: UserRole;
  /** ID of the organization the user belongs to */
  organization_id: string | null;
  /** Whether the user's email has been verified */
  email_verified: boolean;
  /** When the user was created (ISO timestamp) */
  created_at: string;
  /** When the user was last updated (ISO timestamp) */
  updated_at: string;
}

/**
 * Extended user information including authentication details
 */
export interface AuthUser extends BaseUser {
  /** User's permissions */
  permissions: string[];
  /** When the user last logged in (ISO timestamp) */
  last_login_at?: string;
  /** IP address of the user's last login */
  last_login_ip?: string;
  /** Whether the user is currently active */
  is_active: boolean;
  /** When the user was deactivated (if applicable) */
  deactivated_at?: string | null;
}

/**
 * User profile information
 */
export interface UserProfile {
  /** User's first name */
  first_name: string | null;
  /** User's last name */
  last_name: string | null;
  /** URL to the user's avatar image */
  avatar_url: string | null;
  /** User's phone number */
  phone_number: string | null;
  /** User's preferred timezone */
  timezone: string | null;
  /** User's preferred locale */
  locale: string | null;
}

/**
 * User type that combines all user-related interfaces
 */
export type User = BaseUser & Partial<UserProfile> & Partial<UserSettings>;

// Export BaseUser as the default User type for backward compatibility
export type { User as UserType };

/**
 * User settings
 */
export interface UserSettings {
  /** User's notification preferences */
  notifications: {
    /** Whether to receive email notifications */
    email: boolean;
    /** Whether to receive push notifications */
    push: boolean;
    /** Whether to receive SMS notifications */
    sms: boolean;
  };
  /** User's UI preferences */
  preferences: {
    /** Preferred theme */
    theme: 'light' | 'dark' | 'system';
    /** Default view for lists */
    default_view: 'list' | 'grid' | 'calendar';
    /** Whether to show onboarding tips */
    show_onboarding: boolean;
  };
  /** User's privacy settings */
  privacy: {
    /** Whether to show email to other users */
    show_email: boolean;
    /** Whether to show last seen status */
    show_last_seen: boolean;
  };
}

/**
 * User creation DTO
 */
export interface CreateUserDto {
  /** User's email address */
  email: string;
  /** User's password */
  password: string;
  /** User's first name */
  first_name?: string;
  /** User's last name */
  last_name?: string;
  /** User's display name (defaults to first + last name) */
  display_name?: string;
  /** User's role (defaults to 'member') */
  role?: UserRole;
  /** Organization ID (required for non-admin users) */
  organization_id?: string;
  /** Whether to send welcome email (defaults to true) */
  send_welcome_email?: boolean;
}

/**
 * User update DTO
 */
export type UpdateUserDto = Partial<Omit<CreateUserDto, 'email' | 'password'>> & {
  /** Whether the user is active */
  is_active?: boolean;
  /** Whether to send email notification for the update */
  send_notification?: boolean;
};

/**
 * User login DTO
 */
export interface LoginDto {
  /** User's email address */
  email: string;
  /** User's password */
  password: string;
  /** Whether to remember the user (longer session) */
  remember_me?: boolean;
  /** OTP code if 2FA is enabled */
  otp_code?: string;
}

/**
 * Password reset request DTO
 */
export interface RequestPasswordResetDto {
  /** User's email address */
  email: string;
  /** Reset URL (for email template) */
  reset_url?: string;
}

/**
 * Password reset confirmation DTO
 */
export interface ResetPasswordDto {
  /** Reset token */
  token: string;
  /** New password */
  new_password: string;
  /** Confirm new password */
  confirm_password: string;
}

/**
 * Change password DTO
 */
export interface ChangePasswordDto {
  /** Current password */
  current_password: string;
  /** New password */
  new_password: string;
  /** Confirm new password */
  confirm_password: string;
}
