import { pgTable, uuid, text, timestamp, jsonb, unique, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { organizations } from '../organizations/organizations.js';
import { withBaseColumns } from '../base.js';
import type { Metadata } from '../shared/types.js';

export const expenseCategories = pgTable('expense_categories', {
  ...withBaseColumns,
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  color: text('color'),
  isActive: boolean('is_active').notNull().default(true),
  isSystem: boolean('is_system').notNull().default(false),
  parentId: uuid('parent_id').references(/* istanbul ignore next */ () => expenseCategories.id, { 
    onDelete: 'set null' 
  }),
  metadata: jsonb('metadata').$type<Metadata>().default({}),
}, (table) => ({
  // Ensure category names are unique within an organization
  orgCategoryNameUnique: unique('org_category_name_unique').on(table.organizationId, table.name),
}));

// Schema for creating/updating an expense category
export const insertExpenseCategorySchema = createInsertSchema(expenseCategories, {
  name: (schema) => (schema as typeof expenseCategories.$inferInsert).name.min(1).max(100),
  description: (schema) => (schema as typeof expenseCategories.$inferInsert).description.max(500).optional(),
  icon: (schema) => (schema as typeof expenseCategories.$inferInsert).icon.optional(),
  color: (schema) => (schema as typeof expenseCategories.$inferInsert).color.regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
});

// Schema for selecting an expense category
export const selectExpenseCategorySchema = createSelectSchema(expenseCategories);

// TypeScript types
export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type NewExpenseCategory = typeof expenseCategories.$inferInsert;

// Export the schema with types
export const expenseCategorySchema = {
  insert: insertExpenseCategorySchema,
  select: selectExpenseCategorySchema,
} as const;
