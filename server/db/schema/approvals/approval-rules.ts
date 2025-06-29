import { pgTable, uuid, text, timestamp, boolean, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { organizations } from '../organizations/organizations.js';
import { withBaseColumns } from '../base.js';

// Enums
export const approvalStatusEnum = ['pending', 'approved', 'rejected', 'escalated', 'cancelled'] as const;
export const approvalPriorityEnum = ['low', 'normal', 'high', 'urgent'] as const;

export type ApprovalStatus = typeof approvalStatusEnum[number];
export type ApprovalPriority = typeof approvalPriorityEnum[number];

// Approval Rules Table
export const approvalRules = pgTable('approval_rules', {
  ...withBaseColumns,
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
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
}, (table) => ({
  orgEntityIdx: index('approval_rules_org_entity_idx').on(
    table.organizationId,
    table.entityType,
    table.isActive
  ),
}));

// Schema for creating/updating an approval rule
export const insertApprovalRuleSchema = createInsertSchema(approvalRules, {
  name: (schema) => (schema as typeof approvalRules.$inferInsert).name.min(1).max(255),
  description: (schema) => (schema as typeof approvalRules.$inferInsert).description.optional(),
  entityType: (schema) => (schema as typeof approvalRules.$inferInsert).entityType.min(1).max(100),
  conditions: (schema) => (schema as typeof approvalRules.$inferInsert).conditions.optional(),
  autoApprove: (schema) => (schema as typeof approvalRules.$inferInsert).autoApprove.default(false),
  isActive: (schema) => (schema as typeof approvalRules.$inferInsert).isActive.default(true),
  priority: (schema) => (schema as typeof approvalRules.$inferInsert).priority.min(0).default(0),
});

// Schema for selecting an approval rule
export const selectApprovalRuleSchema = createSelectSchema(approvalRules);

// TypeScript types
export type ApprovalRule = typeof approvalRules.$inferSelect;
export type NewApprovalRule = typeof approvalRules.$inferInsert;

// Export the schema with types
export const approvalRuleSchema = {
  insert: insertApprovalRuleSchema,
  select: selectApprovalRuleSchema,
} as const;
