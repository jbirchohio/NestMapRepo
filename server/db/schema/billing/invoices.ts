import { pgTable, uuid, text, timestamp, numeric, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { organizations } from '../organizations/organizations';
import { subscriptions } from './subscriptions';
import { withBaseColumns } from '../base';
import type { Metadata } from '../shared/types';

export const invoices = pgTable('invoices', {
  ...withBaseColumns,
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  subscriptionId: uuid('subscription_id')
    .references(() => subscriptions.id, { onDelete: 'set null' }),
  number: text('number').notNull().unique(),
  status: text('status').notNull().default('draft'), // draft, open, paid, void, uncollectible
  amountDue: numeric('amount_due', { precision: 12, scale: 2 }).notNull(),
  amountPaid: numeric('amount_paid', { precision: 12, scale: 2 }).default('0'),
  amountRemaining: numeric('amount_remaining', { precision: 12, scale: 2 }),
  currency: text('currency').notNull().default('usd'),
  dueDate: timestamp('due_date'),
  paidAt: timestamp('paid_at'),
  // Stripe invoice ID
  stripeInvoiceId: text('stripe_invoice_id').unique(),
  // Invoice PDF URL
  invoicePdf: text('invoice_pdf'),
  // Line items as JSON
  lines: jsonb('lines').$type<Array<{
    id: string;
    amount: number;
    currency: string;
    description: string;
    metadata: Record<string, unknown>;
  ?>>().default([]),
  // Metadata for future use
  metadata: jsonb('metadata').$type<Metadata>().default({}),
  // Add any additional fields as needed
});

// Schema for creating/updating an invoice
export const insertInvoiceSchema = createInsertSchema(invoices, {
  number: (schema) => schema.number.min(1).max(50),
  status: (schema) => schema.status.regex(/^(draft|open|paid|void|uncollectible)$/),
  amountDue: (schema) => schema.amountDue.min(0),
  amountPaid: (schema) => schema.amountPaid.min(0).optional(),
  amountRemaining: (schema) => schema.amountRemaining.min(0).optional(),
  currency: (schema) => schema.currency.length(3),
});

// Schema for selecting an invoice
export const selectInvoiceSchema = createSelectSchema(invoices);

// TypeScript types
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

// Export the schema with types
export const invoiceSchema = {
  insert: insertInvoiceSchema,
  select: selectInvoiceSchema,
} as const;
