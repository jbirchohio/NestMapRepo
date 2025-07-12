
import { createClient } from '@supabase/supabase-js.js';
import { drizzle } from 'drizzle-orm/node-postgres.js';
import { Pool } from 'pg.js';
import * as schema from "@shared/schema";
import config from './config.js.js';
import { logger } from './utils/logger.js.js';

// Check if Supabase credentials are provided
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_DB_PASSWORD) {
  throw new Error(
    "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_DB_PASSWORD must be set. Check your environment variables.",
  );
}

// Create Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Extract database URL from Supabase
const supabaseUrl = new URL(process.env.SUPABASE_URL);
const databaseUrl = `postgresql://postgres.${supabaseUrl.hostname.split('.')[0]}:${process.env.SUPABASE_DB_PASSWORD}@${supabaseUrl.hostname}:5432/postgres`;

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: databaseUrl,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  maxUses: 7500, // Close and remove a connection after it has been used 7500 times
});

// Create Drizzle ORM instance
export const db = drizzle(pool, { 
  schema,
  logger: config.server.env === 'development' 
    ? { logQuery: (query, params) => logger.debug('Query:', { query, params }) }
    : false
});

// Utility function to test database connection
export async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    await client.query('SELECT NOW()');
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Closing database connections...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Closing database connections...');
  await pool.end();
  process.exit(0);
});

// For backward compatibility
export { pool };
