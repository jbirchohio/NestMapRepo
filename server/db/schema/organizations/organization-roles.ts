import { pgTable, uuid, text, jsonb, timestamp, boolean, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { organizations } from './organizations.js';
import type { Metadata } from '../shared/types.js';

export const organizationRoles = pgTable('organization_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  description: text('description'),
  permissions: jsonb('permissions').$type<Record<string, boolean>>().notNull().default({}),
  isSystem: boolean('is_system').notNull().default(false),
  isDefault: boolean('is_default').notNull().default(false),
  metadata: jsonb('metadata').$type<Metadata>().default({}),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
}, (table) => ({
  // Ensure role names are unique within an organization
  orgRoleNameUnique: unique('org_role_name_unique').on(table.organizationId, table.name),
}));

// Schema for creating/updating an organization role
export const insertOrganizationRoleSchema = createInsertSchema(organizationRoles, {
  name: (schema) => (schema as typeof organizationRoles.$inferInsert).name.min(1).max(50),
  description: (schema) => (schema as typeof organizationRoles.$inferInsert).description.max(255).optional(),
});

// Schema for selecting an organization role
export const selectOrganizationRoleSchema = createSelectSchema(organizationRoles);

// TypeScript types
export type OrganizationRole = typeof organizationRoles.$inferSelect;
export type NewOrganizationRole = typeof organizationRoles.$inferInsert;

// Export the schema with types
export const organizationRoleSchema = {
  insert: insertOrganizationRoleSchema,
  select: selectOrganizationRoleSchema,
} as const;
