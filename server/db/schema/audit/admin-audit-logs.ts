import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from '../users';
import { withBaseColumns } from '../base';

export const adminAuditLogs = pgTable('admin_audit_logs', {
  ...withBaseColumns,
  adminId: uuid('admin_id')
    .references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(), // e.g., 'user.suspend', 'billing.adjust'
  targetType: text('target_type'), // e.g., 'user', 'organization', 'subscription'
  targetId: uuid('target_id'),
  // Details about what was changed
  changes: jsonb('changes').notNull().$type<{
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    reason?: string;
  }>(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  // Additional context for the action
  context: jsonb('context').$type<Record<string, unknown>>().default({}),
}, (table) => ({
  // Add indexes for common query patterns
  actionIdx: index('admin_audit_action_idx').on(table.action),
  targetIdx: index('admin_audit_target_idx').on(table.targetType, table.targetId),
  adminIdIdx: index('admin_audit_admin_id_idx').on(table.adminId),
}));

// Schema for creating an admin audit log
export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLogs, {
  action: (schema) => schema.action.min(1).max(100),
  targetType: (schema) => schema.targetType.min(1).max(100).optional(),
  ipAddress: (schema) => schema.ipAddress.ip().optional(),
});

// Schema for selecting an admin audit log
export const selectAdminAuditLogSchema = createSelectSchema(adminAuditLogs);

// TypeScript types
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLogs.$inferInsert;

// Export the schema with types
export const adminAuditLogSchema = {
  insert: insertAdminAuditLogSchema,
  select: selectAdminAuditLogSchema,
} as const;
