import { pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from '../users/users.js';
import { organizations } from '../organizations/organizations.js';
import { trips } from '../trips/trips.js';
import { withBaseColumns } from '../base.js';

export const todos = pgTable('todos', {
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
  description: text('description'),
  isCompleted: boolean('is_completed').notNull().default(false),
  dueDate: timestamp('due_date', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({
  orgUserIdx: index('todos_org_user_idx').on(table.organizationId, table.userId),
  tripIdx: index('todos_trip_idx').on(table.tripId),
  dueDateIdx: index('todos_due_date_idx').on(table.dueDate),
}));

export const insertTodoSchema = createInsertSchema(todos, {
  title: (schema) => (schema as typeof todos.$inferInsert).title.min(1).max(255),
  description: (schema) => (schema as typeof todos.$inferInsert).description.optional(),
  isCompleted: (schema) => (schema as typeof todos.$inferInsert).isCompleted.default(false),
  dueDate: (schema) => (schema as typeof todos.$inferInsert).dueDate.optional(),
  completedAt: (schema) => (schema as typeof todos.$inferInsert).completedAt.optional(),
});

export const selectTodoSchema = createSelectSchema(todos);

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
