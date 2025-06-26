import { z } from 'zod';
import { UserRole } from '@shared/types/auth/permissions.js';

// Common validation patterns
const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])(?=.{12,})/,
  uuid: /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i,
};

// Common validation messages
export const validationMessages = {
  required: (field: string) => `${field} is required`,
  invalidEmail: 'Please provide a valid email address',
  invalidPassword: 'Password must be at least 12 characters long and include uppercase, lowercase, number, and special character',
  invalidUuid: 'Must be a valid UUID',
  passwordMismatch: 'Passwords do not match',
};

// Base schemas
const baseUserSchema = {
  email: z.string()
    .min(1, validationMessages.required('Email'))
    .email(validationMessages.invalidEmail)
    .refine(val => patterns.email.test(val), validationMessages.invalidEmail),
  
  password: z.string()
    .min(12, validationMessages.invalidPassword)
    .refine(val => patterns.password.test(val), validationMessages.invalidPassword),
};

// Auth schemas
export const loginSchema = z.object({
  email: baseUserSchema.email,
  password: z.string().min(1, validationMessages.required('Password')),
  rememberMe: z.boolean().optional(),
  otpCode: z.string().optional(),
  deviceId: z.string().optional(),
});

export const registerSchema = z.object({
  email: baseUserSchema.email,
  password: baseUserSchema.password,
  firstName: z.string().min(1, validationMessages.required('First name')),
  lastName: z.string().optional(),
  displayName: z.string().optional(),
  organizationId: z.string()
    .refine(val => !val || patterns.uuid.test(val), validationMessages.invalidUuid)
    .optional(),
  role: z.nativeEnum(UserRole).default(UserRole.USER),
  acceptTerms: z.boolean().optional(),
  inviteToken: z.string().optional(),
});

export const requestPasswordResetSchema = z.object({
  email: baseUserSchema.email,
  resetUrl: z.string().url().optional(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, validationMessages.required('Token')),
  newPassword: baseUserSchema.password,
  confirmPassword: z.string().min(1, validationMessages.required('Confirm password')),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: validationMessages.passwordMismatch,
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, validationMessages.required('Current password')),
  newPassword: baseUserSchema.password,
  confirmPassword: z.string().min(1, validationMessages.required('Confirm password')),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: validationMessages.passwordMismatch,
  path: ['confirmPassword'],
});

// Export all schemas
export const authSchemas = {
  login: loginSchema,
  register: registerSchema,
  requestPasswordReset: requestPasswordResetSchema,
  resetPassword: resetPasswordSchema,
  changePassword: changePasswordSchema,
};
