// Re-export types from shared location
// This file is maintained for backward compatibility
// New code should import directly from '@shared/schema/types/user'

export {
  type User,
  type UserRole,
  type UserPreferences,
  type NotificationPreferences,
  type ThemePreference,
  type CreateUserData,
  type UpdateUserData,
  userSchema,
  createUserSchema,
  isUser,
  isUserRole
} from '@shared/schema/types/user';

// Note: The following types are kept for backward compatibility
// but should be considered deprecated. Use the ones from @shared/schema/types/user instead

declare module '@shared/schema/types/user' {
  export interface User {
    // This ensures compatibility with existing code
    [key: string]: unknown;
  }
}
