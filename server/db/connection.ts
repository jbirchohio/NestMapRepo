import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// Create the connection string
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/nestmap';

// Create the database connection
const queryClient = postgres(connectionString);
const db = drizzle(queryClient, { schema });

export { db, queryClient };
export const DB_CONNECTION = 'DB_CONNECTION';
