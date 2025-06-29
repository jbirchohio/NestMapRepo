import { pgTable, uuid, timestamp, boolean, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from '../users/users.js';
import { organizations } from './organizations.js';
import { enums } from '../enums.js';

export const organizationMembers = pgTable('organization_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  role: enums.userRole('role').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  joinedAt: timestamp('joined_at').notNull().default(sql`now()`),
  invitedById: uuid('invited_by_id').references(() => users.id, { onDelete: 'set null' }),
  // Add any additional fields as needed
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
}, (table) => ({
  // Create a unique constraint on organization_id and user_id
  orgUserUnique: unique('org_user_unique').on(table.organizationId, table.userId),
}));

// Schema for creating/updating an organization member
export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers);

// Schema for selecting an organization member
export const selectOrganizationMemberSchema = createSelectSchema(organizationMembers);

// TypeScript types
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;

// Export the schema with types
export const organizationMemberSchema = {
  insert: insertOrganizationMemberSchema,
  select: selectOrganizationMemberSchema,
} as const;
