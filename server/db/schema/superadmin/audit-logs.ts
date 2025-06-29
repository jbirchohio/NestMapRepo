import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from '../users.js';
import { organizations } from '../organizations/organizations.js';
import { withBaseColumns } from '../base.js';

export type AuditLogSeverity = 'info' | 'warning' | 'error' | 'critical';

// Schema for superadmin audit logs
export const superadminAuditLogs = pgTable('superadmin_audit_logs', {
  ...withBaseColumns,
  adminUserId: uuid('admin_user_id')
    .references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id'),
  targetUserId: uuid('target_user_id')
    .references(() => users.id, { onDelete: 'set null' }),
  targetOrganizationId: uuid('target_organization_id')
    .references(() => organizations.id, { onDelete: 'set null' }),
  details: jsonb('details').$type<Record<string, unknown>>(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  severity: text('severity').$type<AuditLogSeverity>().default('info').notNull(),
}, (table) => ({
  // Indexes for common query patterns
  actionIdx: index('superadmin_audit_logs_action_idx').on(table.action),
  entityIdx: index('superadmin_audit_logs_entity_idx').on(
    table.entityType,
    table.entityId
  ),
  adminUserIdx: index('superadmin_audit_logs_admin_user_idx').on(table.adminUserId),
  targetUserIdx: index('superadmin_audit_logs_target_user_idx').on(table.targetUserId),
  targetOrgIdx: index('superadmin_audit_logs_target_org_idx').on(table.targetOrganizationId),
  severityIdx: index('superadmin_audit_logs_severity_idx').on(table.severity),
  createdAtIdx: index('superadmin_audit_logs_created_at_idx').on(table.createdAt),
}));

// Schema for creating/updating an audit log
export const insertSuperadminAuditLogSchema = createInsertSchema(superadminAuditLogs, {
  action: (schema) => (schema as typeof superadminAuditLogs.$inferInsert).action.min(1).max(255),
  entityType: (schema) => (schema as typeof superadminAuditLogs.$inferInsert).entityType.min(1).max(100),
  entityId: (schema) => (schema as typeof superadminAuditLogs.$inferInsert).entityId.uuid().optional(),
  details: (schema) => (schema as typeof superadminAuditLogs.$inferInsert).details.optional(),
  ipAddress: (schema) => (schema as typeof superadminAuditLogs.$inferInsert).ipAddress.ip().optional(),
  userAgent: (schema) => (schema as typeof superadminAuditLogs.$inferInsert).userAgent.max(512).optional(),
  severity: (schema) => (schema as typeof superadminAuditLogs.$inferInsert).severity.default('info'),
});

// Schema for selecting an audit log
export const selectSuperadminAuditLogSchema = createSelectSchema(superadminAuditLogs);

// TypeScript types
export type SuperadminAuditLog = typeof superadminAuditLogs.$inferSelect;
export type NewSuperadminAuditLog = typeof superadminAuditLogs.$inferInsert;

// Export the schema with types
export const superadminAuditLogSchema = {
  insert: insertSuperadminAuditLogSchema,
  select: selectSuperadminAuditLogSchema,
} as const;
