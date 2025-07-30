import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { organizations } from './schema';
import { users } from './schema';
import { invoices } from './invoiceSchema';

// Enums
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
  'processing',
  'succeeded',
  'failed',
  'canceled',
  'refunded',
  'partially_refunded'
]);

export const paymentMethodTypeEnum = pgEnum('payment_method_type', [
  'card',
  'bank_account',
  'ach_credit_transfer',
  'ach_debit',
  'sepa_debit',
  'ideal',
  'alipay',
  'klarna',
  'affirm',
  'afterpay_clearpay',
  'bancontact',
  'eps',
  'giropay',
  'p24',
  'sofort',
  'wechat_pay',
  'other'
]);

// Tables
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  amount: integer('amount').notNull(), // Amount in smallest currency unit (e.g., cents)
  currency: text('currency').notNull().default('USD'),
  status: paymentStatusEnum('status').notNull().default('pending'),
  paymentMethodId: text('payment_method_id'),
  paymentIntentId: text('payment_intent_id').unique(),
  receiptUrl: text('receipt_url'),
  description: text('description'),
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orgIdx: index('payments_organization_id_idx').on(table.organizationId),
  userIdx: index('payments_user_id_idx').on(table.userId),
  invoiceIdx: index('payments_invoice_id_idx').on(table.invoiceId),
  statusIdx: index('payments_status_idx').on(table.status),
  createdAtIdx: index('payments_created_at_idx').on(table.createdAt),
}));

export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  paymentMethodId: text('payment_method_id').notNull(), // External payment method ID (e.g., from Stripe)
  type: paymentMethodTypeEnum('type').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  details: jsonb('details').notNull(), // Encrypted payment method details
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  orgIdx: index('payment_methods_organization_id_idx').on(table.organizationId),
  userIdx: index('payment_methods_user_id_idx').on(table.userId),
  defaultIdx: index('payment_methods_is_default_idx').on(table.isDefault),
}));

export const paymentRefunds = pgTable('payment_refunds', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull().references(() => payments.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(), // Amount refunded in smallest currency unit
  currency: text('currency').notNull(),
  reason: text('reason'),
  status: text('status').notNull(), // pending, succeeded, failed
  receiptUrl: text('receipt_url'),
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  processedAt: timestamp('processed_at'),
}, (table) => ({
  paymentIdx: index('payment_refunds_payment_id_idx').on(table.paymentId),
  statusIdx: index('payment_refunds_status_idx').on(table.status),
}));

// Zod schemas
export const insertPaymentSchema = createInsertSchema(payments, {
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  metadata: z.record(z.any()).optional(),
});

export const selectPaymentSchema = createSelectSchema(payments);

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods, {
  details: z.record(z.any()),
  metadata: z.record(z.any()).optional(),
});

export const selectPaymentMethodSchema = createSelectSchema(paymentMethods);

export const insertPaymentRefundSchema = createInsertSchema(paymentRefunds, {
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  metadata: z.record(z.any()).optional(),
});

export const selectPaymentRefundSchema = createSelectSchema(paymentRefunds);

// Types
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type NewPaymentMethod = typeof paymentMethods.$inferInsert;

export type PaymentRefund = typeof paymentRefunds.$inferSelect;
export type NewPaymentRefund = typeof paymentRefunds.$inferInsert;

// Re-export enums as types
export type PaymentStatus = 'pending' | 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'refunded' | 'partially_refunded';
export type PaymentMethodType = 'card' | 'bank_account' | 'ach_credit_transfer' | 'ach_debit' | 'sepa_debit' | 'ideal' | 'alipay' | 'klarna' | 'affirm' | 'afterpay_clearpay' | 'bancontact' | 'eps' | 'giropay' | 'p24' | 'sofort' | 'wechat_pay' | 'other';
