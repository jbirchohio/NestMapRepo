import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from '../users/users.js';
import { withBaseColumns } from '../base.js';

export const userActivityLogs = pgTable('user_activity_logs', {
  ...withBaseColumns,
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  action: text('action').notNull(), // e.g., 'login', 'logout', 'page_view', 'api_call'
  // Optional entity reference
  entityType: text('entity_type'), // e.g., 'trip', 'expense', 'document'
  entityId: uuid('entity_id'),
  // Context about the action
  details: jsonb('details').$type<{
    method?: string;
    endpoint?: string;
    statusCode?: number;
    userAgent?: string;
    ipAddress?: string;
    location?: {
      country?: string;
      region?: string;
      city?: string;
    };
    device?: {
      type?: string;
      os?: string;
      browser?: string;
    };
    [key: string]: unknown;
  }>().default({}),
  // Additional metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
}, (table) => ({
  // Add indexes for common query patterns
  userIdIdx: index('user_activity_user_id_idx').on(table.userId),
  actionIdx: index('user_activity_action_idx').on(table.action),
  entityIdx: index('user_activity_entity_idx').on(table.entityType, table.entityId),
  createdAtIdx: index('user_activity_created_at_idx').on(table.created_at),
}));

// Schema for creating a user activity log
export const insertUserActivityLogSchema = createInsertSchema(userActivityLogs, {
  action: (schema) => (schema as typeof userActivityLogs.$inferInsert).action.min(1).max(100),
  entityType: (schema) => (schema as typeof userActivityLogs.$inferInsert).entityType.min(1).max(100).optional(),
});

// Schema for selecting a user activity log
export const selectUserActivityLogSchema = createSelectSchema(userActivityLogs);

// TypeScript types
export type UserActivityLog = typeof userActivityLogs.$inferSelect;
export type NewUserActivityLog = typeof userActivityLogs.$inferInsert;

// Export the schema with types
export const userActivityLogSchema = {
  insert: insertUserActivityLogSchema,
  select: selectUserActivityLogSchema,
} as const;
