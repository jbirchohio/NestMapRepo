import { pgTable, uuid, text, timestamp, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { organizations } from '../organizations/organizations.js';
import { users } from '../users/users.js';
import { approvalRules } from './approval-rules.js';
import { withBaseColumns } from '../base.js';

// Re-export enums from approval-rules
export { approvalStatusEnum, approvalPriorityEnum } from './approval-rules.js';
export type { ApprovalStatus, ApprovalPriority } from './approval-rules.js';

// Approval Requests Table
export const approvalRequests = pgTable('approval_requests', {
  ...withBaseColumns,
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  requesterId: uuid('requester_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  approverId: uuid('approver_id')
    .references(() => users.id, { onDelete: 'set null' }),
  ruleId: uuid('rule_id')
    .references(() => approvalRules.id, { onDelete: 'set null' }),
  
  // Entity being approved
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  
  // Request details
  status: text('status').$type<ApprovalStatus>().notNull().default('pending'),
  priority: text('priority').$type<ApprovalPriority>().notNull().default('normal'),
  dueDate: timestamp('due_date'),
  
  // Approval workflow
  currentStep: integer('current_step').default(1),
  totalSteps: integer('total_steps').default(1),
  
  // Request data
  requestData: jsonb('request_data').notNull().$type<Record<string, unknown>>(),
  
  // Approval/Rejection data
  decisionData: jsonb('decision_data').$type<{
    comment?: string;
    metadata?: Record<string, unknown>;
  }>(),
  
  // Timestamps
  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
  decidedAt: timestamp('decided_at'),
  
  // Additional metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
}, (table) => ({
  // Add indexes for common query patterns
  orgRequesterIdx: index('approval_requests_org_requester_idx').on(table.organizationId, table.requesterId),
  orgApproverIdx: index('approval_requests_org_approver_idx').on(table.organizationId, table.approverId),
  entityIdx: index('approval_requests_entity_idx').on(table.entityType, table.entityId),
  statusIdx: index('approval_requests_status_idx').on(table.status),
  dueDateIdx: index('approval_requests_due_date_idx').on(table.dueDate),
}));

// Schema for creating/updating an approval request
export const insertApprovalRequestSchema = createInsertSchema(approvalRequests, {
  entityType: (schema) => (schema as typeof approvalRequests.$inferInsert).entityType.min(1).max(100),
  entityId: (schema) => (schema as typeof approvalRequests.$inferInsert).entityId.min(1).max(255),
  currentStep: (schema) => (schema as typeof approvalRequests.$inferInsert).currentStep.coerce.number().min(1).default(1),
  totalSteps: (schema) => (schema as typeof approvalRequests.$inferInsert).totalSteps.coerce.number().min(1).default(1),
  requestData: (schema) => (schema as typeof approvalRequests.$inferInsert).requestData.default({}),
  decisionData: (schema) => (schema as typeof approvalRequests.$inferInsert).decisionData.optional(),
  metadata: (schema) => (schema as typeof approvalRequests.$inferInsert).metadata.optional(),
});

// Schema for selecting an approval request
export const selectApprovalRequestSchema = createSelectSchema(approvalRequests);

// TypeScript types
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type NewApprovalRequest = typeof approvalRequests.$inferInsert;

// Export the schema with types
export const approvalRequestSchema = {
  insert: insertApprovalRequestSchema,
  select: selectApprovalRequestSchema,
} as const;
