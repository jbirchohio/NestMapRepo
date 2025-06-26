/**
 * User-related type definitions
 * This file re-exports types from auth/user.ts and provides namespace augmentation
 */

// Re-export core user types from auth/user.ts
export {
  BaseUser,
  AuthUser,
  UserProfile,
  User,
  User as UserType,
  UserSettings,
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  ChangePasswordDto,
  UserListParams,
  UserProfileResponse,
  UserStats,
  UserActivity
} from '../auth/user.js';

// Re-export UserRole from permissions
import { UserRole } from '../.../auth/permissions.js';
export { UserRole };

// Extend the global SharedTypes namespace with additional types
declare global {
  namespace SharedTypes {
    // Re-export all user types for backward compatibility
    export {
      BaseUser,
      AuthUser,
      UserProfile,
      User,
      User as UserType,
      UserSettings,
      CreateUserDto,
      UpdateUserDto,
      LoginDto,
      RequestPasswordResetDto,
      ResetPasswordDto,
      ChangePasswordDto,
      UserListParams,
      UserProfileResponse,
      UserStats,
      UserActivity
    } from '@shared/types/auth/user.js';

    // Export UserRole
    export { UserRole };

    // Additional type augmentations can go here
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

    // User status type
    type UserStatus = 'active' | 'inactive' | 'suspended' | 'invited';

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
}
