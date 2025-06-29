import { pgTable, uuid, text, timestamp, jsonb, integer, index, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from '../users/users.js';
import { organizations } from '../organizations/organizations.js';
import { withBaseColumns } from '../base.js';
import type { Metadata } from '../shared/types.js';

export const files = pgTable('files', {
  ...withBaseColumns,
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  uploadedById: uuid('uploaded_by_id')
    .references(() => users.id, { onDelete: 'set null' }),
  // File metadata
  name: text('name').notNull(),
  key: text('key').notNull().unique(), // Unique storage key/path
  mimeType: text('mime_type'),
  size: integer('size').notNull(), // in bytes
  // Optional entity reference
  entityType: text('entity_type'), // e.g., 'user', 'trip', 'expense'
  entityId: uuid('entity_id'),
  // Storage information
  storageProvider: text('storage_provider').notNull().default('s3'),
  storageBucket: text('storage_bucket'),
  storageRegion: text('storage_region'),
  // Access control
  isPublic: boolean('is_public').notNull().default(false),
  // Additional metadata
  metadata: jsonb('metadata').$type<Metadata>().default({}),
}, (table) => ({
  // Add indexes for common query patterns
  entityIdx: index('file_entity_idx').on(table.entityType, table.entityId),
  orgIdIdx: index('file_org_id_idx').on(table.organizationId),
  uploadedByIdx: index('file_uploaded_by_idx').on(table.uploadedById),
}));

// Schema for creating/updating a file
export const insertFileSchema = createInsertSchema(files, {
  name: (schema) => (schema as typeof files.$inferInsert).name.min(1).max(255),
  key: (schema) => (schema as typeof files.$inferInsert).key.min(1).max(255),
  mimeType: (schema) => (schema as typeof files.$inferInsert).mimeType.min(1).max(100).optional(),
  size: (schema) => (schema as typeof files.$inferInsert).size.min(0),
  entityType: (schema) => (schema as typeof files.$inferInsert).entityType.min(1).max(100).optional(),
});

// Schema for selecting a file
export const selectFileSchema = createSelectSchema(files);

// TypeScript types
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;

// Export the schema with types
export const fileSchema = {
  insert: insertFileSchema,
  select: selectFileSchema,
} as const;
