import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { trips } from './trips';
import { users } from '../users';
import { withBaseColumns } from '../base';

export const tripComments = pgTable('trip_comments', {
  ...withBaseColumns,
  tripId: uuid('trip_id')
    .references(() => trips.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  parentId: uuid('parent_id').references(/* istanbul ignore next */ () => tripComments.id, { 
    onDelete: 'cascade' 
  }),
  content: text('content').notNull(),
  isPinned: boolean('is_pinned').notNull().default(false),
  // Add any additional fields as needed
});

// Schema for creating/updating a trip comment
export const insertTripCommentSchema = createInsertSchema(tripComments, {
  content: (schema) => schema.content.min(1).max(2000),
});

// Schema for selecting a trip comment
export const selectTripCommentSchema = createSelectSchema(tripComments);

// TypeScript types
export type TripComment = typeof tripComments.$inferSelect;
export type NewTripComment = typeof tripComments.$inferInsert;

// Export the schema with types
export const tripCommentSchema = {
  insert: insertTripCommentSchema,
  select: selectTripCommentSchema,
} as const;
