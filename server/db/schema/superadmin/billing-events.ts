import { pgTable, uuid, text, timestamp, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { organizations } from '../organizations/organizations.js';
import { withBaseColumns } from '../base.js';

type BillingEventType = 
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_cancelled'
  | 'subscription_reactivated'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'invoice_created'
  | 'invoice_paid'
  | 'invoice_payment_failed'
  | 'invoice_upcoming'
  | 'invoice_updated'
  | 'customer_created'
  | 'customer_updated'
  | 'customer_deleted'
  | 'payment_method_attached'
  | 'payment_method_updated'
  | 'refund_created'
  | 'refund_updated'
  | 'charge_succeeded'
  | 'charge_failed'
  | 'charge_refunded';

type BillingEventStatus = 'pending' | 'processed' | 'failed' | 'retrying';

// Schema for billing events
export const billingEvents = pgTable('billing_events', {
  ...withBaseColumns,
  
  // Event identification
  eventId: text('event_id').notNull(),
  eventType: text('event_type').$type<BillingEventType>().notNull(),
  status: text('status').$type<BillingEventStatus>().default('pending').notNull(),
  
  // Related entities
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'set null' }),
  customerId: text('customer_id'),
  subscriptionId: text('subscription_id'),
  invoiceId: text('invoice_id'),
  paymentIntentId: text('payment_intent_id'),
  chargeId: text('charge_id'),
  
  // Event data
  amount: integer('amount'), // in cents
  currency: text('currency').default('usd'),
  
  // Processing information
  processedAt: timestamp('processed_at', { withTimezone: true }),
  processingAttempts: integer('processing_attempts').default(0).notNull(),
  
  // Raw event data
  rawEvent: jsonb('raw_event').$type<Record<string, unknown>>(),
  
  // Error information if processing failed
  error: jsonb('error').$type<{
    message?: string;
    code?: string;
    details?: unknown;
    stack?: string;
  }>(),
  
  // Additional metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
}, (table) => ({
  // Indexes for common query patterns
  eventIdIdx: index('billing_events_event_id_idx').on(table.eventId),
  eventTypeIdx: index('billing_events_event_type_idx').on(table.eventType),
  statusIdx: index('billing_events_status_idx').on(table.status),
  orgIdx: index('billing_events_org_idx').on(table.organizationId),
  customerIdx: index('billing_events_customer_idx').on(table.customerId),
  subscriptionIdx: index('billing_events_subscription_idx').on(table.subscriptionId),
  invoiceIdx: index('billing_events_invoice_idx').on(table.invoiceId),
  paymentIntentIdx: index('billing_events_payment_intent_idx').on(table.paymentIntentId),
  chargeIdx: index('billing_events_charge_idx').on(table.chargeId),
  createdAtIdx: index('billing_events_created_at_idx').on(table.createdAt),
  
  // Composite indexes for common query patterns
  orgEventTypeIdx: index('billing_events_org_event_type_idx').on(
    table.organizationId,
    table.eventType
  ),
  statusCreatedAtIdx: index('billing_events_status_created_at_idx').on(
    table.status,
    table.createdAt
  ),
}));

// Schema for creating/updating a billing event
export const insertBillingEventSchema = createInsertSchema(billingEvents, {
  eventId: (schema) => (schema as typeof billingEvents.$inferInsert).eventId.min(1).max(255),
  eventType: (schema) => z.enum([
    'subscription_created', 'subscription_updated', 'subscription_cancelled', 'subscription_reactivated',
    'payment_succeeded', 'payment_failed', 'invoice_created', 'invoice_paid', 'invoice_payment_failed',
    'invoice_upcoming', 'invoice_updated', 'customer_created', 'customer_updated', 'customer_deleted',
    'payment_method_attached', 'payment_method_updated', 'refund_created', 'refund_updated',
    'charge_succeeded', 'charge_failed', 'charge_refunded'
  ]),
  status: (schema) => z.enum([
    'pending', 'processed', 'failed', 'retrying'
  ]).default('pending'),
  amount: (schema) => (schema as typeof billingEvents.$inferInsert).amount.min(0).optional(),
  currency: (schema) => (schema as typeof billingEvents.$inferInsert).currency.length(3).optional(),
  processingAttempts: (schema) => (schema as typeof billingEvents.$inferInsert).processingAttempts.min(0).optional(),
  rawEvent: (schema) => (schema as typeof billingEvents.$inferInsert).rawEvent.optional(),
  error: (schema) => (schema as typeof billingEvents.$inferInsert).error.optional(),
  metadata: (schema) => (schema as typeof billingEvents.$inferInsert).metadata.optional(),
});

// Schema for selecting a billing event
export const selectBillingEventSchema = createSelectSchema(billingEvents);

// TypeScript types
export type BillingEvent = typeof billingEvents.$inferSelect;
export type NewBillingEvent = typeof billingEvents.$inferInsert;

// Export the schema with types
export const billingEventSchema = {
  insert: insertBillingEventSchema,
  select: selectBillingEventSchema,
} as const;
