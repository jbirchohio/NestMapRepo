// Core types and utilities
export * from './base.js';
export * from './common.js';
export * from './utils.js';

// API and response types
export * from './api.js';

export { AppErrorCode } from './error-codes.js';

// Auth related types
export { AuthError } from './auth/auth.js';
export type { 
  AuthErrorCode, 
  AuthState, 
  AuthConfig,
  AuthTokens, 
  JwtPayload, 
  TokenType,
  AuthResponse,
  AuthUser, 
  UserProfile, 
  UserSettings,
  UserRole 
} from './auth';

// DTOs
export type { 
  LoginDto,
  RegisterDto,
  UserResponse,
  RequestPasswordResetDto, 
  ResetPasswordDto, 
  ChangePasswordDto 
} from './auth/dto';

// Domain models
export * from './trips.js';
export * from './bookings.js';
export * from './invoice.js';
export * from './users.js';
export * from './organizations.js';
export * from './hotel.js';

// Activity related types
export { 
  activityStatuses, 
  activityTypes, 
  type ActivityStatus,
  type ActivityType as ActivityTypeEnum 
} from './activity.js';

// Database and ORM types
export * from './database.js';
export * from './db.js';

// React specific types
export * from './react.js';

// Global type declarations
export * from './global.d.ts';

// Validation utilities
export * from './validation';

// Core domain types
export * from './core/base.js';
