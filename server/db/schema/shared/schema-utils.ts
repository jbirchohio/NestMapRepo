import { z } from 'zod';
import type { AnyPgTable } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

type ZodSchema<T> = z.ZodType<T>;

/**
 * Creates a standardized schema configuration for database tables
 * @param table The Drizzle table
 * @param options Schema configuration options
 * @returns Standardized schema configuration
 */
export function createSchemaConfig<T extends Record<string, any>, NewT = Omit<T, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>>(
  table: AnyPgTable,
  options: {
    name: string;
    insertSchema?: (schema: z.ZodObject<any>) => z.ZodObject<any>;
    selectSchema?: (schema: z.ZodObject<any>) => z.ZodObject<any>;
    enums?: Record<string, any>;
  }
) {
  // Create base schemas
  const baseInsert = createInsertSchema(table);
  const baseSelect = createSelectSchema(table);

  // Apply custom schema transformations if provided
  const insert = options.insertSchema ? options.insertSchema(baseInsert) : baseInsert;
  const select = options.selectSchema ? options.selectSchema(baseSelect) : baseSelect;

  return {
    name: options.name,
    table,
    insert,
    select,
    enums: options.enums || {},
  } as const;
}

/**
 * Standard schema exports type
 */
export type SchemaExports<T, NewT, Enums extends Record<string, any> = {}> = {
  name: string;
  table: AnyPgTable;
  insert: ZodSchema<NewT>;
  select: ZodSchema<T>;
  enums: Enums;
  toCamelCase?: (dbObj: any) => any;
  toSnakeCase?: (appObj: any) => any;
};

/**
 * Creates a standard schema exports object
 */
export function createSchemaExports<T, NewT, Enums extends Record<string, any> = {}>(
  config: SchemaExports<T, NewT, Enums>
) {
  return {
    name: config.name,
    table: config.table,
    insert: config.insert,
    select: config.select,
    enums: config.enums,
    toCamelCase: config.toCamelCase,
    toSnakeCase: config.toSnakeCase,
  } as const;
}
