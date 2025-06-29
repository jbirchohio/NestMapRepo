import { Redis } from 'ioredis';
import { logger } from './logger.js';

// In-memory fallback store
const memoryStore: Record<string, { value: any; expires?: number }> = {};

// Redis client with fallback to in-memory store
export class RedisWithFallback {
  private client: Redis | null = null;
  private useMemoryStore = false;

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis() {
    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
        retryStrategy: () => {
          this.useMemoryStore = true;
          return null; // Stop retrying
        },
      });

      this.client.on('error', (error: unknown) => {
        logger.error('Redis error:', error);
        this.useMemoryStore = true;
      });

      this.client.on('connect', () => {
        logger.info('Connected to Redis');
        this.useMemoryStore = false;
      });
    } catch (error) {
      logger.error('Failed to initialize Redis, using in-memory store:', error);
      this.useMemoryStore = true;
    }
  }

  async get(key: string) {
    if (!this.useMemoryStore && this.client) {
      try {
        const value = await this.client!.get(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        logger.warn('Redis get failed, falling back to memory store:', error);
        this.useMemoryStore = true;
      }
    }
    const item = memoryStore[key];
    if (!item) return null;
    if (item.expires && item.expires < Date.now()) {
      delete memoryStore[key];
      return null;
    }
    return item.value;
  }

  /**
   * Set a value in the store with an optional TTL (in milliseconds).
   * If the Redis client is available, it will be used. Otherwise, the in-memory store is used.
   * If the Redis client is used and the operation fails, the in-memory store is used as a fallback.
   * @param key The key to set
   * @param value The value to set
   * @param ttlMs Optional TTL in milliseconds
   */
  async set(key: string, value: any, ttlMs?: number) {
    const item: { value: any; expires?: number } = { value };
    if (ttlMs) {
      item.expires = Date.now() + ttlMs;
    }

    if (!this.useMemoryStore && this.client) {
      try {
        await this.client!.set(
          key,
          JSON.stringify(value),
          'PX',
          ttlMs
        );
        return;
      } catch (error) {
        logger.warn('Redis set failed, falling back to memory store:', error);
        this.useMemoryStore = true;
      }
    }
    memoryStore[key] = item;
  }

  async del(key: string) {
    if (!this.useMemoryStore && this.client) {
      try {
        await this.client!.del(key);
        return;
      } catch (error) {
        logger.warn('Redis del failed, falling back to memory store:', error);
        this.useMemoryStore = true;
      }
    }
    delete memoryStore[key];
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
    }
  }
}

// Create and export a singleton instance
export const redisClient = new RedisWithFallback();

// Clean up expired items from memory store periodically
setInterval(() => {
  const now = Date.now();
  Object.entries(memoryStore).forEach(([key, item]) => {
    if (item.expires && item.expires < now) {
      delete memoryStore[key];
    }
  });
}, 60 * 1000); // Run every minute

export default redisClient;
