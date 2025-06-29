import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { dbSchema } from './index.js';
// Create a connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
// Create the Drizzle instance with schema
export const db = drizzle(pool, { 
  schema: dbSchema 
});
// Export types
export type Database = typeof db;

