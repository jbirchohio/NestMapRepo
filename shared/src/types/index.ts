// Core types
export type { AuthErrorCode, AuthError, AuthErrorException } from './auth/auth.js';

// User types
export type {
  UserRole,
  User,
  UserPreferences,
  isUser,
  isUserRole
} from './user/index.js';

// Activity types
export type {
  Activity,
  ActivityStatus,
  ActivityType,
  ActivityData,
  ActivityFilterOptions,
  ActivityPaginationOptions,
  PaginatedActivityResponse,
  CreateActivityPayload,
  ClientActivity,
  isActivity,
  isClientActivity
} from './activity/index.js';

// Trip types
export type {
  SharedTripType,
  SharedConflictFlagsType
} from './trip/index.js';

// API types
export type {
  ApiResponse,
  ApiErrorResponse
} from './api/index.js';

// Job types
export * from './job/index.js';
