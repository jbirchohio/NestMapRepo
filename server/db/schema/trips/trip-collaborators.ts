import { 
  pgTable, 
  uuid, 
  timestamp, 
  unique,
  text,
  type PgTableWithColumns,
  type AnyPgTable
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { trips } from './trips.js';
import { users } from '../users/users.js';
import { enums } from '../enums.js';
import { withBaseColumns, type BaseTable } from '../base.js';
import { toCamelCase, toSnakeCase } from '@shared/utils/schema-utils.js';

// Collaborator role enum
export const TripCollaboratorRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer'
} as const;

export const TRIP_COLLABORATOR_ROLES = Object.values(TripCollaboratorRole) as [string, ...string[]];
export type TripCollaboratorRole = typeof TripCollaboratorRole[keyof typeof TripCollaboratorRole];

export const tripCollaborators = pgTable('trip_collaborators', {
  ...withBaseColumns,
  trip_id: uuid('trip_id')
    .references(() => trips.id, { onDelete: 'cascade' })
    .notNull(),
  user_id: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  role: text('role', { enum: TRIP_COLLABORATOR_ROLES }).notNull(),
  joined_at: timestamp('joined_at', { withTimezone: true }).notNull().default(sql`now()`),
  invited_by_id: uuid('invited_by_id')
    .references(() => users.id, { onDelete: 'set null' }),
  // Add any additional fields as needed
}, (table) => ({
  // Ensure a user can only be added once to a trip
  tripUserUnique: unique('trip_user_unique').on(table.trip_id, table.user_id),
}));

// TypeScript types
export interface TripCollaborator extends BaseTable {
  trip_id: string;
  user_id: string;
  role: TripCollaboratorRole;
  joined_at: Date;
  invited_by_id: string | null;
}

export type NewTripCollaborator = Omit<TripCollaborator, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;

// Create base schemas with proper typing
const baseInsertSchema = createInsertSchema(tripCollaborators) as unknown as z.ZodObject<{
  [K in keyof NewTripCollaborator]: z.ZodType<NewTripCollaborator[K]>;
}>;

const baseSelectSchema = createSelectSchema(tripCollaborators) as unknown as z.ZodObject<{
  [K in keyof TripCollaborator]: z.ZodType<TripCollaborator[K]>;
}>;

// Schema for creating/updating a trip collaborator
export const insertTripCollaboratorSchema = baseInsertSchema.pick({
  trip_id: true,
  user_id: true,
  role: true,
  invited_by_id: true
}).extend({
  role: z.enum(TRIP_COLLABORATOR_ROLES),
  invited_by_id: z.string().uuid().optional()
});

// Schema for selecting a trip collaborator
export const selectTripCollaboratorSchema = baseSelectSchema.extend({
  created_at: z.date(),
  updated_at: z.date(),
  deleted_at: z.date().nullable(),
  joined_at: z.date(),
  role: z.enum(TRIP_COLLABORATOR_ROLES),
  invited_by_id: z.string().uuid().nullable()
});

// Application-facing interface with camelCase
export interface TripCollaboratorWithCamelCase {
  id: string;
  tripId: string;
  userId: string;
  role: TripCollaboratorRole;
  joinedAt: Date;
  invitedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Utility function to convert database collaborator to application collaborator
export function toTripCollaboratorWithCamelCase(
  dbCollaborator: TripCollaborator
): TripCollaboratorWithCamelCase {
  // Convert the collaborator to a plain object first
  const collaboratorObj = { ...dbCollaborator } as unknown as Record<string, unknown>;
  return toCamelCase<TripCollaboratorWithCamelCase>(collaboratorObj);
}

// Utility function to convert application collaborator to database collaborator
export function toDbTripCollaborator(
  collaborator: Partial<TripCollaboratorWithCamelCase>
): Partial<NewTripCollaborator> {
  // Convert the collaborator to a plain object first
  const collaboratorObj = { ...collaborator } as unknown as Record<string, unknown>;
  return toSnakeCase<Partial<NewTripCollaborator>>(collaboratorObj);
}

// Export the schema with types
export const tripCollaboratorSchema = {
  table: tripCollaborators,
  insert: insertTripCollaboratorSchema,
  select: selectTripCollaboratorSchema,
  toCamelCase: toTripCollaboratorWithCamelCase,
  toSnakeCase: toDbTripCollaborator,
  enums: {
    TripCollaboratorRole
  }
} as const;
