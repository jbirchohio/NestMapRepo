import type { Pool, PoolConfig } from 'pg';
import { createClient } from 'redis';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import config from '../config.js';
import { logger } from '../utils/logger.js';
type QueryResult<T = any> = {
    rows: T[];
    rowCount: number;
};
type CachedQueryOptions = {
    ttl?: number; // Time to live in seconds
    key?: string; // Custom cache key
};
export class DatabaseService {
    private pool: Pool;
    private redisClient: ReturnType<typeof createClient>;
    private isCacheEnabled: boolean;
    constructor() {
        // Configure connection pool
        const poolConfig: PoolConfig = {
            connectionString: config.db.url,
            max: 20, // Maximum number of clients in the pool
            idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
            connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
            maxUses: 7500, // Close and remove a connection after it has been used 7500 times
        };
        this.pool = new Pool(poolConfig);
        this.isCacheEnabled = process.env.REDIS_URL !== undefined;
        // Initialize Redis client if cache is enabled
        if (this.isCacheEnabled) {
            this.redisClient = createClient({
                url: process.env.REDIS_URL,
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > 5) {
                            logger.warn('Max Redis reconnection attempts reached. Cache will be disabled.');
                            this.isCacheEnabled = false;
                            return new Error('Max reconnection attempts reached');
                        }
                        return Math.min(retries * 100, 5000); // Exponential backoff up to 5s
                    },
                },
            });
            this.redisClient.on('error', (err) => {
                logger.error('Redis error:', err);
                this.isCacheEnabled = false;
            });
            this.initializeRedis().catch(err => {
                logger.error('Failed to initialize Redis:', err);
                this.isCacheEnabled = false;
            });
        }
        // Set up pool event handlers
        this.pool.on('error', (err) => {
            logger.error('Unexpected error on idle client', err);
            process.exit(-1);
        });
        // Create Drizzle instance
        this.drizzle = drizzle(this.pool, {
            schema,
            logger: config.server.env === 'development'
                ? { logQuery: (query, params) => logger.debug('Query:', { query, params }) }
                : false
        });
    }
    private async initializeRedis() {
        if (!this.isCacheEnabled)
            return;
        await this.redisClient.connect();
        logger.info('Redis cache connected successfully');
    }
    /**
     * Execute a query with optional caching
     */
    public async query<T = any>(text: string, params: any[] = [], options: CachedQueryOptions = { ttl: 60 * 5 } // Default 5 minutes TTL
    ): Promise<QueryResult<T>> {
        // Generate cache key if not provided
        const cacheKey = options.key || `query:${text}:${JSON.stringify(params)}`;
        // Try to get from cache if enabled
        if (this.isCacheEnabled && options.ttl) {
            try {
                const cached = await this.redisClient.get(cacheKey);
                if (cached) {
                    logger.debug('Cache hit:', { cacheKey });
                    return JSON.parse(cached);
                }
            }
            catch (err) {
                logger.warn('Cache get error:', err);
            }
        }
        // Execute query against the database
        const start = Date.now();
        const result = await this.pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Executed query', { text, duration, rows: result.rowCount });
        // Cache the result if enabled
        if (this.isCacheEnabled && options.ttl) {
            try {
                await this.redisClient.set(cacheKey, JSON.stringify(result), { EX: options.ttl } // Set TTL in seconds
                );
            }
            catch (err) {
                logger.warn('Cache set error:', err);
            }
        }
        return result;
    }
    /**
     * Execute a transaction
     */
    public async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
        }
    }
    /**
     * Invalidate cache by key pattern
     */
    public async invalidateCache(pattern: string): Promise<void> {
        if (!this.isCacheEnabled)
            return;
        try {
            const keys = await this.redisClient.keys(pattern);
            if (keys.length > 0) {
                await this.redisClient.del(keys);
                logger.debug('Cache invalidated:', { pattern, keys });
            }
        }
        catch (err) {
            logger.warn('Cache invalidation error:', err);
        }
    }
    /**
     * Get the Drizzle ORM instance
     */
    public getDrizzle() {
        return this.drizzle;
    }
    /**
     * Close all database connections
     */
    public async close(): Promise<void> {
        await this.pool.end();
        if (this.isCacheEnabled) {
            await this.redisClient.quit();
        }
    }
}
// Create and export a singleton instance
export const dbService = new DatabaseService();
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received. Closing database connections...');
    await dbService.close();
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger.info('SIGINT received. Closing database connections...');
    await dbService.close();
    process.exit(0);
});
