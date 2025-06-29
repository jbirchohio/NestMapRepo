import { pgTable, uuid, text, timestamp, numeric, jsonb, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { organizations } from '../organizations/organizations.js';
import { users } from '../users/users.js';
import { trips } from '../trips/trips.js';
import { withBaseColumns } from '../base.js';
import type { Metadata } from '../shared/types.js';

export const budgets = pgTable('budgets', {
  ...withBaseColumns,
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  createdById: uuid('created_by_id')
    .references(() => users.id, { onDelete: 'set null' }),
  tripId: uuid('trip_id')
    .references(() => trips.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('USD'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata').$type<Metadata>().default({}),
  // Add any additional fields as needed
});

// Schema for creating/updating a budget
export const insertBudgetSchema = createInsertSchema(budgets, {
  name: (schema: any) => schema.name.pipe(z.string().min(1).max(200)),
  description: (schema: any) => schema.description.pipe(z.string().max(1000).optional()),
  amount: (schema: any) => schema.amount.pipe(z.number().min(0.01)),
  currency: (schema: any) => schema.currency.pipe(z.string().length(3)),
}).refine(
  (data) => !data.endDate || !data.startDate || data.endDate >= data.startDate,
  {
    message: 'End date must be after or equal to start date',
    path: ['endDate'],
  }
);

// Schema for selecting a budget
export const selectBudgetSchema = createSelectSchema(budgets);

// TypeScript types
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;

// Export the schema with types
export const budgetSchema = {
  insert: insertBudgetSchema,
  select: selectBudgetSchema,
} as const;
