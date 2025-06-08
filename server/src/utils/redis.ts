import Redis from 'ioredis-mock';
import { logger } from './logger';

let redisClient: Redis;

// In test environment, use Redis mock automatically
if (process.env.NODE_ENV === 'test') {
  redisClient = new Redis({
    // Use in-memory mock for tests
    lazyConnect: true
  });
} else {
  // In non-test environments, use real Redis
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  redisClient = new Redis(redisUrl);

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
