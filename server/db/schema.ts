// Core Drizzle ORM imports
import { 
  pgTable, 
  uuid, 
  text, 
  timestamp, 
  boolean, 
  integer, 
  jsonb, 
  pgEnum, 
  index,
  type AnyPgColumn,
  type PgTableWithColumns,
  type PgTable
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';

// ======================
// Base Types
// ======================

type JsonPrimitive = string | number | boolean | null;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

/**
 * Base interface for all database entities
 */
export interface BaseModel {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/**
 * Interface for database metadata fields
 */
export interface Metadata {
  [key: string]: JsonValue | undefined;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

// For backward compatibility
export type BaseEntity = Omit<BaseModel, 'createdAt' | 'updatedAt' | 'deletedAt'> & {
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt?: string | Date | null;
};

// ======================
// Common Database Types
// ======================

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ======================
// Type Utilities
// ======================

type ExtractColumnData<T> = T extends { data: infer D } ? D : never;

type ExtractTableColumns<T> = T extends { _: { columns: infer C } } ? C : never;

type TableData<T> = {
  [K in keyof T]: ExtractColumnData<T[K]>;
};

// ======================
// Schema Definition Helpers
// ======================

export function withTimestamps<T extends Record<string, any>>(table: T) {
  return {
    ...table,
    createdAt: timestamp('created_at')
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  };
}

export function withSoftDeletes<T extends Record<string, any>>(table: T) {
  return {
    ...table,
    deletedAt: timestamp('deleted_at'),
  };
}

// ======================
// Enums
// ======================

export const userRoleEnum = pgEnum('user_role', ['user', 'admin', 'super_admin']);
export const invitationStatusEnum = pgEnum('invitation_status', ['pending', 'accepted', 'expired', 'revoked']);
export const domainStatusEnum = pgEnum('domain_status', ['pending_verification', 'verified', 'failed_verification']);

// ======================
// Tables
// ======================

export const users = pgTable('users', withTimestamps({
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  password: text('password').notNull(),
  role: userRoleEnum('role').notNull().default('user'),
  emailVerified: boolean('email_verified').notNull().default(false),
  lastLoginAt: timestamp('last_login_at'),
  metadata: jsonb('metadata').$type<Metadata>(),
}));

export const organizations = pgTable('organizations', withTimestamps({
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logo: text('logo'),
  metadata: jsonb('metadata').$type<Metadata>(),
}));

// ======================
// Schema Types
// ======================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

// ======================
// Zod Schemas
// ======================

// Helper type to get the shape of a Drizzle table
type InferTableShape<T> = T extends { $inferSelect: infer S } ? S : never;

// User Schema
export const userSchema = {
  select: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    // Add other user fields here with proper validation
    createdAt: z.date(),
    updatedAt: z.date(),
    deletedAt: z.date().nullable()
  }),
  insert: z.object({
    email: z.string().email(),
    // Add other required fields for user creation
  })
};

// Organization Schema
export const organizationSchema = {
  select: z.object({
    id: z.string().uuid(),
    name: z.string(),
    // Add other organization fields here with proper validation
    createdAt: z.date(),
    updatedAt: z.date(),
    deletedAt: z.date().nullable()
  }),
  insert: z.object({
    name: z.string().min(1, 'Organization name is required'),
    // Add other required fields for organization creation
  })
};

// ======================
// Indexes
// ======================


// Users
const usersEmailIdx = index('users_email_idx')
  .on(users.email);

// Organizations
const organizationsSlugIdx = index('organizations_slug_idx')
  .on(organizations.slug);

// ======================
// Exports
// ======================

export * from 'drizzle-orm';
export * from 'drizzle-zod';

// Export all tables
export const tables = {
  users,
  organizations,
} as const;

// Export all types
export type Tables = typeof tables;

// Export all schemas
export const schemas = {
  user: userSchema,
  organization: organizationSchema,
} as const;
