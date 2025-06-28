import { pgTable, uuid, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { organizations } from '../organizations/organizations';
import { withBaseColumns } from '../base';
import { enums } from '../enums';
import type { Metadata } from '../shared/types';

export const subscriptions = pgTable('subscriptions', {
  ...withBaseColumns,
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  status: text('status').notNull().default('incomplete'), // incomplete, incomplete_expired, trialing, active, past_due, canceled, or unpaid
  priceId: text('price_id'),
  quantity: integer('quantity'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  canceledAt: timestamp('canceled_at'),
  endedAt: timestamp('ended_at'),
  trialStart: timestamp('trial_start'),
  trialEnd: timestamp('trial_end'),
  // Stripe subscription ID
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeCustomerId: text('stripe_customer_id'),
  stripePriceId: text('stripe_price_id'),
  // Metadata for future use
  metadata: jsonb('metadata').$type<Metadata>().default({}),
  // Add any additional fields as needed
});

// Schema for creating/updating a subscription
export const insertSubscriptionSchema = createInsertSchema(subscriptions, {
  status: (schema) => schema.status.regex(/^(incomplete|incomplete_expired|trialing|active|past_due|canceled|unpaid)$/),
  quantity: (schema) => schema.quantity.min(1).optional(),
});

// Schema for selecting a subscription
export const selectSubscriptionSchema = createSelectSchema(subscriptions);

// TypeScript types
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

// Export the schema with types
export const subscriptionSchema = {
  insert: insertSubscriptionSchema,
  select: selectSubscriptionSchema,
} as const;
