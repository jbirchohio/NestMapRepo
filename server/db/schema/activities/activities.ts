import { pgTable, uuid, text, timestamp, jsonb, pgEnum, integer, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import type { ActivityStatus, ActivityType } from '@shared/types/activity.js';

// Define enums for activity status and type
const activityStatus = pgEnum('activity_status', [
  'pending',
  'in_progress',
  'completed',
  'cancelled'
] as const);

const activityType = pgEnum('activity_type', [
  'flight',
  'hotel',
  'restaurant',
  'attraction',
  'transport',
  'other'
] as const);

export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tripId: uuid('trip_id').notNull(),
  organizationId: uuid('organization_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  type: activityType('type').notNull(),
  status: activityStatus('status').notNull().default('pending'),
  date: timestamp('date', { withTimezone: true }).notNull(),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  locationName: text('location_name'),
  latitude: text('latitude'),
  longitude: text('longitude'),
  address: text('address'),
  tag: text('tag'),
  assignedTo: uuid('assigned_to'),
  notes: text('notes'),
  order: integer('order').default(0),
  completed: boolean('completed').default(false),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  tripIdIdx: index('activities_trip_id_idx').on(table.tripId),
  organizationIdIdx: index('activities_organization_id_idx').on(table.organizationId),
  dateIdx: index('activities_date_idx').on(table.date),
}));

// Types
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;

// Zod schemas for validation
export const insertActivitySchema = createInsertSchema(activities);
export const selectActivitySchema = createSelectSchema(activities);

// Type guards
export function isActivityStatus(status: string): status is ActivityStatus {
  return ['pending', 'in_progress', 'completed', 'cancelled'].includes(status);
}

export function isActivityType(type: string): type is ActivityType {
  return ['flight', 'hotel', 'restaurant', 'attraction', 'transport', 'other'].includes(type);
}
