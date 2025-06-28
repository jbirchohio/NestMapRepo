import { pgTable, uuid, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { organizations } from '../organizations/organizations';
import { users } from '../users';
import { withBaseColumns } from '../base';
import type { Metadata } from '../shared/types';

export const trips = pgTable('trips', {
  ...withBaseColumns,
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  createdById: uuid('created_by_id')
    .references(() => users.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  timezone: text('timezone'),
  location: text('location'),
  coverImageUrl: text('cover_image_url'),
  isPublic: boolean('is_public').notNull().default(false),
  status: text('status').notNull().default('draft'), // draft, planned, in_progress, completed, cancelled
  metadata: jsonb('metadata').$type<Metadata>().default({}),
  // Add any additional fields as needed
});

// Schema for creating/updating a trip
export const insertTripSchema = createInsertSchema(trips, {
  title: (schema) => schema.title.min(1).max(200),
  description: (schema) => schema.description.max(1000).optional(),
  startDate: (schema) => schema.startDate.optional(),
  endDate: (schema) => schema.endDate.optional(),
  status: (schema) => schema.status.regex(/^(draft|planned|in_progress|completed|cancelled)$/),
}).refine(
  (data) => !data.endDate || !data.startDate || data.endDate >= data.startDate,
  {
    message: 'End date must be after or equal to start date',
    path: ['endDate'],
  }
);

// Schema for selecting a trip
export const selectTripSchema = createSelectSchema(trips);

// TypeScript types
export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;

// Export the schema with types
export const tripSchema = {
  insert: insertTripSchema,
  select: selectTripSchema,
} as const;
