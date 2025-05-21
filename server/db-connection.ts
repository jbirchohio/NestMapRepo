import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { DB_CONFIG } from './config';

// This is a standard database configuration file that works with any hosting environment

// Configure WebSocket support for Neon serverless
// (only needed for Neon Database - can be removed for other PostgreSQL providers)
try {
  neonConfig.webSocketConstructor = ws;
} catch (error) {
  console.warn('Failed to set webSocketConstructor, continuing without it', error);
}

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
export const db = drizzle({ client: pool, schema });

// Utility function to test database connection
export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Export database connection
export default db;