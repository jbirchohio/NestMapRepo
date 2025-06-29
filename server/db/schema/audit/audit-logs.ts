import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from '../users/users.js';
import { organizations } from '../organizations/organizations.js';
import { withBaseColumns } from '../base.js';

export const auditLogs = pgTable('audit_logs', {
  ...withBaseColumns,
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(), // e.g., 'create', 'update', 'delete'
  entityType: text('entity_type').notNull(), // e.g., 'user', 'organization', 'trip'
  entityId: uuid('entity_id').notNull(),
  // Store the changes made (before/after snapshots or diff)
  changes: jsonb('changes').notNull().$type<{
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    changedFields?: string[];
  }>(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  // Additional context for the action
  context: jsonb('context').$type<Record<string, unknown>>().default({}),
}, (table) => ({
  // Add indexes for common query patterns
  entityIdx: index('audit_entity_idx').on(table.entityType, table.entityId),
  actionIdx: index('audit_action_idx').on(table.action),
  userIdIdx: index('audit_user_id_idx').on(table.userId),
  orgIdIdx: index('audit_org_id_idx').on(table.organizationId),
}));

// Base schema without validations
const baseInsertSchema = createInsertSchema(auditLogs);

// Schema for creating an audit log with additional validations
export const insertAuditLogSchema = baseInsertSchema.extend({
  action: baseInsertSchema.shape.action.min(1).max(100),
  entityType: baseInsertSchema.shape.entityType.min(1).max(100),
  ipAddress: baseInsertSchema.shape.ipAddress.nullable().refine(
    (val) => !val || /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(val),
    { message: 'Invalid IP address format' }
  ),
});

// Schema for selecting an audit log
export const selectAuditLogSchema = createSelectSchema(auditLogs);

// TypeScript types
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// Export the schema with types
export const auditLogSchema = {
  insert: insertAuditLogSchema,
  select: selectAuditLogSchema,
} as const;
