import { Redis } from 'ioredis';
// Create Redis client
export const redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
});
// Add error handling
redisClient.on('error', (error: unknown) => {
    console.error('Redis error:', error);
});
redisClient.on('connect', () => {
    console.log('Redis connected successfully');
});
// Export for use in other modules
export default redisClient;
