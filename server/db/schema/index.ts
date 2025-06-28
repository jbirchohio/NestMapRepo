// Re-export all schema modules from a single entry point
export * from './base';
export * from './enums';

// Export types that are used across the application
export * from './shared/types';

// Export schema modules (these will be added as we create them)
// Example:
// export * from './users';
// export * from './organizations';
// export * from './trips';

// Re-export drizzle-orm for convenience
export {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  index,
  sql,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

export { createInsertSchema, createSelectSchema } from 'drizzle-zod';
export { z } from 'zod';
