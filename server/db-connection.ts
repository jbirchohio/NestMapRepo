import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "@shared/schema";
import { DB_CONFIG } from './config';

// This is a standard database configuration file that works with any hosting environment

// Check if database URL is provided
if (!DB_CONFIG.url) {
  throw new Error(
    "DATABASE_URL must be set. Check your environment variables.",
  );
}

// Create connection pool with configurable size from environment
export const pool = new Pool({
  connectionString: DB_CONFIG.url,
  max: DB_CONFIG.connectionPoolSize
});

// Create Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Utility function to test database connection
export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Export database connection
export default db;