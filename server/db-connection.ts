
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "./db/schema";
import config from './config';
import { logger } from './utils/logger';

// Debug environment variables
console.log('Environment variables check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
console.log('SUPABASE_DB_PASSWORD:', process.env.SUPABASE_DB_PASSWORD ? 'SET' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV);

// Check if Supabase credentials are provided and not placeholder values
const hasValidSupabaseUrl = process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('your-project');
const hasValidServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('your-service');
const hasValidDbPassword = process.env.SUPABASE_DB_PASSWORD && !process.env.SUPABASE_DB_PASSWORD.includes('your-database');

if (!hasValidSupabaseUrl || !hasValidServiceKey || !hasValidDbPassword) {
  console.warn('⚠️  Supabase credentials are not configured or contain placeholder values.');
  console.warn('⚠️  Database features will be disabled. Update your .env file with real Supabase credentials.');
}

// Create Supabase client only if valid credentials are available
export const supabase = (hasValidSupabaseUrl && hasValidServiceKey) 
  ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  : null;

// Create database connections only if valid credentials are available
let pool: Pool | null = null;
let db: any = null;

if (hasValidSupabaseUrl && hasValidServiceKey && hasValidDbPassword) {
  // Extract database URL from Supabase
  const supabaseUrl = new URL(process.env.SUPABASE_URL!);
  const databaseUrl = `postgresql://postgres.${supabaseUrl.hostname.split('.')[0]}:${process.env.SUPABASE_DB_PASSWORD}@${supabaseUrl.hostname}:5432/postgres`;

  // Create PostgreSQL connection pool
  pool = new Pool({
    connectionString: databaseUrl,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    maxUses: 7500, // Close and remove a connection after it has been used 7500 times
  });

  // Create Drizzle ORM instance
  db = drizzle(pool, { 
    schema,
    logger: config.server.env === 'development' 
      ? { logQuery: (query, params) => logger.debug('Query:', { query, params }) }
      : false
  });
}

export { db, pool };

// Utility function to test database connection
export async function testConnection() {
  if (!pool) {
    logger.warn('Database pool not initialized - skipping connection test');
    return false;
  }
  
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
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Closing database connections...');
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});

// Pool is already exported above with db
