import { pgTable, uuid, text, timestamp, numeric, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { organizations } from '../organizations/organizations';
import { users } from '../users';
import { trips } from '../trips/trips';
import { withBaseColumns } from '../base';
import { enums } from '../enums';
import type { Metadata } from '../shared/types';

export const expenses = pgTable('expenses', {
  ...withBaseColumns,
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  submittedById: uuid('submitted_by_id')
    .references(() => users.id, { onDelete: 'set null' }),
  tripId: uuid('trip_id')
    .references(() => trips.id, { onDelete: 'set null' }),
  categoryId: uuid('category_id'), // Will reference expense_categories
  title: text('title').notNull(),
  description: text('description'),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('USD'),
  expenseDate: timestamp('expense_date').notNull(),
  status: enums.approvalStatus('status').notNull().default('pending'),
  paymentMethod: text('payment_method'), // e.g., 'corporate_card', 'personal_card', 'cash', 'other'
  receiptId: uuid('receipt_id'), // Will reference receipts table
  metadata: jsonb('metadata').$type<Metadata>().default({}),
  // Add any additional fields as needed
});

// Schema for creating/updating an expense
export const insertExpenseSchema = createInsertSchema(expenses, {
  title: (schema) => schema.title.min(1).max(200),
  description: (schema) => schema.description.max(1000).optional(),
  amount: (schema) => schema.amount.min(0.01),
  currency: (schema) => schema.currency.length(3),
  status: (schema) => schema.status.regex(/^(pending|approved|rejected|paid|reimbursed)$/),
  paymentMethod: (schema) => schema.paymentMethod.optional(),
});

// Schema for selecting an expense
export const selectExpenseSchema = createSelectSchema(expenses);

// TypeScript types
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

// Export the schema with types
export const expenseSchema = {
  insert: insertExpenseSchema,
  select: selectExpenseSchema,
} as const;
