import { pgTable, uuid, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { trips } from './trips';
import { users } from '../users';
import { withBaseColumns } from '../base';
import type { Metadata } from '../shared/types';

export const tripActivities = pgTable('trip_activities', {
  ...withBaseColumns,
  tripId: uuid('trip_id')
    .references(() => trips.id, { onDelete: 'cascade' })
    .notNull(),
  createdById: uuid('created_by_id')
    .references(() => users.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  activityType: text('activity_type').notNull(), // e.g., 'flight', 'hotel', 'restaurant', 'activity'
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  timezone: text('timezone'),
  location: text('location'),
  locationDetails: jsonb('location_details'),
  isAllDay: boolean('is_all_day').notNull().default(false),
  status: text('status').notNull().default('planned'), // planned, confirmed, cancelled
  metadata: jsonb('metadata').$type<Metadata>().default({}),
  // Add any additional fields as needed
});

// Schema for creating/updating a trip activity
export const insertTripActivitySchema = createInsertSchema(tripActivities, {
  title: (schema) => schema.title.min(1).max(200),
  description: (schema) => schema.description.max(1000).optional(),
  activityType: (schema) => schema.activityType.min(1).max(50),
  startTime: (schema) => schema.startTime.optional(),
  endTime: (schema) => schema.endTime.optional(),
  status: (schema) => schema.status.regex(/^(planned|confirmed|cancelled)$/),
}).refine(
  (data) => !data.endTime || !data.startTime || data.endTime >= data.startTime,
  {
    message: 'End time must be after or equal to start time',
    path: ['endTime'],
  }
);

// Schema for selecting a trip activity
export const selectTripActivitySchema = createSelectSchema(tripActivities);

// TypeScript types
export type TripActivity = typeof tripActivities.$inferSelect;
export type NewTripActivity = typeof tripActivities.$inferInsert;

// Export the schema with types
export const tripActivitySchema = {
  insert: insertTripActivitySchema,
  select: selectTripActivitySchema,
} as const;
