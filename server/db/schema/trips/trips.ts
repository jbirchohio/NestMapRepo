import { 
  pgTable, 
  uuid, 
  text, 
  timestamp, 
  jsonb, 
  boolean,
  type PgTableWithColumns,
  type AnyPgTable
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { organizations } from '../organizations/organizations.js';
import { users } from '../users/users.js';
import { withBaseColumns, type BaseTable } from '../base.js';
import type { Metadata } from '../shared/types.js';

// Trip status enum
import { pgEnum } from 'drizzle-orm/pg-core';

export const tripStatusEnum = pgEnum('trip_status', [
  'draft',
  'planned',
  'in_progress',
  'completed',
  'cancelled'
]);

export type TripStatus = typeof tripStatusEnum.enumValues[number];

export const trips = pgTable('trips', {
  ...withBaseColumns,
  organization_id: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  created_by_id: uuid('created_by_id')
    .references(() => users.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  start_date: timestamp('start_date', { withTimezone: true }),
  end_date: timestamp('end_date', { withTimezone: true }),
  timezone: text('timezone'),
  location: text('location'),
  cover_image_url: text('cover_image_url'),
  is_public: boolean('is_public').notNull().default(false),
  status: tripStatusEnum('status').notNull().default('draft'),
  metadata: jsonb('metadata').$type<Metadata>().notNull().default({} as Metadata),
});

// TypeScript types
export interface Trip extends BaseTable {
  organization_id: string;
  created_by_id: string | null;
  title: string;
  description: string | null;
  start_date: Date | null;
  end_date: Date | null;
  timezone: string | null;
  location: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  status: TripStatus;
  metadata: Metadata;
}

export type NewTrip = Omit<Trip, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;

// Schema for creating/updating a trip
export const insertTripSchema = createInsertSchema(trips, {
  title: (schema) => schema.title.min(1, 'Title is required').max(200, 'Title is too long'),
  description: (schema) => schema.description.max(5000, 'Description is too long').optional(),
  startDate: (schema) => schema.start_date.optional(),
  endDate: (schema) => schema.end_date.optional(),
  status: (schema) => z.enum(tripStatusEnum.enumValues).default('draft'),
  metadata: (schema) => schema.metadata.optional(),
}).refine(
  (data) => !data.end_date || !data.start_date || data.end_date >= data.start_date,
  {
    message: 'End date must be after or equal to start date',
    path: ['end_date'],
  }
);

// Schema for selecting a trip
export const selectTripSchema = createSelectSchema(trips);

// Export all types and schemas
export const tripSchema = {
  table: trips,
  insert: insertTripSchema,
  select: selectTripSchema,
  enums: {
    tripStatusEnum
  }
} as const;
