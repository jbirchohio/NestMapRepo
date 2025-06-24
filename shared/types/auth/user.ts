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
  /** User's status */
  status?: 'active' | 'inactive' | 'suspended' | 'invited';
  /** User's username */
  username?: string;
  /** Full name (computed from first_name + last_name) */
  full_name?: string;
  /** URL to the user's avatar */
  avatar_url?: string | null;
  /** When the user last logged in (ISO timestamp) */
  last_login_at?: string | null;
  /** User's timezone */
  timezone?: string;
  /** User's locale */
  locale?: string;
  /** User's phone number */
  phone_number?: string | null;
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
  /** User's bio/description */
  bio?: string | null;
  /** User's website */
  website?: string | null;
  /** User's social media links */
  social_links?: Record<string, string>;
}

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
    /** Whether to receive in-app notifications */
    in_app?: boolean;
  };
  /** User's UI preferences */
  preferences: {
    /** Preferred theme */
    theme: 'light' | 'dark' | 'system';
    /** Default view for lists */
    default_view: 'list' | 'grid' | 'calendar';
    /** Whether to show onboarding tips */
    show_onboarding: boolean;
    /** Time format (12h/24h) */
    time_format?: '12h' | '24h';
    /** Date format string */
    date_format?: string;
    /** First day of the week (0=Sunday, 1=Monday, etc.) */
    week_starts_on?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  };
  /** User's privacy settings */
  privacy: {
    /** Whether to show email to other users */
    show_email: boolean;
    /** Whether to show last seen status */
    show_last_seen: boolean;
    /** Profile visibility setting */
    profile_visibility?: 'public' | 'organization' | 'private';
    /** Whether to show activity feed */
    activity_feed?: boolean;
    /** Whether to share location */
    location_sharing?: boolean;
  };
  /** User's security settings */
  security?: {
    /** Whether two-factor authentication is enabled */
    two_factor_enabled?: boolean;
    /** Whether to receive login alerts */
    login_alerts?: boolean;
    /** Whether to receive suspicious activity alerts */
    suspicious_activity_alerts?: boolean;
  };
  /** User's metadata */
  metadata?: Record<string, unknown>;
}

/**
 * User type that combines all user-related interfaces
 */
export type User = BaseUser & Partial<UserProfile> & Partial<UserSettings>;

// Export User as UserType for backward compatibility
export type { User as UserType };

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
  /** User's username */
  username?: string;
  /** User's display name (defaults to first + last name) */
  display_name?: string;
  /** User's role (defaults to 'member') */
  role?: UserRole;
  /** Organization ID (required for non-admin users) */
  organization_id?: string | number;
  /** Whether to send welcome email (defaults to true) */
  send_welcome_email?: boolean;
  /** User's timezone */
  timezone?: string;
  /** User's locale */
  locale?: string;
  /** User's settings */
  settings?: Partial<UserSettings>;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * User update DTO
 */
export type UpdateUserDto = Partial<Omit<CreateUserDto, 'email' | 'password'>> & {
  /** Whether the user is active */
  is_active?: boolean;
  /** Whether to send email notification for the update */
  send_notification?: boolean;
  /** Status of the user */
  status?: 'active' | 'inactive' | 'suspended' | 'invited';
  /** When the user was last logged in */
  last_login?: Date | string | null;
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

/**
 * User list parameters for filtering and pagination
 */
export interface UserListParams {
  /** Search query */
  search?: string;
  /** Filter by role(s) */
  role?: UserRole | UserRole[];
  /** Filter by organization ID */
  organization_id?: number | string;
  /** Filter by email verification status */
  email_verified?: boolean;
  /** Filter by user status */
  status?: 'active' | 'inactive' | 'suspended' | 'invited';
  /** Field to sort by */
  sort_by?: 'name' | 'email' | 'created_at' | 'last_login' | 'role';
  /** Sort order */
  sort_order?: 'asc' | 'desc';
  /** Pagination cursor */
  cursor?: string;
  /** Number of items per page */
  limit?: number;
}

/**
 * User profile with additional data
 */
export interface UserProfileResponse extends User {
  /** List of organizations the user belongs to */
  organizations?: Array<{
    id: string;
    name: string;
    role: string;
    // Add other organization fields as needed
  }>;
  /** User statistics */
  stats?: {
    /** Number of trips */
    trips?: number;
    /** Number of activities */
    activities?: number;
    /** Number of upcoming trips */
    upcoming_trips?: number;
    /** Number of past trips */
    past_trips?: number;
    // Add other stats as needed
  };
}

/**
 * User statistics
 */
export interface UserStats {
  /** Total number of users */
  total_users: number;
  /** Number of active users */
  active_users: number;
  /** Number of new users */
  new_users: number;
  /** Number of users by role */
  users_by_role: Record<UserRole, number>;
  /** Number of users by status */
  users_by_status: {
    active: number;
    inactive: number;
    suspended: number;
    invited: number;
  };
  /** Growth rate percentage */
  growth_rate: number;
  /** When the stats were last updated */
  last_updated: Date;
}

/**
 * User activity log entry
 */
export interface UserActivity {
  /** Activity ID */
  id: string | number;
  /** Action performed */
  action: string;
  /** Type of entity affected */
  entity_type: string;
  /** ID of the affected entity */
  entity_id: string | number;
  /** When the activity occurred */
  timestamp: Date | string;
  /** IP address of the user */
  ip_address?: string;
  /** User agent string */
  user_agent?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}
