import { 
  pgTable, 
  uuid, 
  text, 
  timestamp, 
  boolean, 
  jsonb,
  type PgTableWithColumns,
  type AnyPgTable
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import type { UserPreferences, Metadata } from '../shared/types.js';
import { type BaseTable } from '../base.js';

// Define the user table with snake_case column names for the database
export const users = pgTable('users', {
  // Base columns
  id: uuid('id').primaryKey().defaultRandom(),
  created_at: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  deleted_at: timestamp('deleted_at', { mode: 'date' }),
  
  // User-specific columns with unique constraint on email
  email: text('email').notNull().unique(),
  email_verified: boolean('email_verified').notNull().default(false),
  first_name: text('first_name'),
  last_name: text('last_name'),
  password_hash: text('password_hash'),
  last_login_at: timestamp('last_login_at', { mode: 'date' }),
  last_active_at: timestamp('last_active_at', { mode: 'date' }),
  is_active: boolean('is_active').notNull().default(true),
  avatar_url: text('avatar_url'),
  timezone: text('timezone'),
  locale: text('locale'),
  metadata: jsonb('metadata').$type<Metadata>().notNull().default({} as Metadata),
  preferences: jsonb('preferences').$type<UserPreferences>().notNull().default({} as UserPreferences),
  token_version: integer('token_version').notNull().default(0)
});

// TypeScript types
export interface User extends BaseTable {
  email: string;
  email_verified: boolean;
  first_name: string | null;
  last_name: string | null;
  password_hash: string | null;
  last_login_at: Date | null;
  last_active_at: Date | null;
  is_active: boolean;
  avatar_url: string | null;
  timezone: string | null;
  locale: string | null;
  metadata: Metadata;
  preferences: UserPreferences;
  token_version: number;
}

export type NewUser = Omit<User, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;

// Create base schemas
const baseInsertSchema = createInsertSchema(users);
const baseSelectSchema = createSelectSchema(users);

// Create validation schema for required fields
export const insertUserSchema = baseInsertSchema.pick({
  email: true,
  first_name: true,
  last_name: true,
  password_hash: true,
  is_active: true,
  metadata: true,
  preferences: true
}).extend({
  email: z.string().email('Please provide a valid email'),
  first_name: z.string().min(1, 'First name is required').max(100, 'First name is too long'),
  last_name: z.string().min(1, 'Last name is required').max(100, 'Last name is too long'),
  password_hash: z.string().min(8, 'Password must be at least 8 characters').optional(),
  is_active: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
  preferences: z.record(z.unknown()).optional()
});

export type InsertUser = z.infer<typeof insertUserSchema>;

// Create select schema with additional validations
export const selectUserSchema = baseSelectSchema.extend({
  created_at: z.date(),
  updated_at: z.date(),
  deleted_at: z.date().nullable(),
  email: z.string().email(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  password_hash: z.string().nullable(),
  last_login_at: z.date().nullable(),
  last_active_at: z.date().nullable(),
  is_active: z.boolean(),
  avatar_url: z.string().nullable(),
  timezone: z.string().nullable(),
  locale: z.string().nullable(),
  metadata: z.record(z.unknown()),
  preferences: z.record(z.unknown())
});

// Application-facing interface with camelCase
export interface UserWithCamelCase {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  passwordHash: string | null;
  lastLoginAt: Date | null;
  lastActiveAt: Date | null;
  isActive: boolean;
  avatarUrl: string | null;
  timezone: string | null;
  locale: string | null;
  metadata: Metadata;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Export all types and schemas
export const userSchema = {
  table: users,
  insert: insertUserSchema,
  select: selectUserSchema,
} as const;

// Types are already exported individually above

export default userSchema;
