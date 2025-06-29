import { pgTable, uuid, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from '../users/users.js';
import { withBaseColumns } from '../base.js';
import type { Metadata } from '../shared/types.js';

export const notifications = pgTable('notifications', {
  ...withBaseColumns,
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').notNull(), // e.g., 'trip_invitation', 'expense_approved', etc.
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at'),
  actionUrl: text('action_url'),
  // Additional data that might be needed for the notification
  data: jsonb('data').$type<Record<string, unknown>>().default({}),
  // Metadata for future use
  metadata: jsonb('metadata').$type<Metadata>().default({}),
  // Add any additional fields as needed
});

// Schema for creating/updating a notification
export const insertNotificationSchema = createInsertSchema(notifications, {
  type: (schema) => (schema as typeof notifications.$inferInsert).type.min(1).max(100),
  title: (schema) => (schema as typeof notifications.$inferInsert).title.min(1).max(200),
  message: (schema) => (schema as typeof notifications.$inferInsert).message.min(1),
  actionUrl: (schema) => (schema as typeof notifications.$inferInsert).actionUrl.url().optional(),
});

// Schema for selecting a notification
export const selectNotificationSchema = createSelectSchema(notifications);

// TypeScript types
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// Export the schema with types
export const notificationSchema = {
  insert: insertNotificationSchema,
  select: selectNotificationSchema,
} as const;
