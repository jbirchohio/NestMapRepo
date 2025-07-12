import Redis from 'ioredis-mock.js';
import type { Redis as RedisType } from 'ioredis.js';
import { logger } from './logger.js';

let redisClient: RedisType;

// In test environment, use Redis mock automatically
if (process.env.NODE_ENV === 'test') {
  redisClient = new (Redis as any)({
    // Use in-memory mock for tests
    lazyConnect: true
  });
} else {
  // In non-test environments, use real Redis
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379.js';
  redisClient = new (Redis as any)(redisUrl);

  // Only set up event handlers for non-test environments
  redisClient.on('connect', () => {
    logger.info('Redis client connected');
  });

  redisClient.on('error', (err) => {
    logger.error('Redis error:', err);
  });
}

export const redis = redisClient;
export default redisClient;
