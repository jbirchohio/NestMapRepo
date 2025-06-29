import { 
  pgTable, 
  uuid, 
  text, 
  timestamp, 
  boolean, 
  jsonb, 
  type PgTableWithColumns,
  type AnyPgTable
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import type { 
  JsonValue, 
  Metadata, 
  WithTimestamps, 
  SoftDelete 
} from './shared/types.js';

/**
 * Timestamp fields that are common across all tables
 */
export const withTimestamps = {
  created_at: timestamp('created_at', { mode: 'date' })
    .notNull()
    .default(sql`now()`),
  updated_at: timestamp('updated_at', { mode: 'date' })
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
  deleted_at: timestamp('deleted_at', { mode: 'date' }).default(sql`null`)
} as const;

/**
 * Base table with common fields for all tables
 */
export const withBaseColumns = {
  id: uuid('id').primaryKey().defaultRandom(),
  ...withTimestamps,
  metadata: jsonb('metadata').$type<Metadata>().notNull().default({} as Metadata)
} as const;

// Type for the base columns
export type WithBaseColumns = {
  id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  metadata: Metadata;
};

// Type for soft-deletable entities
export type SoftDeletable = SoftDelete & {
  deleted_at: Date | null;
};

// Type for timestamps only
export type Timestamps = WithTimestamps;

/**
 * Base interface for all database tables
 * Extend this interface for all table types
 */
export interface BaseTable extends Omit<WithBaseColumns, 'created_at' | 'updated_at' | 'deleted_at'> {
  // All tables should have metadata for tracking changes
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  metadata: Metadata;
}

/**
 * Type for creating new records
 * Omits auto-generated fields
 */
export type NewRecord<T extends BaseTable> = Omit<T, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
};

/**
 * Type for updating records
 * Makes all fields optional and allows partial updates
 */
export type UpdateRecord<T extends BaseTable> = Partial<NewRecord<T>>;

/**
 * Type utilities for schema creation
 */
type ExtractColumnData<T> = T extends { data: infer D } ? D : never;

type ExtractTableColumns<T> = T extends { _: { columns: infer C } } ? C : never;

type TableData<TTable extends AnyPgTable> = {
  [K in keyof ExtractTableColumns<TTable>]: ExtractColumnData<ExtractTableColumns<TTable>[K]>;
};

/**
 * Creates Zod schemas for a Drizzle table with proper type inference
 */
export function createSchema<TTable extends { _: { name: string; columns: any } }>(_table: TTable) {
  type Columns = TTable['_']['columns'];
  type Data = TableData<Columns>;
  
  // These will be properly typed when we import from drizzle-zod
  return {
    insert: {} as unknown as Data,
    select: {} as unknown as Data
  };
}

/**
 * Creates a type-safe schema configuration
 */
export interface SchemaConfig<T extends BaseTable> {
  table: PgTableWithColumns<{
    name: string;
    schema: string | undefined;
    columns: any;
    dialect: 'pg';
  }>;
  insert: z.ZodType<NewRecord<T>>;
  select: z.ZodType<T>;
  toCamelCase: (dbObj: T) => any;
  toSnakeCase: (appObj: any) => Partial<T>;
}

/**
 * Helper to create a schema configuration object
 */
export function createSchemaConfig<T extends BaseTable>(config: SchemaConfig<T>): SchemaConfig<T> {
  return config;
}

/**
 * Base schema configuration that can be extended by other schemas
 */
export const baseSchemaConfig = {
  id: z.string().uuid(),
  created_at: z.date(),
  updated_at: z.date(),
  deleted_at: z.date().nullable(),
  metadata: z.record(z.unknown()).optional()
} as const;

/**
 * Creates a base schema configuration with common fields
 */
export function createBaseSchema(
  additionalFields: Record<string, z.ZodType> = {}
): Record<string, z.ZodType> {
  return {
    ...baseSchemaConfig,
    ...additionalFields
  };
}
