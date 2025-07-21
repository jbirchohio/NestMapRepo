import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "./db/schema";
import { logger } from './utils/logger';

// Database connection state
let poolInstance: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

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
  // Check for required environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_DB_PASSWORD) {
    throw new Error('Missing required database credentials in environment variables');
  }

  try {
    // Parse the Supabase URL to get the database host
    const supabaseUrl = new URL(process.env.SUPABASE_URL);
    const dbHost = `db.${supabaseUrl.hostname.split('.').slice(1).join('.')}`;
    
    // Configure database connection
    const dbConfig = {
      host: dbHost,
      port: 5432, // Default PostgreSQL port for Supabase
      database: 'postgres',
      user: 'postgres',
      password: process.env.SUPABASE_DB_PASSWORD,
      ssl: {
        rejectUnauthorized: false,
        sslmode: 'require'
      },
      connectionTimeoutMillis: 10000,
      query_timeout: 10000,
      statement_timeout: 10000,
      max: 10,
      idleTimeoutMillis: 10000,
      maxUses: 1000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000
    };

    logger.debug('Database connection configuration:', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      ssl: 'enabled'
    });

    // Create PostgreSQL connection pool
    poolInstance = new Pool(dbConfig);

    // Add error handling for the pool
    poolInstance.on('error', (err: Error) => {
      logger.error('Unexpected error on idle client', err);
    });

    // Test the connection
    const client = await poolInstance.connect();
    try {
      await client.query('SELECT NOW()');
      logger.info('Successfully connected to the database');
    } finally {
      client.release();
    }

    // Initialize Drizzle ORM with development logging
    dbInstance = drizzle(poolInstance, { 
      schema,
      logger: process.env.NODE_ENV === 'development' 
        ? { logQuery: (query: string, params: any[]) => 
            logger.debug('Database Query:', { query, params }) 
          }
        : false
    });

    return { db: dbInstance, pool: poolInstance };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to connect to the database:', error);
    throw new Error(`Database connection failed: ${errorMessage}`);
  }
}

// Export the database connection instances
export const db = dbInstance;
export const pool = poolInstance;

// Utility function to test database connection
export async function testConnection(): Promise<boolean> {
  if (!poolInstance) {
    logger.warn('Database pool not initialized - skipping connection test');
    return false;
  }
  
  let client;
  try {
    client = await poolInstance.connect();
    await client.query('SELECT NOW()');
    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Graceful shutdown handlers
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Closing database connections...`);
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
    dbInstance = null;
  }
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Initialize database connection if in development mode
if (process.env.NODE_ENV !== 'test') {
  initializeDatabase().catch(error => {
    logger.error('Failed to initialize database:', error);
    process.exit(1);
  });
}
