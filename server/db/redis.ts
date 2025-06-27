import { createClient } from 'redis';
import type { RedisClientType, RedisModules, RedisFunctions, RedisScripts } from 'redis';
import { logger } from '../utils/logger.js';

// Define a type for our Redis client with all the methods we use
type RedisClient = RedisClientType<RedisModules, RedisFunctions, RedisScripts>;

// In-memory store for fallback
const memoryStore: Record<string, { value: any; expiresAt?: number }> = {};
let useMemoryStore = false;

// Define the interface for our Redis wrapper
export interface IRedisClient {
  // Key operations
  set(key: string, value: string, ttl?: number): Promise<void>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  setex(key: string, seconds: number, value: string): Promise<string>;
  expire(key: string, seconds: number): Promise<number>;
  incr(key: string): Promise<number>;
  
  // Hash operations
  hset(key: string, field: string, value: string): Promise<number>;
  hget(key: string, field: string): Promise<string | null>;
  hdel(key: string, field: string): Promise<number>;
  
  // List operations
  lpush(key: string, value: string): Promise<number>;
  rpush(key: string, value: string): Promise<number>;
  lpop(key: string): Promise<string | null>;
  rpop(key: string): Promise<string | null>;
  
  // Set operations
  sadd(key: string, member: string): Promise<number>;
  srem(key: string, member: string): Promise<number>;
  smembers(key: string): Promise<string[]>;
  
  // Sorted set operations
  zadd(key: string, score: number, member: string): Promise<number>;
  zrange(key: string, start: number, stop: number): Promise<string[]>;
  
  // Key patterns
  keys(pattern: string): Promise<string[]>;
  
  // Pipeline
  pipeline(): any;
  
  // Utility functions
  flushAll(): Promise<void>;
  ping(): Promise<string>;
  quit(): Promise<void>;
  
  // Internal state
  isMemoryStore(): boolean;
}
let redisClient: RedisClient | null = null;
// Redis connection options
const REDIS_CONFIG = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: (retries: number): number | Error => {
            if (retries > 5) {
                logger.error('Max retries reached for Redis connection');
                return new Error('Max retries reached');
            }
            // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1.6s
            return Math.min(retries * 100, 1600);
        },
    },
} as const;

/**
 * Initialize Redis connection
 */
export async function initializeRedis(): Promise<void> {
  try {
    redisClient = createClient(REDIS_CONFIG) as RedisClient;

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('end', () => {
      logger.warn('Redis client connection closed');
    });

    await redisClient.connect();
    logger.info('Redis client connected successfully');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

/**
 * Get the Redis client instance
 * @throws {Error} If Redis client is not initialized
 */
export function getRedisClient(): RedisClient {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.');
  }
  if (!redisClient.isOpen) {
    throw new Error('Redis client is not connected. Check your Redis server.');
  }
  return redisClient;
}

/**
 * Gracefully close the Redis connection
 */
export async function closeRedis(): Promise<void> {
    if (redisClient) {
        try {
            await redisClient.quit();
            logger.info('Redis connection closed');
        } catch (error) {
            logger.error('Error closing Redis connection:', error);
            throw error;
        }
    }
}

// Initialize Redis when this module is imported
initializeRedis().catch(error => {
    logger.error('Failed to initialize Redis:', error);
    process.exit(1);
});

// Handle process termination
process.on('SIGINT', async () => {
    await closeRedis();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeRedis();
    process.exit(0);
});

// Initialize Redis when this module is imported
initializeRedis().catch(error => {
    logger.error('Failed to initialize Redis, falling back to in-memory store:', error);
    useMemoryStore = true;
});

// Clean up expired keys from memory store
setInterval(() => {
    if (!useMemoryStore) return;
    
    const now = Date.now();
    for (const [key, { expiresAt }] of Object.entries(memoryStore)) {
        if (expiresAt && expiresAt < now) {
            delete memoryStore[key];
        }
    }
}, 60000); // Run every minute

// Helper function to handle Redis operations with fallback
async function withFallback<T>(
    redisOp: () => Promise<T>,
    memoryOp: () => Promise<T>,
    operation: string
): Promise<T> {
    if (useMemoryStore) {
        return memoryOp();
    }

    try {
        return await redisOp();
    } catch (error) {
        logger.warn(`Redis operation ${operation} failed, falling back to memory store:`, error);
        useMemoryStore = true;
        return memoryOp();
    }
}

// Export the Redis client with all methods
export const redis: IRedisClient = {
    // Internal state
    isMemoryStore(): boolean {
        return useMemoryStore;
    },

    // Key operations
    async set(key: string, value: string, ttl?: number): Promise<void> {
        await withFallback(
            async () => {
                const client = getRedisClient();
                if (ttl) {
                    await client.set(key, value, { EX: ttl });
                } else {
                    await client.set(key, value);
                }
            },
            async () => {
                memoryStore[key] = {
                    value,
                    expiresAt: ttl ? Date.now() + ttl * 1000 : undefined
                };
            },
            'set'
        );
    },

    async get(key: string): Promise<string | null> {
        return withFallback(
            async () => {
                const client = getRedisClient();
                return client.get(key);
            },
            async () => {
                const item = memoryStore[key];
                if (!item) return null;
                
                // Check if the item has expired
                if (item.expiresAt && item.expiresAt < Date.now()) {
                    delete memoryStore[key];
                    return null;
                }
                
                return String(item.value);
            },
            'get'
        );
    },

    async del(key: string): Promise<number> {
        return withFallback(
            async () => {
                const client = getRedisClient();
                return client.del(key);
            },
            async () => {
                const exists = key in memoryStore;
                if (exists) {
                    delete memoryStore[key];
                    return 1;
                }
                return 0;
            },
            'del'
        );
    },

    async exists(key: string): Promise<number> {
        return withFallback(
            async () => {
                const client = getRedisClient();
                return (await client.exists(key)) > 0 ? 1 : 0;
            },
            async () => {
                return key in memoryStore ? 1 : 0;
            },
            'exists'
        );
    },

    async setex(key: string, seconds: number, value: string): Promise<string> {
        await this.set(key, value, seconds);
        return 'OK';
    },

    async expire(key: string, seconds: number): Promise<number> {
        if (useMemoryStore) {
            if (key in memoryStore) {
                memoryStore[key].expiresAt = Date.now() + seconds * 1000;
                return 1;
            }
            return 0;
        }

        try {
            const client = getRedisClient();
            return await client.expire(key, seconds) ? 1 : 0;
        } catch (error) {
            logger.warn('Redis expire failed, falling back to memory store:', error);
            useMemoryStore = true;
            return this.expire(key, seconds);
        }
    },

    async incr(key: string): Promise<number> {
        return withFallback(
            async () => {
                const client = getRedisClient();
                return client.incr(key);
            },
            async () => {
                const current = parseInt(await this.get(key) || '0', 10);
                const newValue = current + 1;
                await this.set(key, newValue.toString());
                return newValue;
            },
            'incr'
        );
    },

    // Hash operations
    async hset(key: string, field: string, value: string): Promise<number> {
        if (useMemoryStore) {
            if (!memoryStore[key]) {
                memoryStore[key] = { value: {} };
            }
            const isNew = !(field in memoryStore[key].value);
            memoryStore[key].value[field] = value;
            return isNew ? 1 : 0;
        }

        try {
            const client = getRedisClient();
            return await client.hSet(key, field, value);
        } catch (error) {
            logger.warn('Redis hset failed, falling back to memory store:', error);
            useMemoryStore = true;
            return this.hset(key, field, value);
        }
    },

    async hget(key: string, field: string): Promise<string | null> {
        return withFallback(
            async () => {
                const client = getRedisClient();
                return client.hGet(key, field);
            },
            async () => {
                if (!memoryStore[key] || typeof memoryStore[key].value !== 'object') {
                    return null;
                }
                return memoryStore[key].value[field] || null;
            },
            'hget'
        );
    },

    async hdel(key: string, field: string): Promise<number> {
        if (useMemoryStore) {
            if (!memoryStore[key] || typeof memoryStore[key].value !== 'object' || !(field in memoryStore[key].value)) {
                return 0;
            }
            delete memoryStore[key].value[field];
            return 1;
        }

        try {
            const client = getRedisClient();
            return await client.hDel(key, field);
        } catch (error) {
            logger.warn('Redis hdel failed, falling back to memory store:', error);
            useMemoryStore = true;
            return this.hdel(key, field);
        }
    },

    // List operations (simplified for in-memory fallback)
    async lpush(key: string, value: string): Promise<number> {
        if (useMemoryStore) {
            if (!memoryStore[key]) {
                memoryStore[key] = { value: [] };
            }
            if (!Array.isArray(memoryStore[key].value)) {
                memoryStore[key].value = [];
            }
            memoryStore[key].value.unshift(value);
            return memoryStore[key].value.length;
        }

        try {
            const client = getRedisClient();
            return await client.lPush(key, value);
        } catch (error) {
            logger.warn('Redis lpush failed, falling back to memory store:', error);
            useMemoryStore = true;
            return this.lpush(key, value);
        }
    },

    async rpush(key: string, value: string): Promise<number> {
        if (useMemoryStore) {
            if (!memoryStore[key]) {
                memoryStore[key] = { value: [] };
            }
            if (!Array.isArray(memoryStore[key].value)) {
                memoryStore[key].value = [];
            }
            memoryStore[key].value.push(value);
            return memoryStore[key].value.length;
        }

        try {
            const client = getRedisClient();
            return await client.rPush(key, value);
        } catch (error) {
            logger.warn('Redis rpush failed, falling back to memory store:', error);
            useMemoryStore = true;
            return this.rpush(key, value);
        }
    },

    async lpop(key: string): Promise<string | null> {
        return withFallback(
            async () => {
                const client = getRedisClient();
                return client.lPop(key);
            },
            async () => {
                if (!memoryStore[key] || !Array.isArray(memoryStore[key].value) || memoryStore[key].value.length === 0) {
                    return null;
                }
                return memoryStore[key].value.shift();
            },
            'lpop'
        );
    },

    async rpop(key: string): Promise<string | null> {
        return withFallback(
            async () => {
                const client = getRedisClient();
                return client.rPop(key);
            },
            async () => {
                if (!memoryStore[key] || !Array.isArray(memoryStore[key].value) || memoryStore[key].value.length === 0) {
                    return null;
                }
                return memoryStore[key].value.pop();
            },
            'rpop'
        );
    },

    // Set operations (simplified for in-memory fallback)
    async sadd(key: string, member: string): Promise<number> {
        if (useMemoryStore) {
            if (!memoryStore[key]) {
                memoryStore[key] = { value: new Set() };
            }
            if (!(memoryStore[key].value instanceof Set)) {
                memoryStore[key].value = new Set();
            }
            const sizeBefore = memoryStore[key].value.size;
            memoryStore[key].value.add(member);
            return memoryStore[key].value.size > sizeBefore ? 1 : 0;
        }

        try {
            const client = getRedisClient();
            return await client.sAdd(key, member);
        } catch (error) {
            logger.warn('Redis sadd failed, falling back to memory store:', error);
            useMemoryStore = true;
            return this.sadd(key, member);
        }
    },

    async srem(key: string, member: string): Promise<number> {
        if (useMemoryStore) {
            if (!memoryStore[key] || !(memoryStore[key].value instanceof Set)) {
                return 0;
            }
            return memoryStore[key].value.delete(member) ? 1 : 0;
        }

        try {
            const client = getRedisClient();
            return await client.sRem(key, member);
        } catch (error) {
            logger.warn('Redis srem failed, falling back to memory store:', error);
            useMemoryStore = true;
            return this.srem(key, member);
        }
    },

    async smembers(key: string): Promise<string[]> {
        return withFallback(
            async () => {
                const client = getRedisClient();
                return client.sMembers(key);
            },
            async () => {
                if (!memoryStore[key] || !(memoryStore[key].value instanceof Set)) {
                    return [];
                }
                return Array.from(memoryStore[key].value);
            },
            'smembers'
        );
    },

    // Sorted set operations (simplified for in-memory fallback)
    async zadd(key: string, score: number, member: string): Promise<number> {
        if (useMemoryStore) {
            if (!memoryStore[key]) {
                memoryStore[key] = { value: [] };
            }
            if (!Array.isArray(memoryStore[key].value)) {
                memoryStore[key].value = [];
            }
            
            const existingIndex = memoryStore[key].value.findIndex((item: any) => item.member === member);
            if (existingIndex >= 0) {
                memoryStore[key].value[existingIndex] = { score, member };
                return 0; // Updated existing member
            } else {
                memoryStore[key].value.push({ score, member });
                return 1; // Added new member
            }
        }

        try {
            const client = getRedisClient();
            return await client.zAdd(key, { score, value: member });
        } catch (error) {
            logger.warn('Redis zadd failed, falling back to memory store:', error);
            useMemoryStore = true;
            return this.zadd(key, score, member);
        }
    },

    async zrange(key: string, start: number, stop: number): Promise<string[]> {
        return withFallback(
            async () => {
                const client = getRedisClient();
                return client.zRange(key, start, stop);
            },
            async () => {
                if (!memoryStore[key] || !Array.isArray(memoryStore[key].value)) {
                    return [];
                }
                return memoryStore[key].value
                    .sort((a: any, b: any) => a.score - b.score)
                    .slice(start, stop + 1)
                    .map((item: any) => item.member);
            },
            'zrange'
        );
    },

    // Key patterns (simplified for in-memory fallback)
    async keys(pattern: string): Promise<string[]> {
        if (useMemoryStore) {
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
            return Object.keys(memoryStore).filter(key => regex.test(key));
        }

        try {
            const client = getRedisClient();
            return client.keys(pattern);
        } catch (error) {
            logger.warn('Redis keys failed, falling back to memory store:', error);
            useMemoryStore = true;
            return this.keys(pattern);
        }
    },

    // Pipeline (simplified for in-memory fallback)
    pipeline() {
        if (useMemoryStore) {
            // Return a simple mock pipeline for in-memory store
            return {
                async exec() {
                    return [];
                },
                set() { return this; },
                get() { return this; },
                // Add other methods as needed
            };
        }

        try {
            const client = getRedisClient();
            return client.multi();
        } catch (error) {
            logger.warn('Redis pipeline failed, falling back to memory store:', error);
            useMemoryStore = true;
            return this.pipeline();
        }
    },

    // Utility functions
    async flushAll(): Promise<void> {
        if (useMemoryStore) {
            Object.keys(memoryStore).forEach(key => delete memoryStore[key]);
            return;
        }

        try {
            const client = getRedisClient();
            await client.flushAll();
        } catch (error) {
            logger.warn('Redis flushAll failed, falling back to memory store:', error);
            useMemoryStore = true;
            return this.flushAll();
        }
    },

    async ping(): Promise<string> {
        if (useMemoryStore) {
            return 'PONG';
        }

        try {
            const client = getRedisClient();
            return client.ping();
        } catch (error) {
            logger.warn('Redis ping failed, falling back to memory store:', error);
            useMemoryStore = true;
            return 'PONG';
        }
    },

    async quit(): Promise<void> {
        if (useMemoryStore) {
            return;
        }
        
        try {
            await closeRedis();
        } catch (error) {
            logger.warn('Error closing Redis connection:', error);
            useMemoryStore = true;
        }
    },
};
