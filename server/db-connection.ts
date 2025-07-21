
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

// Database connection state
let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

// Type for the database connection state
export interface DatabaseConnection {
  db: ReturnType<typeof drizzle>;
  pool: Pool;
}

/**
 * Initialize the database connection
 * @returns Promise that resolves when the database is connected
 * @throws Error if connection fails
 */
export async function initializeDatabase(): Promise<DatabaseConnection> {
  if (!hasValidSupabaseUrl || !hasValidServiceKey || !hasValidDbPassword) {
    throw new Error('Missing required database credentials');
  }
  // Get database URL from environment variables
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Parse the database URL to extract connection details
  let dbConfig;
  try {
    const url = new URL(databaseUrl);
    dbConfig = {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.replace(/^\/+/, '') || 'postgres',
      user: url.username || 'postgres',
      password: url.password || '',
      ssl: {
        rejectUnauthorized: false
      }
    };
    
    logger.debug('Database connection configuration:', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: '***',
      ssl: 'enabled'
    });
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL: ${error.message}`);
  }

  try {
    // Create PostgreSQL connection pool with enhanced configuration
    pool = new Pool({
      ...dbConfig,
      max: 10, // Reduced max connections to prevent overwhelming the database
      idleTimeoutMillis: 10000, // Close idle clients after 10 seconds
      connectionTimeoutMillis: 10000, // Increase timeout to 10 seconds
      maxUses: 1000, // Close and remove a connection after it has been used 1000 times
      keepAlive: true, // Keep connections alive
      keepAliveInitialDelayMillis: 10000 // Wait 10 seconds before sending the first keepalive
    });

    // Add error handling for the pool
    pool.on('error', (err: Error) => {
      logger.error('Unexpected error on idle client', err);
      // In a production environment, you might want to implement reconnection logic here
    });

    // Test the connection
    const client = await pool.connect();
    client.release();
    logger.info('Successfully connected to the database');

  } catch (error) {
    logger.error('Failed to connect to the database:', error);
    // Re-throw the error to be handled by the application
    throw new Error(`Database connection failed: ${error.message}`);
  }

  // Create Drizzle ORM instance
  db = drizzle(pool, { 
    schema,
    logger: config.server.env === 'development' 
      ? { logQuery: (query, params) => logger.debug('Query:', { query, params }) }
      : false
  });
  
  if (!pool || !db) {
    throw new Error('Database connection failed to initialize');
  }
  
  return { db, pool };
}

// Initialize the database connection when this module is imported
if (hasValidSupabaseUrl && hasValidServiceKey && hasValidDbPassword) {
  initializeDatabase().catch(error => {
    logger.error('Failed to initialize database:', error);
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
