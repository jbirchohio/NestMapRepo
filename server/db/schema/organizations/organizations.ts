import { pgTable, uuid, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from '../users';
import { enums } from '../enums';
import { withBaseColumns } from '../base';
import type { Metadata } from '../shared/types';

export const organizations = pgTable('organizations', {
  ...withBaseColumns,
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  logoUrl: text('logo_url'),
  website: text('website'),
  plan: enums.organizationPlan('plan').notNull().default('free'),
  isActive: boolean('is_active').notNull().default(true),
  billingEmail: text('billing_email'),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
  metadata: jsonb('metadata').$type<Metadata>().default({}),
  // Billing information
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  subscriptionStatus: text('subscription_status'),
  currentPeriodEnd: timestamp('current_period_end'),
  // Add any additional fields as needed
});

// Schema for creating a new organization
export const insertOrganizationSchema = createInsertSchema(organizations, {
  name: (schema) => schema.name.min(1).max(100),
  slug: (schema) => schema.slug.min(3).max(50).regex(/^[a-z0-9-]+$/),
  website: (schema) => schema.website.url().optional(),
  billingEmail: (schema) => schema.billingEmail.email().optional(),
});

// Schema for selecting an organization
export const selectOrganizationSchema = createSelectSchema(organizations);

// TypeScript types
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

// Export the schema with types
export const organizationSchema = {
  insert: insertOrganizationSchema,
  select: selectOrganizationSchema,
} as const;
