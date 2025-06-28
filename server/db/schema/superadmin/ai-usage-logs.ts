import { pgTable, uuid, text, timestamp, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from '../users';
import { organizations } from '../organizations/organizations';
import { withBaseColumns } from '../base';

// Schema for AI usage logs
export const aiUsageLogs = pgTable('ai_usage_logs', {
  ...withBaseColumns,
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'set null' }),
  
  // Request details
  endpoint: text('endpoint').notNull(),
  model: text('model').notNull(),
  provider: text('provider').notNull(),
  
  // Token usage
  promptTokens: integer('prompt_tokens').default(0).notNull(),
  completionTokens: integer('completion_tokens').default(0).notNull(),
  totalTokens: integer('total_tokens').default(0).notNull(),
  
  // Cost and rate limiting
  cost: integer('cost'), // in cents
  rateLimit: integer('rate_limit'),
  rateLimitRemaining: integer('rate_limit_remaining'),
  
  // Timing
  latencyMs: integer('latency_ms'),
  
  // Request/response metadata
  requestBody: jsonb('request_body').$type<Record<string, unknown>>(),
  responseStatus: integer('response_status'),
  responseBody: jsonb('response_body').$type<Record<string, unknown>>(),
  
  // Additional context
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  
  // Error information
  error: jsonb('error').$type<{
    message?: string;
    code?: string;
    details?: unknown;
  }>(),
  
  // Additional metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
}, (table) => ({
  // Indexes for common query patterns
  orgUserIdx: index('ai_usage_logs_org_user_idx').on(table.organizationId, table.userId),
  endpointIdx: index('ai_usage_logs_endpoint_idx').on(table.endpoint),
  modelIdx: index('ai_usage_logs_model_idx').on(table.model),
  providerIdx: index('ai_usage_logs_provider_idx').on(table.provider),
  createdAtIdx: index('ai_usage_logs_created_at_idx').on(table.createdAt),
  statusIdx: index('ai_usage_logs_status_idx').on(table.responseStatus),
}));

// Schema for creating/updating an AI usage log
export const insertAiUsageLogSchema = createInsertSchema(aiUsageLogs, {
  endpoint: (schema) => schema.endpoint.min(1).max(255),
  model: (schema) => schema.model.min(1).max(100),
  provider: (schema) => schema.provider.min(1).max(100),
  promptTokens: (schema) => schema.promptTokens.min(0).optional(),
  completionTokens: (schema) => schema.completionTokens.min(0).optional(),
  totalTokens: (schema) => schema.totalTokens.min(0).optional(),
  cost: (schema) => schema.cost.min(0).optional(),
  rateLimit: (schema) => schema.rateLimit.min(0).optional(),
  rateLimitRemaining: (schema) => schema.rateLimitRemaining.min(0).optional(),
  latencyMs: (schema) => schema.latencyMs.min(0).optional(),
  responseStatus: (schema) => schema.responseStatus.optional(),
  ipAddress: (schema) => schema.ipAddress.ip().optional(),
  userAgent: (schema) => schema.userAgent.max(512).optional(),
  metadata: (schema) => schema.metadata.optional(),
});

// Schema for selecting an AI usage log
export const selectAiUsageLogSchema = createSelectSchema(aiUsageLogs);

// TypeScript types
export type AiUsageLog = typeof aiUsageLogs.$inferSelect;
export type NewAiUsageLog = typeof aiUsageLogs.$inferInsert;

// Export the schema with types
export const aiUsageLogSchema = {
  insert: insertAiUsageLogSchema,
  select: selectAiUsageLogSchema,
} as const;
