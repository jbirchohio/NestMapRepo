import { pgTable, uuid, text, timestamp, numeric, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { organizations } from '../organizations/organizations.js';
import { subscriptions } from './subscriptions.js';
import { withBaseColumns } from '../base.js';
import type { Metadata } from '../shared/types.js';

export interface InvoiceLineItem {
  id: string;
  amount: number;
  currency: string;
  description: string;
  metadata: Record<string, unknown>;
}

// Zod schema for invoice line items
const invoiceLineItemSchema = z.object({
  id: z.string(),
  amount: z.number().min(0),
  currency: z.string().length(3),
  description: z.string(),
  metadata: z.record(z.unknown()).optional()
});

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
  lines: jsonb('lines').$type<InvoiceLineItem[]>().default([]),
  // Metadata for future use
  metadata: jsonb('metadata').$type<Metadata>().default({})
});

// Base schema for creating/updating an invoice
const baseInvoiceSchema = {
  number: z.string().min(1).max(100),
  status: z.string().min(1).max(50),
  amountDue: z.number().min(0),
  amountPaid: z.number().min(0).optional(),
  amountRemaining: z.number().min(0).optional(),
  currency: z.string().length(3),
  lines: z.array(invoiceLineItemSchema).default([]),
  metadata: z.record(z.unknown()).default({})
};

// Schema for creating an invoice
export const insertInvoiceSchema = z.object({
  ...baseInvoiceSchema,
  organizationId: z.string().uuid(),
  subscriptionId: z.string().uuid().optional(),
  invoicePdf: z.string().url().optional()
});

// Schema for selecting an invoice
export const selectInvoiceSchema = z.object({
  ...baseInvoiceSchema,
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  subscriptionId: z.string().uuid().nullable(),
  invoicePdf: z.string().url().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// TypeScript types
export type Invoice = z.infer<typeof selectInvoiceSchema>;
export type NewInvoice = z.infer<typeof insertInvoiceSchema>;

// Export the schema with types
export const invoiceSchema = {
  insert: insertInvoiceSchema,
  select: selectInvoiceSchema,
  table: invoices,
} as const;
