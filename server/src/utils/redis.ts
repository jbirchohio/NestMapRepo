import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';
import { logger } from './logger';

// Create a type that includes both Redis client and EventEmitter methods
type RedisClient = Redis & {
  on(event: string, listener: (...args: any[]) => void): RedisClient;
  once(event: string, listener: (...args: any[]) => void): RedisClient;
  off(event: string, listener: (...args: any[]) => void): RedisClient;
  emit(event: string, ...args: any[]): boolean;
};

// The Redis client instance
let redisClient: RedisClient;

// In test environment, use Redis mock automatically
if (process.env.NODE_ENV === 'test') {
  // Use the mock Redis client for tests
  redisClient = new RedisMock({
    lazyConnect: true
  }) as unknown as RedisClient;
  
  logger.info('Using mock Redis client for tests');
} else {
  // In non-test environments, use real Redis
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  redisClient = new Redis(redisUrl) as RedisClient;

  // Set up event handlers for non-test environments
  redisClient.on('connect', () => {
    logger.info('Redis client connected');
  });

  redisClient.on('error', (err) => {
    logger.error('Redis error:', err);
  });
}

export const redis = redisClient;
export { redisClient };
export default redisClient;
