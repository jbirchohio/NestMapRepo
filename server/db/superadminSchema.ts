import { 
  pgTable, 
  uuid, 
  text, 
  integer, 
  boolean, 
  timestamp, 
  jsonb,
  type PgColumn,
  type AnyPgColumn
} from 'drizzle-orm/pg-core';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Helper type to extract column types for Zod schemas
type ExtractColumnType<T> = T extends PgColumn<infer U, any, any> ? U['data'] : never;

type AuditLogSeverity = 'info' | 'warning' | 'error' | 'critical';
import { users, organizations } from './schema.js';

// Helper function to create schemas with proper typing
function createTableSchema<T extends Record<string, any>>(table: T) {
  return {
    insert: createInsertSchema(table as any) as unknown as z.ZodType<z.infer<ReturnType<typeof createInsertSchema>>, any, any>,
    select: createSelectSchema(table as any) as unknown as z.ZodType<z.infer<ReturnType<typeof createSelectSchema>>, any, any>
  };
}

// Schema for superadmin audit logs
export const superadminAuditLogs = pgTable('superadmin_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminUserId: uuid('admin_user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id'),
  targetUserId: uuid('target_user_id').references(() => users.id),
  targetOrganizationId: uuid('target_organization_id').references(() => organizations.id),
  details: jsonb('details').$type<Record<string, any>>(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  severity: text('severity').$type<AuditLogSeverity>().default('info').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Schema for active sessions
export const activeSessions = pgTable('active_sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  username: text('username').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  location: text('location'),
  deviceInfo: jsonb('device_info').$type<Record<string, any>>(),
  lastActivity: timestamp('last_activity', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Schema for AI usage logs
export const aiUsageLogs = pgTable('ai_usage_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  organizationId: uuid('organization_id').references(() => organizations.id),
  endpoint: text('endpoint').notNull(),
  promptTokens: integer('prompt_tokens').default(0).notNull(),
  completionTokens: integer('completion_tokens').default(0).notNull(),
  totalTokens: integer('total_tokens').default(0).notNull(),
  costCents: integer('cost_cents').notNull(),
  model: text('model').notNull(),
  success: boolean('success').default(true).notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Schema for superadmin feature flags
export const superadminFeatureFlags = pgTable('superadmin_feature_flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  flagName: text('flag_name').notNull().unique(),
  description: text('description'),
  defaultValue: boolean('default_value').default(false).notNull(),
  isEnabled: boolean('is_enabled').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Schema for organization feature flags
export const organizationFeatureFlags = pgTable('organization_feature_flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  flagName: text('flag_name').notNull(),
  enabled: boolean('enabled').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Schema for background jobs
export const superadminBackgroundJobs = pgTable('superadmin_background_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobType: text('job_type').notNull(),
  status: text('status').notNull().default('pending'),
  data: jsonb('data').$type<Record<string, any>>(),
  result: jsonb('result').$type<Record<string, any>>(),
  errorMessage: text('error_message'),
  progress: integer('progress').default(0).notNull(),
  total: integer('total').default(100).notNull(),
  attempts: integer('attempts').default(0).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Schema for billing events
export const billingEvents = pgTable('billing_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  stripeEventId: text('stripe_event_id'),
  amountCents: integer('amount_cents'),
  currency: text('currency').default('usd'),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Schema for system activity summary
export const systemActivitySummary = pgTable('system_activity_summary', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  totalUsers: integer('total_users').default(0).notNull(),
  activeUsers: integer('active_users').default(0).notNull(),
  totalOrganizations: integer('total_organizations').default(0).notNull(),
  activeOrganizations: integer('active_organizations').default(0).notNull(),
  totalRevenueCents: integer('total_revenue_cents').default(0).notNull(),
  newSignups: integer('new_signups').default(0).notNull(),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Create schemas using the helper function
const superadminAuditLogSchemas = createTableSchema(superadminAuditLogs);
const activeSessionsSchemas = createTableSchema(activeSessions);
const aiUsageLogsSchemas = createTableSchema(aiUsageLogs);
const superadminFeatureFlagsSchemas = createTableSchema(superadminFeatureFlags);
const organizationFeatureFlagsSchemas = createTableSchema(organizationFeatureFlags);
const superadminBackgroundJobsSchemas = createTableSchema(superadminBackgroundJobs);
const billingEventsSchemas = createTableSchema(billingEvents);
const systemActivitySummarySchemas = createTableSchema(systemActivitySummary);

// Export the schemas
export const {
  insert: insertSuperadminAuditLogSchema,
  select: selectSuperadminAuditLogSchema,
} = superadminAuditLogSchemas;

export const {
  insert: insertActiveSessionSchema,
  select: selectActiveSessionSchema,
} = activeSessionsSchemas;

export const {
  insert: insertAiUsageLogSchema,
  select: selectAiUsageLogSchema,
} = aiUsageLogsSchemas;

export const {
  insert: insertSuperadminFeatureFlagSchema,
  select: selectSuperadminFeatureFlagSchema,
} = superadminFeatureFlagsSchemas;

export const {
  insert: insertOrganizationFeatureFlagSchema,
  select: selectOrganizationFeatureFlagSchema,
} = organizationFeatureFlagsSchemas;

export const {
  insert: insertSuperadminBackgroundJobSchema,
  select: selectSuperadminBackgroundJobSchema,
} = superadminBackgroundJobsSchemas;

export const {
  insert: insertBillingEventSchema,
  select: selectBillingEventSchema,
} = billingEventsSchemas;

export const {
  insert: insertSystemActivitySummarySchema,
  select: selectSystemActivitySummarySchema,
} = systemActivitySummarySchemas;

// Types
export type SuperadminAuditLog = InferSelectModel<typeof superadminAuditLogs>;
export type NewSuperadminAuditLog = InferInsertModel<typeof superadminAuditLogs>;

export type ActiveSession = InferSelectModel<typeof activeSessions>;
export type NewActiveSession = InferInsertModel<typeof activeSessions>;

export type AiUsageLog = InferSelectModel<typeof aiUsageLogs>;
export type NewAiUsageLog = InferInsertModel<typeof aiUsageLogs>;

export type SuperadminFeatureFlag = InferSelectModel<typeof superadminFeatureFlags>;
export type NewSuperadminFeatureFlag = InferInsertModel<typeof superadminFeatureFlags>;

export type OrganizationFeatureFlag = InferSelectModel<typeof organizationFeatureFlags>;
export type NewOrganizationFeatureFlag = InferInsertModel<typeof organizationFeatureFlags>;

export type SuperadminBackgroundJob = InferSelectModel<typeof superadminBackgroundJobs>;
export type NewSuperadminBackgroundJob = InferInsertModel<typeof superadminBackgroundJobs>;

export type BillingEvent = InferSelectModel<typeof billingEvents>;
export type NewBillingEvent = InferInsertModel<typeof billingEvents>;

export type SystemActivitySummary = InferSelectModel<typeof systemActivitySummary>;
export type NewSystemActivitySummary = InferInsertModel<typeof systemActivitySummary>;
