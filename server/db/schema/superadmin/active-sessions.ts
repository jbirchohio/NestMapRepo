import { pgTable, text, uuid, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from '../users';
import { withBaseColumns } from '../base';

// Schema for active sessions
export const activeSessions = pgTable('active_sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  username: text('username').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull(),
  organizationId: uuid('organization_id'),
  organizationName: text('organization_name'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  lastActivity: timestamp('last_activity', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Indexes for common query patterns
  userIdIdx: index('active_sessions_user_id_idx').on(table.userId),
  emailIdx: index('active_sessions_email_idx').on(table.email),
  orgIdIdx: index('active_sessions_org_id_idx').on(table.organizationId),
  isActiveIdx: index('active_sessions_is_active_idx').on(table.isActive),
  expiresAtIdx: index('active_sessions_expires_at_idx').on(table.expiresAt),
  lastActivityIdx: index('active_sessions_last_activity_idx').on(table.lastActivity),
}));

// Schema for creating/updating a session
export const insertActiveSessionSchema = createInsertSchema(activeSessions, {
  username: (schema) => schema.username.min(1).max(100),
  email: (schema) => schema.email.email(),
  role: (schema) => schema.role.min(1).max(50),
  organizationName: (schema) => schema.organizationName.optional(),
  ipAddress: (schema) => schema.ipAddress.ip().optional(),
  userAgent: (schema) => schema.userAgent.max(512).optional(),
  isActive: (schema) => schema.isActive.optional(),
  metadata: (schema) => schema.metadata.optional(),
});

// Schema for selecting a session
export const selectActiveSessionSchema = createSelectSchema(activeSessions);

// TypeScript types
export type ActiveSession = typeof activeSessions.$inferSelect;
export type NewActiveSession = typeof activeSessions.$inferInsert;

// Export the schema with types
export const activeSessionSchema = {
  insert: insertActiveSessionSchema,
  select: selectActiveSessionSchema,
} as const;
