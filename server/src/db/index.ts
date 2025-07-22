import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { logger } from '../utils/logger';

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Get or create the database connection pool
 */
export function getPool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  logger.info('Creating new database connection pool');
  
  pool = new Pool({
    connectionString,
    max: 5, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  // Test the connection
  pool.query('SELECT NOW()')
    .then(() => logger.info('Database connection successful'))
    .catch((err) => {
      logger.error('Database connection failed', { error: err.message });
      throw err;
    });

  return pool;
}

/**
 * Get the Drizzle database instance
 */
export function getDb() {
  if (!db) {
    db = drizzle(getPool(), { schema });
  }
  return db;
}

/**
 * Close all database connections
 */
export async function closeConnections() {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
    logger.info('Database connections closed');
  }
}

// Handle process termination
process.on('SIGTERM', closeConnections);
process.on('SIGINT', closeConnections);

export * from './schema';
export * from 'drizzle-orm';
export { sql } from 'drizzle-orm/sql';

export default {
  getPool,
  getDb,
  closeConnections,
};
