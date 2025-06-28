import { pgTable, uuid, text, timestamp, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { organizations } from './organizations.js';
import { users } from '../users/users.js';
import { enums } from '../enums.js';

// Base schema for invitation validation
const invitationBaseSchema = {
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid('Organization ID must be a valid UUID'),
  email: z.string().email('Please provide a valid email'),
  role: z.string().min(1, 'Role is required'),
  token: z.string()
    .min(32, 'Token must be at least 32 characters')
    .max(255, 'Token must be at most 255 characters'),
  expiresAt: z.date().refine(
    (date) => date > new Date(), 
    { message: 'Expiration date must be in the future' }
  ),
  invitedById: z.string().uuid('Inviter ID must be a valid UUID').optional().nullable(),
  acceptedAt: z.date().optional().nullable(),
  rejectedAt: z.date().optional().nullable(),
  isExpired: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
};

// Create the insert schema
export const insertInvitationSchema = z.object(invitationBaseSchema);

// Create the select schema (for reading from DB)
export const selectInvitationSchema = z.object({
  ...invitationBaseSchema,
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  email: text('email').notNull(),
  role: enums.userRole('role').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  invitedById: uuid('invited_by_id')
    .references(() => users.id, { onDelete: 'set null' })
    .$type<string | null>(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }).$type<Date | null>(),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }).$type<Date | null>(),
  isExpired: boolean('is_expired').notNull().default(false),
  metadata: jsonb('metadata').$type<Record<string, unknown> | null>().default(null),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// Create a regular index for active invitations
export const invitationsActiveIndex = index('invitations_active_idx')
  .on(invitations.organizationId, invitations.email)
  .where(
    sql`${invitations.acceptedAt} IS NULL AND ${invitations.rejectedAt} IS NULL AND ${invitations.isExpired} = false`
  );

// Create a unique index for the token
// Create a unique index for the token
export const invitationsTokenIndex = uniqueIndex('invitations_token_idx')
  .on(invitations.token);

// Note: Drizzle ORM has limitations with partial unique indexes.
// We'll need to handle the uniqueness constraint at the application level
// by checking for existing active invites before creating a new one.

// Export types based on the schemas
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = z.infer<typeof selectInvitationSchema>;

// Export the schema with types
export const invitationSchema = {
  insert: insertInvitationSchema,
  select: selectInvitationSchema,
};
