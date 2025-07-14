import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger.js';

// Use the standard Redis client type without extending it
// This avoids type conflicts with the built-in methods
type ExtendedRedisClient = RedisClientType;

let redisClient: ExtendedRedisClient;

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
  if (!redisClient) {
    redisClient = createClient(REDIS_CONFIG);
    
    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });
    
    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });
    
    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });
    
    try {
      await redisClient.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }
}

/**
 * Get the Redis client instance
 * @throws {Error} If Redis client is not initialized
 */
export function getRedisClient(): ExtendedRedisClient {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.');
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

export const redis = {
  // Key operations
  async set(key: string, value: string, ttl?: number): Promise<void> {
    const client = getRedisClient();
    if (ttl) {
      await client.set(key, value, { EX: ttl });
    } else {
      await client.set(key, value);
    }
  },
  
  async get(key: string): Promise<string | null> {
    const client = getRedisClient();
    return client.get(key);
  },
  
  async del(key: string): Promise<number> {
    const client = getRedisClient();
    return client.del(key);
  },
  
  async exists(key: string): Promise<number> {
    const client = getRedisClient();
    return client.exists(key);
  },
  
  async setex(key: string, seconds: number, value: string): Promise<string> {
    const client = getRedisClient();
    return client.setEx(key, seconds, value);
  },
  
  async expire(key: string, seconds: number): Promise<number> {
    const client = getRedisClient();
    return client.expire(key, seconds);
  },
  
  // Add incr method
  async incr(key: string): Promise<number> {
    const client = getRedisClient();
    return client.incr(key);
  },
  
  // Hash operations
  async hset(key: string, field: string, value: string): Promise<number> {
    const client = getRedisClient();
    return client.hSet(key, field, value);
  },
  
  async hget(key: string, field: string): Promise<string | null> {
    const client = getRedisClient();
    const result = await client.hGet(key, field);
    return result ?? null;
  },
  
  async hdel(key: string, field: string): Promise<number> {
    const client = getRedisClient();
    return client.hDel(key, field);
  },
  
  // List operations
  async lpush(key: string, value: string): Promise<number> {
    const client = getRedisClient();
    return client.lPush(key, value);
  },
  
  async rpush(key: string, value: string): Promise<number> {
    const client = getRedisClient();
    return client.rPush(key, value);
  },
  
  async lpop(key: string): Promise<string | null> {
    const client = getRedisClient();
    return client.lPop(key);
  },
  
  async rpop(key: string): Promise<string | null> {
    const client = getRedisClient();
    return client.rPop(key);
  },
  
  // Set operations
  async sadd(key: string, member: string): Promise<number> {
    const client = getRedisClient();
    return client.sAdd(key, member);
  },
  
  async srem(key: string, member: string): Promise<number> {
    const client = getRedisClient();
    return client.sRem(key, member);
  },
  
  async smembers(key: string): Promise<string[]> {
    const client = getRedisClient();
    return client.sMembers(key);
  },
  
  // Sorted set operations
  async zadd(key: string, score: number, member: string): Promise<number> {
    const client = getRedisClient();
    return client.zAdd(key, { score, value: member });
  },
  
  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    const client = getRedisClient();
    return client.zRange(key, start, stop);
  },
  
  // Key patterns
  async keys(pattern: string): Promise<string[]> {
    const client = getRedisClient();
    return client.keys(pattern);
  },
  
  // Pipeline
  pipeline() {
    const client = getRedisClient();
    return client.multi();
  },
  
  // Utility functions
  async flushAll(): Promise<void> {
    const client = getRedisClient();
    await client.flushAll();
  },
  
  async ping(): Promise<string> {
    const client = getRedisClient();
    return client.ping();
  },
  
  async quit(): Promise<void> {
    const client = getRedisClient();
    await client.quit();
  },
};
