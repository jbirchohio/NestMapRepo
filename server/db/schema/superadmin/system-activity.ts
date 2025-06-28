import { pgTable, uuid, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { withBaseColumns } from '../base';

// Schema for system activity summaries
export const systemActivitySummary = pgTable('system_activity_summary', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Time period this summary represents
  date: timestamp('date', { withTimezone: true }).notNull(),
  period: text('period').notNull(), // 'hourly', 'daily', 'weekly', 'monthly'
  
  // User metrics
  totalUsers: integer('total_users').default(0).notNull(),
  activeUsers: integer('active_users').default(0).notNull(),
  newUsers: integer('new_users').default(0).notNull(),
  returningUsers: integer('returning_users').default(0).notNull(),
  
  // Organization metrics
  totalOrganizations: integer('total_organizations').default(0).notNull(),
  activeOrganizations: integer('active_organizations').default(0).notNull(),
  newOrganizations: integer('new_organizations').default(0).notNull(),
  
  // Usage metrics
  totalSessions: integer('total_sessions').default(0).notNull(),
  avgSessionDuration: integer('avg_session_duration').default(0).notNull(), // in seconds
  
  // Feature usage
  featuresUsed: jsonb('features_used').$type<Record<string, number>>().default({}),
  
  // API metrics
  apiCalls: integer('api_calls').default(0).notNull(),
  apiErrors: integer('api_errors').default(0).notNull(),
  
  // AI usage metrics
  aiCalls: integer('ai_calls').default(0).notNull(),
  aiTokensUsed: integer('ai_tokens_used').default(0).notNull(),
  aiCost: integer('ai_cost').default(0).notNull(), // in cents
  
  // Billing metrics
  revenue: integer('revenue').default(0).notNull(), // in cents
  mrr: integer('mrr').default(0).notNull(), // Monthly Recurring Revenue in cents
  arr: integer('arr').default(0).notNull(), // Annual Recurring Revenue in cents
  churnRate: integer('churn_rate').default(0).notNull(), // in basis points (1/100th of a percent)
  
  // System metrics
  uptime: integer('uptime').default(10000).notNull(), // in basis points (e.g., 9950 = 99.5%)
  errorRate: integer('error_rate').default(0).notNull(), // in basis points
  
  // Additional metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Indexes for common query patterns
  dateIdx: index('system_activity_summary_date_idx').on(table.date),
  periodIdx: index('system_activity_summary_period_idx').on(table.period),
  datePeriodIdx: index('system_activity_summary_date_period_idx')
    .on(table.date, table.period)
    .unique(),
  createdAtIdx: index('system_activity_summary_created_at_idx').on(table.createdAt),
}));

// Schema for creating/updating a system activity summary
export const insertSystemActivitySummarySchema = createInsertSchema(systemActivitySummary, {
  date: (schema) => schema.date.optional(),
  period: (schema) => schema.period.oneOf(['hourly', 'daily', 'weekly', 'monthly'] as const),
  totalUsers: (schema) => schema.totalUsers.min(0).optional(),
  activeUsers: (schema) => schema.activeUsers.min(0).optional(),
  newUsers: (schema) => schema.newUsers.min(0).optional(),
  returningUsers: (schema) => schema.returningUsers.min(0).optional(),
  totalOrganizations: (schema) => schema.totalOrganizations.min(0).optional(),
  activeOrganizations: (schema) => schema.activeOrganizations.min(0).optional(),
  newOrganizations: (schema) => schema.newOrganizations.min(0).optional(),
  totalSessions: (schema) => schema.totalSessions.min(0).optional(),
  avgSessionDuration: (schema) => schema.avgSessionDuration.min(0).optional(),
  apiCalls: (schema) => schema.apiCalls.min(0).optional(),
  apiErrors: (schema) => schema.apiErrors.min(0).optional(),
  aiCalls: (schema) => schema.aiCalls.min(0).optional(),
  aiTokensUsed: (schema) => schema.aiTokensUsed.min(0).optional(),
  aiCost: (schema) => schema.aiCost.min(0).optional(),
  revenue: (schema) => schema.revenue.min(0).optional(),
  mrr: (schema) => schema.mrr.min(0).optional(),
  arr: (schema) => schema.arr.min(0).optional(),
  churnRate: (schema) => schema.churnRate.min(0).max(10000).optional(),
  uptime: (schema) => schema.uptime.min(0).max(10000).optional(),
  errorRate: (schema) => schema.errorRate.min(0).max(10000).optional(),
  metadata: (schema) => schema.metadata.optional(),
});

// Schema for selecting a system activity summary
export const selectSystemActivitySummarySchema = createSelectSchema(systemActivitySummary);

// TypeScript types
export type SystemActivitySummary = typeof systemActivitySummary.$inferSelect;
export type NewSystemActivitySummary = typeof systemActivitySummary.$inferInsert;

// Export the schema with types
export const systemActivitySummarySchema = {
  insert: insertSystemActivitySummarySchema,
  select: selectSystemActivitySummarySchema,
} as const;
