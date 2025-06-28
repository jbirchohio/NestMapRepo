import { pgTable, uuid, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import type { UserPreferences, Metadata } from '../shared/types.js';

// Helper type for database operations
type UserInsert = Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

// Define the user table schema
export const users = pgTable('users', {
  // Base columns
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
  
  // User-specific columns with unique constraint on email
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  firstName: text('first_name'),
  lastName: text('last_name'),
  passwordHash: text('password_hash'),
  lastLoginAt: timestamp('last_login_at'),
  lastActiveAt: timestamp('last_active_at'),
  isActive: boolean('is_active').notNull().default(true),
  avatarUrl: text('avatar_url'),
  timezone: text('timezone'),
  locale: text('locale'),
  metadata: jsonb('metadata').$type<Metadata>().notNull().default({} as Metadata),
  preferences: jsonb('preferences').$type<UserPreferences>().notNull().default({} as UserPreferences)
});

// Define base schemas
export const insertUserSchema = z.object({
  email: z.string().email('Please provide a valid email'),
  firstName: z.string().min(1, 'First name is required').max(100, 'First name is too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name is too long').optional(),
  passwordHash: z.string().optional(),
  emailVerified: z.boolean().optional(),
  isActive: z.boolean().optional(),
  avatarUrl: z.string().optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  metadata: z.any().optional(),
  preferences: z.any().optional()
}).strict();

// Type for new user input
type InsertUser = z.infer<typeof insertUserSchema>;

// Schema for selecting a user
export const selectUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  passwordHash: z.string().nullable(),
  emailVerified: z.boolean(),
  isActive: z.boolean(),
  avatarUrl: z.string().nullable(),
  timezone: z.string().nullable(),
  locale: z.string().nullable(),
  lastLoginAt: z.date().nullable(),
  lastActiveAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  metadata: z.record(z.any()).default({}),
  preferences: z.record(z.any()).default({})
}).strict();

// Type definitions
type User = z.infer<typeof selectUserSchema>;
type NewUser = InsertUser;

/**
 * Creates a new user object with default values
 * @param input User input data
 * @returns A new user object ready for database insertion
 */
export function createUser(input: NewUser): UserInsert {
  return {
    email: input.email,
    emailVerified: input.emailVerified ?? false,
    firstName: input.firstName ?? null,
    lastName: input.lastName ?? null,
    passwordHash: input.passwordHash ?? null,
    isActive: input.isActive ?? true,
    avatarUrl: input.avatarUrl ?? null,
    timezone: input.timezone ?? null,
    locale: input.locale ?? null,
    lastLoginAt: null,
    lastActiveAt: null,
    metadata: input.metadata ?? {},
    preferences: input.preferences ?? {}
  };
}

/**
 * Complete user schema definition including table, validation schemas, and helper functions
 */
export const userSchema = {
  table: users,
  insert: insertUserSchema,
  select: selectUserSchema,
  create: createUser,
  // Indexes are defined directly in the table definition
} as const;

// Export all types
export type {
  User,
  NewUser,
  InsertUser,
  UserInsert
};
