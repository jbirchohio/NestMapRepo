import { pgTable, uuid, text, timestamp, integer, jsonb, pgEnum, index } from 'drizzle-orm/pg-core.js';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod.js';
import { z } from 'zod.js';
import { organizations, users } from './schema.js';
import type { InvoiceItem } from '../../shared/types/invoice.js';

// Import proposals from schema
const proposals = pgTable('proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  createdById: uuid('created_by_id'),
  status: text('status').notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Invoice status enum
export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'sent',
  'viewed',
  'paid',
  'overdue',
  'cancelled',
  'refunded',
]);

// Invoices Table
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  number: text('number').notNull(), // Invoice number for display (e.g. INV-2024-001)
  proposalId: uuid('proposal_id').references(() => proposals.id, { onDelete: 'set null' }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  clientName: text('client_name').notNull(),
  clientEmail: text('client_email').notNull(),
  status: invoiceStatusEnum('status').default('draft'),
  amountDue: integer('amount_due').notNull(), // In cents
  amount: integer('amount').notNull(), // Total amount in cents
  currency: text('currency').default('usd'),
  description: text('description'),
  // Invoice items validation schema
  items: jsonb('items').$type<Array<InvoiceItem>>().default([]),
  dueDate: timestamp('due_date'),
  paidAt: timestamp('paid_at'),
  viewedAt: timestamp('viewed_at'),
  sentAt: timestamp('sent_at'),
  cancelledAt: timestamp('cancelled_at'),
  refundedAt: timestamp('refunded_at'),
  stripeInvoiceId: text('stripe_invoice_id'),
  stripeCustomerId: text('stripe_customer_id'),
  paymentIntentId: text('payment_intent_id'),
  paymentUrl: text('payment_url'),
  notes: text('notes'),
  metadata: jsonb('metadata').$type<{
    stripeEvent?: string;
    stripeEventId?: string;
    lastPaymentError?: string;
    [key: string]: any;
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orgIdx: index('invoices_org_idx').on(table.organizationId),
  proposalIdx: index('invoices_proposal_idx').on(table.proposalId),
  clientEmailIdx: index('invoices_client_email_idx').on(table.clientEmail),
  statusIdx: index('invoices_status_idx').on(table.status),
}));

// Zod schemas for validation
export const insertInvoiceSchema = createInsertSchema(invoices, {
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Valid email required"),
  amountDue: z.number().int().min(0, "Amount must be positive"),
  currency: z.string().min(3).max(4),
  dueDate: z.string().optional(),
});

export const selectInvoiceSchema = createSelectSchema(invoices);

// Types
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
