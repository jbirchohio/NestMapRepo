import { pgTable, uuid, text, timestamp, jsonb, unique, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { files } from './files.js';
import { users } from '../users/users.js';
import { organizations } from '../organizations/organizations.js';
import { withBaseColumns } from '../base.js';

// Define permission types
export const filePermissionTypes = [
  'view',
  'edit',
  'delete',
  'share',
  'download',
] as const;

export type FilePermissionType = typeof filePermissionTypes[number];

export const filePermissions = pgTable('file_permissions', {
  ...withBaseColumns,
  fileId: uuid('file_id')
    .references(() => files.id, { onDelete: 'cascade' })
    .notNull(),
  // Permission can be granted to a user or an organization
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  // Type of permission (view, edit, delete, etc.)
  permission: text('permission').$type<FilePermissionType>().notNull(),
  // Optional expiration
  expiresAt: timestamp('expires_at'),
  // Additional metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
}, (table) => ({
  // Ensure we don't have duplicate permissions
  permissionUnique: unique('file_permission_unique').on(
    table.fileId,
    table.userId,
    table.organizationId,
    table.permission
  ),
  // Add indexes for common query patterns
  fileIdIdx: index('file_permission_file_id_idx').on(table.fileId),
  userIdIdx: index('file_permission_user_id_idx').on(table.userId),
  orgIdIdx: index('file_permission_org_id_idx').on(table.organizationId),
}));

// Schema for creating/updating a file permission
export const insertFilePermissionSchema = createInsertSchema(filePermissions, {
  permission: (schema) => z.enum(filePermissionTypes),
  // Ensure either userId or organizationId is provided, but not both
}).refine(
  (data) => (data.userId === null) !== (data.organizationId === null),
  {
    message: 'Must provide either userId or organizationId, but not both',
    path: ['userId', 'organizationId'],
  }
);

// Schema for selecting a file permission
export const selectFilePermissionSchema = createSelectSchema(filePermissions);

// TypeScript types
export type FilePermission = typeof filePermissions.$inferSelect;
export type NewFilePermission = typeof filePermissions.$inferInsert;

// Export the schema with types
export const filePermissionSchema = {
  insert: insertFilePermissionSchema,
  select: selectFilePermissionSchema,
} as const;
