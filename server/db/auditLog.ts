import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core.js';

// Audit Log Table Definition
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  userId: uuid('user_id').notNull(),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  orgIdx: index('auditlog_org_idx').on(table.organizationId),
  userIdx: index('auditlog_user_idx').on(table.userId),
  resourceIdx: index('auditlog_resource_idx').on(table.resource, table.resourceId)
}));
