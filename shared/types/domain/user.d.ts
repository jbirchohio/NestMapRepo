/**
 * User-related type definitions
 */

import type { ID, ISO8601DateTime, Nullable, Optional } from '../core/base';
import type { UserRole } from '../auth';

declare namespace SharedTypes {
  // User preferences
  interface UserPreferences {
    theme?: 'light' | 'dark' | 'system';
    language?: string;
    time_zone?: string;
    notifications?: {
      email?: boolean;
      push?: boolean;
      in_app?: boolean;
    };
  }

  // User status
  type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

  // Base user interface - represents the core user data
  interface BaseUser extends Timestamps {
    id: ID;
    email: string;
    first_name: string | null;
    last_name: string | null;
    full_name: string;
    role: UserRole;
    organization_id: ID | null;
    email_verified: boolean;
    status: UserStatus;
    last_login_at: Nullable<ISO8601DateTime>;
    avatar_url: Nullable<string>;
    preferences?: UserPreferences;
  }

  // User response - what's returned by the API
  type UserResponse = Omit<BaseUser, 'deleted_at' | 'status'> & {
    permissions: string[];
  };

  // User creation DTO
  interface CreateUserDto {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role?: UserRole;
    organization_id?: ID;
    send_welcome_email?: boolean;
  }

  // User update DTO
  interface UpdateUserDto extends Partial<Omit<CreateUserDto, 'email' | 'password'>> {
    status?: UserStatus;
    preferences?: Partial<UserPreferences>;
  }

  // Paginated user list response
  type UserListResponse = PaginatedResponse<UserResponse>;
}
