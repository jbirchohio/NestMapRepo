declare module '../../../db/db' {
  import { NodePgDatabase } from 'drizzle-orm/node-postgres';
  import { PgTable } from 'drizzle-orm/pg-core';
  
  export const db: NodePgDatabase<typeof import('../../../db/schema')>;
  export * from '../../../db/schema';
}

declare module '../../../db/schema' {
  import { PgTable } from 'drizzle-orm/pg-core';
  
  export const activities: PgTable;
  // Add other tables as needed
}
