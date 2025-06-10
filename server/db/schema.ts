import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enums
const userRoleEnum = pgEnum('user_role', ['super_admin', 'admin', 'manager', 'member', 'guest']);
const organizationPlanEnum = pgEnum('organization_plan', ['free', 'pro', 'enterprise']);

// Tables
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  passwordHash: text('password_hash').notNull(),
  passwordChangedAt: timestamp('password_changed_at'),
  passwordResetToken: text('password_reset_token'),
  passwordResetExpires: timestamp('password_reset_expires'),
  resetToken: text('reset_token'),
  resetTokenExpires: timestamp('reset_token_expires'),
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until'),
  mfaSecret: text('mfa_secret'),
  lastLoginAt: timestamp('last_login_at'),
  lastLoginIp: text('last_login_ip'),
  role: userRoleEnum('role').notNull().default('member'),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  emailVerified: boolean('email_verified').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  // Single column indexes
  lockedUntilIdx: index('users_locked_until_idx').on(table.lockedUntil),
  isActiveIdx: index('users_is_active_idx').on(table.isActive),
  
  // Composite index for common query patterns
  userActiveIdx: index('users_active_composite_idx').on(
    table.isActive, 
    table.lockedUntil, 
    table.emailVerified
  ),
  
  // Index for organization lookups
  orgUserIdx: index('users_org_composite_idx').on(
    table.organizationId, 
    table.isActive, 
    table.role
  )
}));

// Password history table
export const passwordHistory = pgTable('password_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  passwordHash: text('password_hash').notNull(),
  changedAt: timestamp('changed_at').notNull().defaultNow(),
});

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: organizationPlanEnum('plan').notNull().default('free'),
  settings: jsonb('settings').$type<{
    timezone?: string;
    locale?: string;
    whiteLabel?: {
      enabled: boolean;
      logoUrl?: string;
      primaryColor?: string;
    };
  }>(),
  timezone: text('timezone').notNull().default('UTC'),
  locale: text('locale').notNull().default('en-US'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Refresh tokens
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  revoked: boolean('revoked').notNull().default(false),
  revokedAt: timestamp('revoked_at'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent')
}, (table) => ({
  // Single column indexes
  tokenIdx: index('refresh_tokens_token_idx').on(table.token),
  userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
  expiresAtIdx: index('refresh_tokens_expires_at_idx').on(table.expiresAt),
  revokedIdx: index('refresh_tokens_revoked_idx').on(table.revoked),
  
  // Composite index for token validation (most common query)
  tokenValidationIdx: index('refresh_tokens_validation_idx').on(
    table.token,
    table.revoked,
    table.expiresAt
  ),
  
  // Composite index for user token management
  userTokensIdx: index('refresh_tokens_user_tokens_idx').on(
    table.userId,
    table.revoked,
    table.expiresAt
  ),
  
  // Index for cleanup of expired tokens
  cleanupIdx: index('refresh_tokens_cleanup_idx').on(
    table.expiresAt,
    table.revoked
  )
}));

// Base schemas without validation
export const baseUserSchema = createInsertSchema(users);
export const baseOrganizationSchema = createInsertSchema(organizations);

// Extended schemas with validation
export const insertUserSchema = baseUserSchema.extend({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  passwordHash: z.string().min(8, 'Password must be at least 8 characters long')
});

export const selectUserSchema = createSelectSchema(users);

export const insertOrganizationSchema = baseOrganizationSchema.extend({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name cannot exceed 100 characters'),
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(100, 'Slug cannot exceed 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
});

export const selectOrganizationSchema = createSelectSchema(organizations);

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
export type PasswordHistory = typeof passwordHistory.$inferSelect;
export type NewPasswordHistory = typeof passwordHistory.$inferInsert;
