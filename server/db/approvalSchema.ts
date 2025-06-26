import { pgTable, uuid, text, timestamp, boolean, jsonb, pgEnum, index, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './schema.js';

// Enums
export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected', 'escalated', 'cancelled']);
export const approvalPriorityEnum = pgEnum('approval_priority', ['low', 'normal', 'high', 'urgent']);

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'cancelled';
export type ApprovalPriority = 'low' | 'normal' | 'high' | 'urgent';

// Approval Rules Table
export const approvalRules = pgTable('approval_rules', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => users.organizationId, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    entityType: text('entity_type').notNull(), // e.g., 'expense', 'trip', 'booking'
    conditions: jsonb('conditions').notNull().$type<{
        minAmount?: number;
        maxAmount?: number;
        requiredApprovals?: number;
        approverRoles?: string[];
        departmentIds?: string[];
    }>(),
    autoApprove: boolean('auto_approve').default(false),
    isActive: boolean('is_active').default(true),
    priority: integer('priority').default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
    orgEntityIdx: index('approval_rules_org_entity_idx').on(table.organizationId, table.entityType, table.isActive),
}));

// Approval Requests Table
export const approvalRequests = pgTable('approval_requests', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => users.organizationId, { onDelete: 'cascade' }),
    requesterId: uuid('requester_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    approverId: uuid('approver_id').references(() => users.id, { onDelete: 'set null' }),
    ruleId: uuid('rule_id').references(() => approvalRules.id, { onDelete: 'set null' }),
    
    // Entity being approved
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    
    // Request details
    status: approvalStatusEnum('status').notNull().default('pending'),
    priority: approvalPriorityEnum('priority').notNull().default('normal'),
    dueDate: timestamp('due_date'),
    
    // Request data
    proposedData: jsonb('proposed_data').notNull(),
    approvedData: jsonb('approved_data'),
    
    // Metadata
    reason: text('reason'),
    comment: text('comment'),
    businessJustification: text('business_justification'),
    
    // Timestamps
    submittedAt: timestamp('submitted_at').notNull().defaultNow(),
    approvedAt: timestamp('approved_at'),
    rejectedAt: timestamp('rejected_at'),
    cancelledAt: timestamp('cancelled_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
    orgStatusIdx: index('approval_requests_org_status_idx').on(table.organizationId, table.status),
    entityIdx: index('approval_requests_entity_idx').on(table.entityType, table.entityId),
    requesterIdx: index('approval_requests_requester_idx').on(table.requesterId),
    approverIdx: index('approval_requests_approver_idx').on(table.approverId),
}));

// Approval Logs Table
export const approvalLogs = pgTable('approval_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id').notNull().references(() => approvalRequests.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    action: text('action').notNull(), // 'created', 'approved', 'rejected', 'escalated', 'commented', 'updated'
    comment: text('comment'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Relations
export const approvalRequestsRelations = relations(approvalRequests, ({ one }) => ({
    requester: one(users, {
        fields: [approvalRequests.requesterId],
        references: [users.id],
    }),
    approver: one(users, {
        fields: [approvalRequests.approverId],
        references: [users.id],
    }),
    rule: one(approvalRules, {
        fields: [approvalRequests.ruleId],
        references: [approvalRules.id],
    }),
}));

export const approvalRulesRelations = relations(approvalRules, ({ many }) => ({
    requests: many(approvalRequests),
}));

// Types
export type ApprovalRule = typeof approvalRules.$inferSelect;
export type NewApprovalRule = typeof approvalRules.$inferInsert;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type NewApprovalRequest = typeof approvalRequests.$inferInsert;
export type ApprovalLog = typeof approvalLogs.$inferSelect;
export type NewApprovalLog = typeof approvalLogs.$inferInsert;
