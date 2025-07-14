import { pgTable, uuid, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users, organizations } from './schema.js';

export const superadminAuditLogs = pgTable('superadmin_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminUserId: uuid('admin_user_id').references(() => users.id).notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id'),
  targetUserId: uuid('target_user_id').references(() => users.id),
  targetOrganizationId: uuid('target_organization_id').references(() => organizations.id),
  details: jsonb('details').$type<Record<string, any>>(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  severity: text('severity').default('info').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const activeSessions = pgTable('active_sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  username: text('username').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  location: text('location'),
  deviceInfo: jsonb('device_info').$type<Record<string, any>>(),
  lastActivity: timestamp('last_activity').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const aiUsageLogs = pgTable('ai_usage_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  organizationId: uuid('organization_id').references(() => organizations.id),
  endpoint: text('endpoint').notNull(),
  promptTokens: integer('prompt_tokens').default(0).notNull(),
  completionTokens: integer('completion_tokens').default(0).notNull(),
  totalTokens: integer('total_tokens').default(0).notNull(),
  costCents: integer('cost_cents').notNull(),
  model: text('model').notNull(),
  success: boolean('success').default(true).notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const superadminFeatureFlags = pgTable('superadmin_feature_flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  flagName: text('flag_name').notNull().unique(),
  description: text('description'),
  defaultValue: boolean('default_value').default(false).notNull(),
  isEnabled: boolean('is_enabled').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const organizationFeatureFlags = pgTable('organization_feature_flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  flagName: text('flag_name').notNull(),
  enabled: boolean('enabled').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const superadminBackgroundJobs = pgTable('superadmin_background_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobType: text('job_type').notNull(),
  status: text('status').default('pending').notNull(),
  data: jsonb('data').$type<Record<string, any>>(),
  result: jsonb('result').$type<Record<string, any>>(),
  errorMessage: text('error_message'),
  progress: integer('progress').default(0).notNull(),
  total: integer('total').default(100).notNull(),
  attempts: integer('attempts').default(0).notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const billingEvents = pgTable('billing_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  eventType: text('event_type').notNull(),
  stripeEventId: text('stripe_event_id'),
  amountCents: integer('amount_cents'),
  currency: text('currency').default('usd'),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const systemActivitySummary = pgTable('system_activity_summary', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: timestamp('date').notNull(),
  totalUsers: integer('total_users').default(0).notNull(),
  activeUsers: integer('active_users').default(0).notNull(),
  totalOrganizations: integer('total_organizations').default(0).notNull(),
  activeOrganizations: integer('active_organizations').default(0).notNull(),
  totalRevenueCents: integer('total_revenue_cents').default(0).notNull(),
  newSignups: integer('new_signups').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const insertSuperadminAuditLogSchema = createInsertSchema(superadminAuditLogs).omit({ id: true, createdAt: true });
export const selectSuperadminAuditLogSchema = createSelectSchema(superadminAuditLogs);

export const insertActiveSessionSchema = createInsertSchema(activeSessions).omit({ createdAt: true });
export const selectActiveSessionSchema = createSelectSchema(activeSessions);

export const insertAiUsageLogSchema = createInsertSchema(aiUsageLogs).omit({ id: true, createdAt: true });
export const selectAiUsageLogSchema = createSelectSchema(aiUsageLogs);

export const insertSuperadminFeatureFlagSchema = createInsertSchema(superadminFeatureFlags).omit({ id: true, createdAt: true });
export const selectSuperadminFeatureFlagSchema = createSelectSchema(superadminFeatureFlags);

export const insertOrganizationFeatureFlagSchema = createInsertSchema(organizationFeatureFlags).omit({ id: true, createdAt: true });
export const selectOrganizationFeatureFlagSchema = createSelectSchema(organizationFeatureFlags);

export const insertSuperadminBackgroundJobSchema = createInsertSchema(superadminBackgroundJobs).omit({ id: true, createdAt: true });
export const selectSuperadminBackgroundJobSchema = createSelectSchema(superadminBackgroundJobs);

export const insertBillingEventSchema = createInsertSchema(billingEvents).omit({ id: true, createdAt: true });
export const selectBillingEventSchema = createSelectSchema(billingEvents);

export const insertSystemActivitySummarySchema = createInsertSchema(systemActivitySummary).omit({ id: true, createdAt: true });
export const selectSystemActivitySummarySchema = createSelectSchema(systemActivitySummary);

export type SuperadminAuditLog = typeof superadminAuditLogs.$inferSelect;
export type NewSuperadminAuditLog = typeof superadminAuditLogs.$inferInsert;
export type ActiveSession = typeof activeSessions.$inferSelect;
export type NewActiveSession = typeof activeSessions.$inferInsert;
export type AiUsageLog = typeof aiUsageLogs.$inferSelect;
export type NewAiUsageLog = typeof aiUsageLogs.$inferInsert;
export type SuperadminFeatureFlag = typeof superadminFeatureFlags.$inferSelect;
export type NewSuperadminFeatureFlag = typeof superadminFeatureFlags.$inferInsert;
export type OrganizationFeatureFlag = typeof organizationFeatureFlags.$inferSelect;
export type NewOrganizationFeatureFlag = typeof organizationFeatureFlags.$inferInsert;
export type SuperadminBackgroundJob = typeof superadminBackgroundJobs.$inferSelect;
export type NewSuperadminBackgroundJob = typeof superadminBackgroundJobs.$inferInsert;
export type BillingEvent = typeof billingEvents.$inferSelect;
export type NewBillingEvent = typeof billingEvents.$inferInsert;
export type SystemActivitySummary = typeof systemActivitySummary.$inferSelect;
export type NewSystemActivitySummary = typeof systemActivitySummary.$inferInsert;
