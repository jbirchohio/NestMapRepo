import { pgTable, uuid, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from './users';
import type { Metadata } from '../shared/types';

export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  refreshToken: text('refresh_token').notNull().unique(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  deviceId: text('device_id'),
  expiresAt: timestamp('expires_at').notNull(),
  revoked: boolean('revoked').notNull().default(false),
  metadata: jsonb('metadata').$type<Metadata>().default({}),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
});

// Schema for creating a new session
export const insertUserSessionSchema = createInsertSchema(userSessions, {
  refreshToken: (schema) => schema.refreshToken.min(1),
  expiresAt: (schema) => schema.expiresAt.min(new Date()),
});

// Schema for selecting a session
export const selectUserSessionSchema = createSelectSchema(userSessions);

// TypeScript types
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;

// Export the schema with types
export const userSessionSchema = {
  insert: insertUserSessionSchema,
  select: selectUserSessionSchema,
} as const;
