import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from '../users/users.js';
import { withBaseColumns } from '../base.js';

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

// Create base schema with drizzle-zod
const baseInsertSchema = createInsertSchema(adminAuditLogs);

// Define validation for admin audit logs
export const insertAdminAuditLogSchema = z.object({
  // Required fields
  action: z.string({
    required_error: 'Action is required',
    invalid_type_error: 'Action must be a string',
  }).min(1, 'Action is required')
    .max(100, 'Action is too long'),
    
  // Optional fields
  targetType: z.string({
    invalid_type_error: 'Target type must be a string',
  })
    .min(1, 'Target type is required')
    .max(100, 'Target type is too long')
    .optional()
    .nullable(),
    
  // IP address validation
  ipAddress: z.union([
    z.string().regex(
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
      { message: 'Invalid IP address format' }
    ),
    z.null()
  ]).optional(),
  
  // Include other fields from base schema
  ...Object.fromEntries(
    Object.entries(baseInsertSchema.shape)
      .filter(([key]) => !['action', 'targetType', 'ipAddress'].includes(key))
      .map(([key, value]) => [key, value.optional()])
  )
}).strict();

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
