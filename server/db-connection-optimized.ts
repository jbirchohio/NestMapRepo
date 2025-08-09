import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from "@shared/schema";
import { DB_CONFIG } from './config';
import { logger } from './utils/logger';

/**
 * Optimized Database Connection with advanced pooling
 * Free performance improvements through better connection management
 */

// Check if database URL is provided
if (!DB_CONFIG.url) {
  throw new Error("DATABASE_URL must be set. Check your environment variables.");
}

// Parse connection string to get host for logging
const dbUrl = new URL(DB_CONFIG.url);
const isLocal = dbUrl.hostname === 'localhost' || dbUrl.hostname === '127.0.0.1';

// Optimized pool configuration for maximum performance
const poolConfig: PoolConfig = {
  connectionString: DB_CONFIG.url,
  
  // Connection pool sizing (tuned for Railway/Heroku)
  max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX) : 20, // Maximum connections
  min: process.env.DB_POOL_MIN ? parseInt(process.env.DB_POOL_MIN) : 2,   // Minimum connections
  
  // Connection lifecycle
  idleTimeoutMillis: 30000,          // Close idle connections after 30 seconds
  connectionTimeoutMillis: 3000,      // Fail fast on connection attempts
  
  // Statement optimization
  statement_timeout: 30000,            // Kill queries running longer than 30 seconds
  query_timeout: 30000,               // Alternative timeout
  
  // Keep alive for persistent connections
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  
  // Application name for monitoring
  application_name: 'remvana-api',
};

// Add SSL for production
if (!isLocal && process.env.NODE_ENV === 'production') {
  poolConfig.ssl = {
    rejectUnauthorized: false // Required for Heroku/Railway
  };
}

// Create optimized connection pool
export const pool = new Pool(poolConfig);

// Connection pool monitoring
let activeConnections = 0;
let totalConnections = 0;
let connectionErrors = 0;

// Monitor pool events
pool.on('connect', (client) => {
  activeConnections++;
  totalConnections++;
  
  // Set optimal connection parameters
  client.query('SET statement_timeout = 30000'); // 30 seconds
  client.query('SET lock_timeout = 10000');      // 10 seconds
  client.query('SET idle_in_transaction_session_timeout = 60000'); // 1 minute
  
  // Enable query optimization
  client.query('SET random_page_cost = 1.1');    // Optimize for SSD
  client.query('SET effective_cache_size = "256MB"'); // Hint about available memory
  
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`Database connection established (${activeConnections}/${poolConfig.max})`);
  }
});

pool.on('remove', () => {
  activeConnections--;
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`Database connection closed (${activeConnections}/${poolConfig.max})`);
  }
});

pool.on('error', (err) => {
  connectionErrors++;
  logger.error('Database pool error:', err);
});

// Create Drizzle ORM instance with optimizations
export const db = drizzle(pool, { 
  schema,
  logger: process.env.NODE_ENV === 'development' // Only log in dev
});

// Connection health check with retries
export async function testConnection(retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await pool.query('SELECT NOW()');
      logger.info('Database connection successful', {
        timestamp: result.rows[0].now,
        attempt: i + 1
      });
      return true;
    } catch (error) {
      logger.error(`Database connection attempt ${i + 1} failed:`, error);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
      }
    }
  }
  return false;
}

// Get pool statistics
export function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    active: activeConnections,
    totalCreated: totalConnections,
    errors: connectionErrors,
    config: {
      max: poolConfig.max,
      min: poolConfig.min,
      idleTimeout: poolConfig.idleTimeoutMillis
    }
  };
}

// Query with automatic retry on connection failure
export async function queryWithRetry<T>(
  queryFn: () => Promise<T>,
  maxRetries = 2
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await queryFn();
    } catch (error: any) {
      lastError = error;
      
      // Only retry on connection errors
      if (error.code === 'ECONNREFUSED' || 
          error.code === 'ETIMEDOUT' ||
          error.code === 'ENOTFOUND') {
        logger.warn(`Query failed, retrying (${i + 1}/${maxRetries + 1}):`, error.message);
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i))); // Exponential backoff
      } else {
        throw error; // Don't retry on SQL errors
      }
    }
  }
  
  throw lastError;
}

// Graceful shutdown
export async function closePool() {
  try {
    await pool.end();
    logger.info('Database pool closed gracefully');
  } catch (error) {
    logger.error('Error closing database pool:', error);
  }
}

// Monitor pool health periodically
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    const stats = getPoolStats();
    
    // Log warning if pool is exhausted
    if (stats.active >= (poolConfig.max! * 0.8)) {
      logger.warn('Database pool near capacity', stats);
    }
    
    // Log error if too many waiting connections
    if (stats.waiting > 5) {
      logger.error('Database pool has waiting connections', stats);
    }
  }, 30000); // Check every 30 seconds
}

// Handle process termination
process.on('SIGTERM', closePool);
process.on('SIGINT', closePool);

// Export optimized query builder
export const query = {
  /**
   * Execute a query with caching and monitoring
   */
  async execute<T>(sql: string, params?: any[]): Promise<T> {
    const start = Date.now();
    try {
      const result = await pool.query(sql, params);
      const duration = Date.now() - start;
      
      // Log slow queries
      if (duration > 1000) {
        logger.warn('Slow query detected', {
          duration,
          sql: sql.substring(0, 100)
        });
      }
      
      return result.rows as T;
    } catch (error) {
      logger.error('Query execution failed', { sql: sql.substring(0, 100), error });
      throw error;
    }
  },
  
  /**
   * Execute query in transaction
   */
  async transaction<T>(fn: (client: any) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};

// Export for backward compatibility
export default db;