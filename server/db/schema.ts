import { pgTable, uuid, text, timestamp, boolean, varchar, jsonb, pgEnum } from 'drizzle-orm/pg-core';
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
  role: userRoleEnum('role').notNull().default('member'),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  emailVerified: boolean('email_verified').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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
});

// Schema types for validation
export const insertUserSchema = createInsertSchema(users, {
  email: (schema) => schema.email.email(),
  passwordHash: z.string().min(8),
});

export const selectUserSchema = createSelectSchema(users);

export const insertOrganizationSchema = createInsertSchema(organizations, {
  name: (schema) => schema.name.min(1).max(100),
  slug: (schema) => schema.slug.min(3).max(100).regex(/^[a-z0-9-]+$/),
});

export const selectOrganizationSchema = createSelectSchema(organizations);

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
