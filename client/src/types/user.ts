// Re-export types from shared location
// This file is maintained for backward compatibility
// New code should import directly from '@shared/types/user'

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
} from '@shared/types/user';

// Note: The following types are kept for backward compatibility
// but should be considered deprecated. Use the ones from @shared/types/user instead

declare module '@shared/types/user' {
  export interface User {
    // This ensures compatibility with existing code
    [key: string]: unknown;
  }
}
