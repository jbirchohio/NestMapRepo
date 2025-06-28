import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, pgEnum, index, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Base table configuration that can be extended by other tables
 */
export const withTimestamps = {
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at')
    .notNull()
    .default(sql`now()`)
};

/**
 * Base table with common fields for all tables
 */
export const withBaseColumns = {
  id: uuid('id').primaryKey().defaultRandom(),
  ...withTimestamps
};

/**
 * Common JSON types used across schemas
 */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface Metadata {
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: string | null;
  [key: string]: JsonValue | undefined;
}

/**
 * Type utilities for schema creation
 */
type ExtractColumnData<C> = C extends { data: infer D } ? D : never;

type ExtractTableColumns<T> = T extends { _: { columns: infer C } } ? C : never;

type TableData<TColumns> = {
  [K in keyof TColumns]: TColumns[K] extends { _: infer C }
    ? ExtractColumnData<C>
    : never;
};

/**
 * Creates Zod schemas for a Drizzle table with proper type inference
 */
export function createSchema<TTable extends { _: { name: string; columns: any } }>(table: TTable) {
  type Columns = TTable['_']['columns'];
  type Data = TableData<Columns>;
  
  // These will be properly typed when we import from drizzle-zod
  return {
    insert: {} as unknown as Data,
    select: {} as unknown as Data
  };
}
