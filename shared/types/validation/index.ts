// Base validators
export * from './base.validator.js';

// Decorators
export * from './decorators.js';

// Validation groups
export const VALIDATION_GROUPS = {
  CREATE: 'create',
  UPDATE: 'update',
  AUTH: 'auth',
  PASSWORD_RESET: 'password_reset',
} as const;

// Common validation messages
export const VALIDATION_MESSAGES = {
  REQUIRED: (field: string) => `${field} is required`,
  INVALID_EMAIL: 'Please provide a valid email address',
  PASSWORD_STRENGTH: 'Password must be at least 12 characters long',
  PASSWORD_COMPLEXITY: 'Password must include uppercase, lowercase, number, and special character',
  INVALID_UUID: 'Must be a valid UUID',
  INVALID_DATE: 'Must be a valid date',
  INVALID_ENUM: (validValues: string[]) => `Must be one of: ${validValues.join(', ')}`,
} as const;
