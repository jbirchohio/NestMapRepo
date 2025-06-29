import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { organizations } from '../organizations/organizations.js';
import { users } from '../users/users.js';
import { approvalRequests } from './approval-requests.js';
import { withBaseColumns } from '../base.js';

// Approval Logs Table
export const approvalLogs = pgTable('approval_logs', {
  ...withBaseColumns,
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  requestId: uuid('request_id')
    .notNull()
    .references(() => approvalRequests.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'set null' }),
  
  // Action details
  action: text('action').notNull(), // 'created', 'approved', 'rejected', 'escalated', 'commented', 'updated'
  status: text('status').notNull(), // 'pending', 'approved', 'rejected', etc.
  
  // Log details
  message: text('message'),
  metadata: jsonb('metadata').$type<{
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    comment?: string;
    ipAddress?: string;
    userAgent?: string;
    [key: string]: unknown;
  }>().default({}),
  
  // Additional context
  context: jsonb('context').$type<Record<string, unknown>>().default({}),
}, (table) => ({
  // Add indexes for common query patterns
  requestIdIdx: index('approval_logs_request_id_idx').on(table.requestId),
  userIdIdx: index('approval_logs_user_id_idx').on(table.userId),
  actionIdx: index('approval_logs_action_idx').on(table.action),
  statusIdx: index('approval_logs_status_idx').on(table.status),
  createdAtIdx: index('approval_logs_created_at_idx').on(table.created_at),
}));

// Schema for creating an approval log
export const insertApprovalLogSchema = createInsertSchema(approvalLogs, {
  action: (schema) => (schema as typeof approvalLogs.$inferInsert).action.min(1).max(100),
  status: (schema) => (schema as typeof approvalLogs.$inferInsert).status.min(1).max(50),
  message: (schema) => (schema as typeof approvalLogs.$inferInsert).message.optional(),
  metadata: (schema) => (schema as typeof approvalLogs.$inferInsert).metadata.optional(),
  context: (schema) => (schema as typeof approvalLogs.$inferInsert).context.optional(),
});

// Schema for selecting an approval log
export const selectApprovalLogSchema = createSelectSchema(approvalLogs);

// TypeScript types
export type ApprovalLog = typeof approvalLogs.$inferSelect;
export type NewApprovalLog = typeof approvalLogs.$inferInsert;

// Export the schema with types
export const approvalLogSchema = {
  insert: insertApprovalLogSchema,
  select: selectApprovalLogSchema,
} as const;
