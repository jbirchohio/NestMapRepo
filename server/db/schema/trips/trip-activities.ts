import { 
  pgTable, 
  uuid, 
  text, 
  timestamp, 
  jsonb, 
  boolean
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { trips } from './trips.js';
import { users } from '../users/users.js';
import { withBaseColumns, type BaseTable } from '../base.js';
import type { Metadata } from '../shared/types.js';
import { toCamelCase, toSnakeCase } from '@shared/utils/schema-utils.js';

// Activity type enum
export const ActivityType = {
  FLIGHT: 'flight',
  HOTEL: 'hotel',
  RESTAURANT: 'restaurant',
  ACTIVITY: 'activity',
  TRANSPORT: 'transport',
  OTHER: 'other'
} as const;

export type ActivityTypeValue = typeof ActivityType[keyof typeof ActivityType];

// Status enum
export const ActivityStatus = {
  PLANNED: 'planned',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled'
} as const;

export type ActivityStatusValue = typeof ActivityStatus[keyof typeof ActivityStatus];

// Type assertions for enum arrays
const ACTIVITY_TYPE_VALUES = Object.values(ActivityType) as [string, ...string[]];
const ACTIVITY_STATUS_VALUES = Object.values(ActivityStatus) as [string, ...string[]];

export const tripActivities = pgTable('trip_activities', {
  ...withBaseColumns,
  trip_id: uuid('trip_id')
    .references(() => trips.id, { onDelete: 'cascade' })
    .notNull(),
  created_by_id: uuid('created_by_id')
    .references(() => users.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  activity_type: text('activity_type', { enum: ACTIVITY_TYPE_VALUES }).notNull(),
  start_time: timestamp('start_time', { withTimezone: true }),
  end_time: timestamp('end_time', { withTimezone: true }),
  timezone: text('timezone'),
  location: text('location'),
  location_details: jsonb('location_details').$type<Record<string, unknown>>(),
  is_all_day: boolean('is_all_day').notNull().default(false),
  status: text('status', { enum: ACTIVITY_STATUS_VALUES }).notNull().default(ActivityStatus.PLANNED),
  metadata: jsonb('metadata').$type<Metadata>().notNull().default({} as Metadata),
});

// TypeScript types
export interface TripActivity extends BaseTable {
  trip_id: string;
  created_by_id: string | null;
  title: string;
  description: string | null;
  activity_type: ActivityTypeValue;
  start_time: Date | null;
  end_time: Date | null;
  timezone: string | null;
  location: string | null;
  location_details: Record<string, unknown> | null;
  is_all_day: boolean;
  status: ActivityStatusValue;
  metadata: Metadata;
}

export type NewTripActivity = Omit<TripActivity, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;

// Create base schemas with proper typing
const baseInsertSchema = createInsertSchema(tripActivities, {
  title: (schema) => schema.min(1, 'Title is required').max(200, 'Title is too long'),
  description: (schema) => schema.max(1000, 'Description is too long').optional(),
  start_time: (schema) => schema.optional(),
  end_time: (schema) => schema.optional(),
  metadata: (schema) => schema.optional()
});

const baseSelectSchema = createSelectSchema(tripActivities);

// Schema for creating/updating a trip activity
export const insertTripActivitySchema = baseInsertSchema.pick({
  trip_id: true,
  title: true,
  description: true,
  activity_type: true,
  start_time: true,
  end_time: true,
  timezone: true,
  location: true,
  location_details: true,
  is_all_day: true,
  status: true,
  metadata: true
}).extend({
  activity_type: z.enum(ACTIVITY_TYPE_VALUES as [string, ...string[]]) as any,
  status: z.enum(ACTIVITY_STATUS_VALUES as [string, ...string[]]).default(ActivityStatus.PLANNED) as any,
  metadata: z.record(z.unknown()).optional() as any
}).refine(
  (data) => {
    if (!data.end_time || !data.start_time) return true;
    const start = typeof data.start_time === 'string' ? new Date(data.start_time) : data.start_time;
    const end = typeof data.end_time === 'string' ? new Date(data.end_time) : data.end_time;
    return !(start instanceof Date && end instanceof Date) || end >= start;
  },
  {
    message: 'End time must be after or equal to start time',
    path: ['end_time'],
  }
);

// Schema for selecting a trip activity
export const selectTripActivitySchema = baseSelectSchema;

// Application-facing interface with camelCase
export interface TripActivityWithCamelCase {
  id: string;
  tripId: string;
  createdById: string | null;
  title: string;
  description: string | null;
  activityType: ActivityTypeValue;
  startTime: Date | null;
  endTime: Date | null;
  timezone: string | null;
  location: string | null;
  locationDetails: Record<string, unknown> | null;
  isAllDay: boolean;
  status: ActivityStatusValue;
  metadata: Metadata;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Utility function to convert database activity to application activity
export function toTripActivityWithCamelCase(dbActivity: TripActivity): TripActivityWithCamelCase {
  return toCamelCase<TripActivityWithCamelCase>(dbActivity as unknown as Record<string, unknown>);
}

// Utility function to convert application activity to database activity
export function toDbTripActivity(activity: Partial<TripActivityWithCamelCase>): Partial<NewTripActivity> {
  return toSnakeCase<Partial<NewTripActivity>>(activity as unknown as Record<string, unknown>);
}

// Export the schema with types
export const tripActivitySchema = {
  table: tripActivities,
  insert: insertTripActivitySchema,
  select: selectTripActivitySchema,
  toCamelCase: toTripActivityWithCamelCase,
  toSnakeCase: toDbTripActivity,
  enums: {
    ActivityType,
    ActivityStatus
  }
} as const;
