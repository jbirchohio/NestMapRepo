import { pgTable, uuid, timestamp, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { trips } from './trips';
import { users } from '../users';
import { enums } from '../enums';

export const tripCollaborators = pgTable('trip_collaborators', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id')
    .references(() => trips.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  role: enums.tripCollaboratorRole('role').notNull(),
  joinedAt: timestamp('joined_at').notNull().default(sql`now()`),
  invitedById: uuid('invited_by_id').references(() => users.id, { onDelete: 'set null' }),
  // Add any additional fields as needed
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
}, (table) => ({
  // Ensure a user can only be added once to a trip
  tripUserUnique: unique('trip_user_unique').on(table.tripId, table.userId),
}));

// Schema for creating/updating a trip collaborator
export const insertTripCollaboratorSchema = createInsertSchema(tripCollaborators);

// Schema for selecting a trip collaborator
export const selectTripCollaboratorSchema = createSelectSchema(tripCollaborators);

// TypeScript types
export type TripCollaborator = typeof tripCollaborators.$inferSelect;
export type NewTripCollaborator = typeof tripCollaborators.$inferInsert;

// Export the schema with types
export const tripCollaboratorSchema = {
  insert: insertTripCollaboratorSchema,
  select: selectTripCollaboratorSchema,
} as const;
