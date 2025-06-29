import { 
  pgTable, 
  uuid, 
  text, 
  timestamp, 
  jsonb, 
  boolean,
  type PgTableWithColumns,
  type AnyPgTable
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from '../users/users.js';
import { enums } from '../enums.js';
import { withBaseColumns, type BaseTable } from '../base.js';
import type { Metadata } from '../shared/types.js';
import { toCamelCase, toSnakeCase } from '../../../../shared/utils/schema-utils.js';

export const organizations = pgTable('organizations', {
  ...withBaseColumns,
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  logo_url: text('logo_url'),
  website: text('website'),
  plan: enums.organizationPlan('plan').notNull().default('free'),
  is_active: boolean('is_active').notNull().default(true),
  billing_email: text('billing_email'),
  owner_id: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
  metadata: jsonb('metadata').$type<Metadata>().notNull().default({} as Metadata),
  // Billing information
  stripe_customer_id: text('stripe_customer_id'),
  stripe_subscription_id: text('stripe_subscription_id'),
  subscription_status: text('subscription_status'),
  current_period_end: timestamp('current_period_end'),
});

// Create base schemas with proper typing
const baseInsertSchema = createInsertSchema(organizations) as unknown as z.ZodObject<{
  [K in keyof NewOrganization]: z.ZodType<NewOrganization[K]>;
}>;

const baseSelectSchema = createSelectSchema(organizations) as unknown as z.ZodObject<{
  [K in keyof Organization]: z.ZodType<Organization[K]>;
}>;

// Schema for creating a new organization
export const insertOrganizationSchema = baseInsertSchema.pick({
  name: true,
  slug: true,
  description: true,
  logo_url: true,
  website: true,
  plan: true,
  is_active: true,
  billing_email: true,
  owner_id: true,
  metadata: true,
  stripe_customer_id: true,
  stripe_subscription_id: true,
  subscription_status: true,
  current_period_end: true
}).extend({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required').toLowerCase(),
  website: z.string().url().nullable().optional(),
  billing_email: z.string().email().nullable().optional()
});

// Schema for selecting an organization
export const selectOrganizationSchema = baseSelectSchema.extend({
  created_at: z.date(),
  updated_at: z.date(),
  deleted_at: z.date().nullable()
});

// TypeScript types
export interface Organization extends BaseTable {
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  plan: string;
  is_active: boolean;
  billing_email: string | null;
  owner_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: Date | null;
  metadata: Metadata;
}

export type NewOrganization = Omit<Organization, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;

// Application-facing interface with camelCase
export interface OrganizationWithCamelCase {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  plan: string;
  isActive: boolean;
  billingEmail: string | null;
  ownerId: string | null;
  metadata: Metadata;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Utility function to convert database organization to application organization
export function toOrganizationWithCamelCase(dbOrg: Organization): OrganizationWithCamelCase {
  // Convert the organization to a plain object first
  const orgObj = { ...dbOrg } as unknown as Record<string, unknown>;
  return toCamelCase<OrganizationWithCamelCase>(orgObj);
}

// Utility function to convert application organization to database organization
export function toDbOrganization(org: Partial<OrganizationWithCamelCase>): Partial<NewOrganization> {
  // Convert the organization to a plain object first
  const orgObj = { ...org } as unknown as Record<string, unknown>;
  return toSnakeCase<Partial<NewOrganization>>(orgObj);
}

// Export the schema with types
export const organizationSchema = {
  table: organizations,
  insert: insertOrganizationSchema,
  select: selectOrganizationSchema,
  toCamelCase: toOrganizationWithCamelCase,
  toSnakeCase: toDbOrganization
} as const;
