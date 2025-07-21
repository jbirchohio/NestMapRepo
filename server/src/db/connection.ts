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
    const connectionString = getDatabaseUrl();
    
    if (!connectionString) {
      throw new Error('Database connection information is required');
    }

    // Create postgres client
    client = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    // Create drizzle instance with schema
    db = drizzle(client, { schema: allSchemas });

    // Test the connection
    await client`SELECT 1`;
    
    logger.info('Database connection established successfully');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
};

const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
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
