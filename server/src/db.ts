import { drizzle } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import * as schema from "./db/schema";

// Simple logger
const logger = {
  info: (message: string) => console.log(`[INFO] ${new Date().toISOString()} - ${message}`),
  error: (message: string, error?: unknown) => {
    if (error instanceof Error) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error.message);
    } else {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
    }
  }
};

type DatabaseClient = Sql;

// Database connection variables
let db: ReturnType<typeof drizzle> | null = null;
let client: DatabaseClient | null = null;

/**
 * Initialize database connection
 */
async function initializeDatabase() {
  try {
    // Get Supabase connection details from environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabasePassword = process.env.SUPABASE_DB_PASSWORD;
    
    if (!supabaseUrl || !supabasePassword) {
      throw new Error('SUPABASE_URL and SUPABASE_DB_PASSWORD environment variables are required');
    }

    // Extract project reference from Supabase URL
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
    const dbHost = `db.${projectRef}.supabase.co`;
    
    // Log connection info
    logger.info(`Connecting to Supabase database at: ${dbHost}`);

    // Create the database client with connection string
    const connectionString = `postgres://postgres:${encodeURIComponent(supabasePassword)}@${dbHost}:5432/postgres`;
    
    client = postgres({
      connectionString,
      max: 10,                   // Maximum number of connections in the pool
      idle_timeout: 20,          // Reduced idle timeout for better connection recycling
      connect_timeout: 10,       // Connection timeout in seconds
      max_lifetime: 60 * 10,     // Shorter max lifetime for better load balancing
      ssl: {
        rejectUnauthorized: false // Required for Supabase
      },
      prepare: false,            // Disable prepared statements for Supabase
      debug: process.env.NODE_ENV === 'development',
      transform: {
        // Ensure proper type handling for timestamps
        value: (val: unknown) => {
          if (val instanceof Date) {
            return val.toISOString();
          }
          return val;
        }
      },
      onnotice: (notice: { [key: string]: unknown }) => logger.info(`DB Notice: ${JSON.stringify(notice)}`),
      onparameter: (key: string, value: unknown) => logger.info(`DB Parameter: ${key} = ${String(value)}`),
      onclose: () => logger.info('DB Connection closed')
    });
    
    // Test the connection
    try {
      logger.info('Testing database connection...');
      const startTime = Date.now();
      if (!client) {
        throw new Error('Database client is not initialized');
      }
      await client`SELECT 1`;
      const endTime = Date.now();
      logger.info(`✅ Database connection successful (${endTime - startTime}ms)`);
    } catch (testError) {
      logger.error('Database connection test failed', testError);
      throw testError;
    }

    // Initialize Drizzle ORM with the PostgreSQL client and schema
    db = drizzle(client, { 
      schema,
      logger: process.env.NODE_ENV === 'development'
    });
    
    logger.info('✅ Database client and ORM initialized successfully');
    return { db, client };
  } catch (error) {
    logger.error('❌ Failed to initialize database', error);
    
    if (error instanceof Error) {
      const errorMessage = error.message;
      if (errorMessage.includes('timeout')) {
        logger.error('Database connection timed out');
      } else if (errorMessage.includes('ENOTFOUND')) {
        logger.error('Database host not found');
      } else if (errorMessage.includes('authentication')) {
        logger.error('Database authentication failed');
      }
    }
    
    // Clean up client if it was created
    const clientToClose = client;
    client = null;
    if (clientToClose) {
      try {
        await clientToClose.end();
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    
    throw error; // Re-throw to be handled by the caller
  }
}

// Initialize the database connection when this module is imported
let dbInitialization: Promise<any> | null = null;

// Export a function to get the database instance
export async function getDatabase() {
  if (!dbInitialization) {
    dbInitialization = initializeDatabase();
  }
  const result = await dbInitialization;
  if (!result) {
    console.warn('⚠️ Database not available - some features may be limited');
  }
  return result;
}


// For backward compatibility
export const pool = {
  /**
   * Execute a raw SQL query with parameters
   * @template T - The expected return type (defaults to any[])
   * @param text - The SQL query string
   * @param params - Array of query parameters
   * @returns Promise containing the query results
   */
  query: async <T = any[]>(text: string, params: (string | number | boolean | Date | null)[] = []): Promise<T[]> => {
    if (!client) {
      await getDatabase();
      if (!client) {
        throw new Error('Database connection not available');
      }
    }
    // Type assertion is safe here as we've typed the params array
    return client!.unsafe<T[]>(text, params as any[]);
  }
};

// Export the database instance
// Note: Prefer using getDatabase() for async initialization
export { db };

export default {
  getDatabase,
  db,
  pool
};

