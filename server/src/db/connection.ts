import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { logger } from '../utils/logger';
import * as schema from './schema';
import * as tripSchema from './tripSchema';
import { getDatabaseUrl } from '../../config';

// Combine all schemas
const allSchemas = { ...schema, ...tripSchema };

// Database connection
let db: ReturnType<typeof drizzle> | null = null;
let client: postgres.Sql | null = null;

const connectDatabase = async (): Promise<void> => {
  try {
    // First try DATABASE_URL directly from environment
    let connectionString = process.env.DATABASE_URL;
    
    // Fallback to getDatabaseUrl() function
    if (!connectionString) {
      connectionString = getDatabaseUrl();
    }
    
    if (!connectionString) {
      logger.warn('⚠️ No database URL found. Server will start without database.');
      logger.info('Available env vars:', {
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
        SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
        SUPABASE_DB_PASSWORD: process.env.SUPABASE_DB_PASSWORD ? 'SET' : 'NOT SET'
      });
      return;
    }

    logger.info('🔌 Attempting to connect to database (non-blocking)...');
    logger.info('Connection string format:', connectionString.replace(/:[^:@]*@/, ':***@')); // Hide password

    // Create postgres client with aggressive timeouts
    client = postgres(connectionString, {
      max: 2,
      idle_timeout: 5,
      connect_timeout: 3, // 3 second timeout
      prepare: false,
      ssl: { rejectUnauthorized: false }
    });

    // Create drizzle instance with schema
    db = drizzle(client, { schema: allSchemas });

    // Test the connection with timeout
    const testQuery = client`SELECT 1`;
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection test timeout after 2 seconds')), 2000)
    );
    
    await Promise.race([testQuery, timeout]);
    
    logger.info('✅ Database connection established successfully');
  } catch (error) {
    logger.warn('⚠️ Database connection failed - continuing without database:');
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        logger.warn('💡 Database connection timed out. Server starting in offline mode.');
      } else if (error.message.includes('ENOTFOUND')) {
        logger.warn('💡 Database host not found. Server starting in offline mode.');
      } else {
        logger.warn('💡 Database error:', error.message);
      }
    }
    
    // Clean up client if it was created
    if (client) {
      try {
        await client.end();
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      client = null;
    }
    
    logger.info('🚀 Server will start without database connection. API endpoints will return mock data.');
    // Don't throw - let server start without database
  }
};

const getDatabase = () => {
  if (!db) {
    logger.warn('⚠️ Database not available - some features may be limited');
    return null;
  }
  return db;
};

const closeDatabase = async (): Promise<void> => {
  if (client) {
    await client.end();
    client = null;
    db = null;
    logger.info('Database connection closed');
  }
};

export { connectDatabase, getDatabase, closeDatabase };
export default { connectDatabase, getDatabase, closeDatabase };
