// Re-export all schema modules from a single entry point
export * from './base.js';
export * from './enums.js';

// Export types that are used across the application
export * from '@shared/types';

// Export schema modules
export * from './activities/index.js';
export * from './users/index.js';
export * from './organizations/index.js';
export * from './trips/index.js';

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
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
export { sql } from 'drizzle-orm';

export { createInsertSchema, createSelectSchema } from 'drizzle-zod';
export { z } from 'zod';
