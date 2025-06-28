import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from './users';
import type { UserPreferences, Metadata } from '../shared/types';

export const userSettings = pgTable('user_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  timezone: text('timezone'),
  locale: text('locale'),
  theme: text('theme'),
  notificationPreferences: jsonb('notification_preferences').$type<UserPreferences['notifications']>().default({}),
  emailNotifications: jsonb('email_notifications').$type<Record<string, boolean>>().default({}),
  pushNotifications: jsonb('push_notifications').$type<Record<string, boolean>>().default({}),
  metadata: jsonb('metadata').$type<Metadata>().default({}),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
});

// Schema for creating/updating user settings
export const insertUserSettingsSchema = createInsertSchema(userSettings);

// Schema for selecting user settings
export const selectUserSettingsSchema = createSelectSchema(userSettings);

// TypeScript types
export type UserSetting = typeof userSettings.$inferSelect;
export type NewUserSetting = typeof userSettings.$inferInsert;

// Export the schema with types
export const userSettingsSchema = {
  insert: insertUserSettingsSchema,
  select: selectUserSettingsSchema,
} as const;
