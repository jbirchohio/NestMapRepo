import { 
  pgTable, 
  uuid, 
  text, 
  boolean,
  type PgColumn,
  type AnyPgColumn
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { trips } from './trips.js';
import { users } from '../users/users.js';
import { withBaseColumns, type BaseTable } from '../base.js';
import { toCamelCase, toSnakeCase } from '@shared/utils/schema-utils.js';

// Type for self-referential foreign key
type SelfRefColumn = PgColumn<any, any, any>;

// First, create the table without the self-reference
export const tripComments = pgTable('trip_comments', {
  ...withBaseColumns,
  trip_id: uuid('trip_id')
    .references(() => trips.id, { onDelete: 'cascade' })
    .notNull(),
  user_id: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  parent_id: uuid('parent_id'),
  content: text('content').notNull(),
  is_pinned: boolean('is_pinned').notNull().default(false),
});

// Then add the self-referential foreign key using a type assertion
(tripComments as any)._.relations = {
  parent: {
    fields: [tripComments.parent_id],
    references: [tripComments.id],
    onDelete: 'cascade'
  }
};

// TypeScript types
export interface TripComment extends BaseTable {
  trip_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  is_pinned: boolean;
}

export type NewTripComment = Omit<TripComment, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;

// Create base schemas with proper typing
const baseInsertSchema = createInsertSchema(tripComments);
const baseSelectSchema = createSelectSchema(tripComments);

// Schema for creating/updating a trip comment
export const insertTripCommentSchema = z.object({
  trip_id: z.string().uuid(),
  user_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  content: z.string().min(1, 'Comment cannot be empty').max(2000, 'Comment is too long'),
  is_pinned: z.boolean().default(false).optional()
});

// Schema for selecting a trip comment
export const selectTripCommentSchema = baseSelectSchema;

// Application-facing interface with camelCase
export interface TripCommentWithCamelCase {
  id: string;
  tripId: string;
  userId: string;
  parentId: string | null;
  content: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Utility function to convert database comment to application comment
export function toTripCommentWithCamelCase(
  dbComment: TripComment
): TripCommentWithCamelCase {
  // Convert the comment to a plain object first
  const commentObj = { ...dbComment } as unknown as Record<string, unknown>;
  return toCamelCase<TripCommentWithCamelCase>(commentObj);
}

// Utility function to convert application comment to database comment
export function toDbTripComment(
  comment: Partial<TripCommentWithCamelCase>
): Partial<NewTripComment> {
  // Convert the comment to a plain object first
  const commentObj = { ...comment } as unknown as Record<string, unknown>;
  return toSnakeCase<Partial<NewTripComment>>(commentObj);
}

// Export the schema with types
export const tripCommentSchema = {
  table: tripComments,
  insert: insertTripCommentSchema,
  select: selectTripCommentSchema,
  toCamelCase: toTripCommentWithCamelCase,
  toSnakeCase: toDbTripComment,
  enums: {}
} as const;
