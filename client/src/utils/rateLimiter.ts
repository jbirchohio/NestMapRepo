import { handleError } from './errorHandler';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export class RateLimiter {
  private static instance: RateLimiter;
  private rateLimits: Map<string, { count: number; timestamp: number }>;
  private config: RateLimitConfig;

  private constructor(config?: RateLimitConfig) {
    this.rateLimits = new Map();
    this.config = {
      maxRequests: 100, // Default: 100 requests
      windowMs: 60000,  // Default: 1 minute
      ...config
    };
  }

  public static getInstance(config?: RateLimitConfig): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter(config);
    }
    return RateLimiter.instance;
  }

  /**
   * Check if the request is within rate limits
   * @param key Unique identifier for the request (e.g., IP address, user ID)
   * @returns boolean indicating if the request is allowed
   */
  public isAllowed(key: string): boolean {
    const now = Date.now();
    const limit = this.rateLimits.get(key) || { count: 0, timestamp: now };

    // Reset counter if window has expired
    if (now - limit.timestamp > this.config.windowMs) {
      limit.count = 1;
      limit.timestamp = now;
    } else {
      limit.count++;
    }

    this.rateLimits.set(key, limit);
    
    if (limit.count > this.config.maxRequests) {
      return false;
    }
    
    return true;
  }

  /**
   * Clear all rate limits
   */
  public clear(): void {
    this.rateLimits.clear();
  }

  /**
   * Get current rate limit status
   * @param key Unique identifier
   * @returns Object with current count and remaining time
   */
  public getStatus(key: string): {
    count: number;
    remainingTime: number;
    isLimited: boolean;
  } {
    const now = Date.now();
    const limit = this.rateLimits.get(key) || { count: 0, timestamp: now };
    
    return {
      count: limit.count,
      remainingTime: Math.max(0, this.config.windowMs - (now - limit.timestamp)),
      isLimited: limit.count > this.config.maxRequests
    };
  }

  /**
   * Reset rate limit for a specific key
   * @param key Unique identifier
   */
  public reset(key: string): void {
    this.rateLimits.delete(key);
  }
}
