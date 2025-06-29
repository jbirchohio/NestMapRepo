import { pgTable, uuid, text, timestamp, jsonb, boolean, index, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from '../users/users.js';
import { organizations } from '../organizations/organizations.js';
import { withBaseColumns } from '../base.js';
import type { Metadata } from '../shared/types.js';

export const fileUploads = pgTable('file_uploads', {
  ...withBaseColumns,
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  uploadedById: uuid('uploaded_by_id')
    .references(() => users.id, { onDelete: 'set null' }),
  // File metadata
  fileName: text('file_name').notNull(),
  fileType: text('file_type'),
  fileSize: integer('file_size'), // in bytes
  // Upload status
  status: text('status').notNull().default('pending'), // pending, uploading, completed, failed
  progress: integer('progress').notNull().default(0), // 0-100
  // Storage information
  storageKey: text('storage_key').unique(),
  storageProvider: text('storage_provider').default('s3'),
  storageBucket: text('storage_bucket'),
  storageRegion: text('storage_region'),
  // Presigned URL for direct uploads
  uploadUrl: text('upload_url'),
  uploadUrlExpiresAt: timestamp('upload_url_expires_at'),
  // Error information if upload fails
  error: text('error'),
  errorDetails: jsonb('error_details').$type<Record<string, unknown>>(),
  // Additional metadata
  metadata: jsonb('metadata').$type<Metadata>().default({}),
}, (table) => ({
  // Add indexes for common query patterns
  statusIdx: index('file_upload_status_idx').on(table.status),
  orgIdIdx: index('file_upload_org_id_idx').on(table.organizationId),
  uploadedByIdx: index('file_upload_uploaded_by_idx').on(table.uploadedById),
}));

// Schema for creating/updating a file upload
export const insertFileUploadSchema = createInsertSchema(fileUploads, {
  fileName: (schema) => (schema as typeof fileUploads.$inferInsert).fileName.min(1).max(255),
  fileType: (schema) => (schema as typeof fileUploads.$inferInsert).fileType.min(1).max(100).optional(),
  fileSize: (schema) => (schema as typeof fileUploads.$inferInsert).fileSize.min(0).optional(),
  status: (schema) => (schema as typeof fileUploads.$inferInsert).status.regex(/^(pending|uploading|completed|failed)$/),
  progress: (schema) => (schema as typeof fileUploads.$inferInsert).progress.min(0).max(100),
  storageKey: (schema) => (schema as typeof fileUploads.$inferInsert).storageKey.min(1).max(255).optional(),
});

// Schema for selecting a file upload
export const selectFileUploadSchema = createSelectSchema(fileUploads);

// TypeScript types
export type FileUpload = typeof fileUploads.$inferSelect;
export type NewFileUpload = typeof fileUploads.$inferInsert;

// Export the schema with types
export const fileUploadSchema = {
  insert: insertFileUploadSchema,
  select: selectFileUploadSchema,
} as const;
