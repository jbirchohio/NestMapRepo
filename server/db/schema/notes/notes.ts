import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from '../users/users.js';
import { organizations } from '../organizations/organizations.js';
import { trips } from '../trips/trips.js';
import { withBaseColumns } from '../base.js';

export const notes = pgTable('notes', {
  ...withBaseColumns,
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  tripId: uuid('trip_id')
    .references(() => trips.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  entityType: text('entity_type'), // e.g., 'trip', 'user', 'organization'
  entityId: uuid('entity_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
}, (table) => ({
  orgUserIdx: index('notes_org_user_idx').on(table.organizationId, table.userId),
  tripIdx: index('notes_trip_idx').on(table.tripId),
  entityIdx: index('notes_entity_idx').on(table.entityType, table.entityId),
}));

export const insertNoteSchema = createInsertSchema(notes, {
  title: (schema) => (schema as typeof notes.$inferInsert).title.min(1).max(255),
  content: (schema) => (schema as typeof notes.$inferInsert).content.min(1),
  entityType: (schema) => (schema as typeof notes.$inferInsert).entityType.optional(),
  entityId: (schema) => (schema as typeof notes.$inferInsert).entityId.uuid().optional(),
});

export const selectNoteSchema = createSelectSchema(notes);

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
