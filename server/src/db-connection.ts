import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "./db/schema";
import { logger } from './utils/logger';

// Simple database connection that uses environment variables directly
let dbInstance: any = null;
let poolInstance: Pool | null = null;

/**
 * Get database connection - creates it lazily when first accessed
 * No initialization required - uses environment variables directly
 */
export function getDatabase() {
  if (!dbInstance && process.env.DATABASE_URL) {
    try {
      // Create connection pool from DATABASE_URL
      poolInstance = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 5, // Small pool size
        connectionTimeoutMillis: 2000, // Fast timeout
        idleTimeoutMillis: 2000,
      });

      // Create Drizzle instance
      dbInstance = drizzle(poolInstance, { schema });
      
      logger.info('✅ Database connection created from DATABASE_URL');
    } catch (error) {
      logger.warn('⚠️ Failed to create database connection:', error instanceof Error ? error.message : error);
      return null;
    }
  }
  
  return dbInstance;
}

/**
 * Get database pool - creates it lazily when first accessed
 */
export function getPool() {
  if (!poolInstance && process.env.DATABASE_URL) {
    getDatabase(); // This will create the pool
  }
  return poolInstance;
}

/**
 * Simple async function for backward compatibility
 * No longer throws errors - just returns null if connection fails
 */
export async function initializeDatabase() {
  logger.info('🔄 Attempting database connection...');
  
  const db = getDatabase();
  if (db) {
    logger.info('✅ Database connection successful');
    return { db, pool: poolInstance };
  } else {
    logger.warn('⚠️ Database connection failed - continuing without database');
    throw new Error('Database connection failed');
  }
}

// Export the database connection instances (lazy-loaded)
export const db = getDatabase();
export const pool = getPool();

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

