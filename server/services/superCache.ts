import { createLRUCache } from '../utils/lruCache';
import { logger } from '../utils/logger';

/**
 * SuperCache - Aggressive in-memory caching to maximize Railway's 512MB limit
 * Free performance boost by caching everything possible
 */
export class SuperCache {
  // Multiple cache tiers for different data types
  private templateCache: any;
  private queryCache: any;
  private userCache: any;
  private geoCache: any;
  private staticCache: any;

  // Cache stats for monitoring
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    memoryUsage: 0
  };

  constructor() {
    // Allocate cache sizes based on importance and update frequency
    // Total ~400MB to stay within Railway's 512MB limit

    // Templates change rarely, cache aggressively (150MB)
    this.templateCache = createLRUCache({
      max: 2000, // ~2000 templates
      ttl: 1000 * 60 * 60 * 24, // 24 hours
      sizeCalculation: (value) => JSON.stringify(value).length,
      maxSize: 150 * 1024 * 1024, // 150MB
      dispose: () => this.stats.evictions++
    });

    // Query results cache (100MB)
    this.queryCache = createLRUCache({
      max: 5000,
      ttl: 1000 * 60 * 5, // 5 minutes for dynamic queries
      sizeCalculation: (value) => JSON.stringify(value).length,
      maxSize: 100 * 1024 * 1024,
      dispose: () => this.stats.evictions++
    });

    // User data cache (50MB)
    this.userCache = createLRUCache({
      max: 10000,
      ttl: 1000 * 60 * 30, // 30 minutes
      sizeCalculation: (value) => JSON.stringify(value).length,
      maxSize: 50 * 1024 * 1024,
      dispose: () => this.stats.evictions++
    });

    // Geocoding cache - permanent (50MB)
    this.geoCache = createLRUCache({
      max: 50000,
      ttl: 1000 * 60 * 60 * 24 * 30, // 30 days - geocoding doesn't change
      sizeCalculation: (value) => JSON.stringify(value).length,
      maxSize: 50 * 1024 * 1024,
      dispose: () => this.stats.evictions++
    });

    // Static data cache - permanent (50MB)
    this.staticCache = createLRUCache({
      max: 1000,
      ttl: 1000 * 60 * 60 * 24 * 7, // 1 week
      sizeCalculation: (value) => JSON.stringify(value).length,
      maxSize: 50 * 1024 * 1024,
      dispose: () => this.stats.evictions++
    });

    // Preload common data on startup
    this.preloadStaticData();

    // Log cache stats every 5 minutes
    setInterval(() => this.logStats(), 5 * 60 * 1000);
  }

  /**
   * Get or set template data
   */
  async getTemplate(id: number, fetcher?: () => Promise<any>): Promise<any> {
    const key = `template:${id}`;

    let cached = this.templateCache.get(key);
    if (cached) {
      this.stats.hits++;
      return cached;
    }

    this.stats.misses++;

    if (fetcher) {
      const data = await fetcher();
      if (data) {
        this.templateCache.set(key, data);
      }
      return data;
    }

    return null;
  }

  /**
   * Cache query results with intelligent key generation
   */
  async getQuery(queryKey: string, fetcher: () => Promise<any>, ttlSeconds?: number): Promise<any> {
    let cached = this.queryCache.get(queryKey);
    if (cached) {
      this.stats.hits++;
      return cached;
    }

    this.stats.misses++;

    const data = await fetcher();
    if (data) {
      const options: any = {};
      if (ttlSeconds) {
        options.ttl = ttlSeconds * 1000;
      }
      this.queryCache.set(queryKey, data, options);
    }

    return data;
  }

  /**
   * Batch get multiple items efficiently
   */
  async batchGet<T>(
    keys: string[],
    cache: LRUCache<string, T>,
    fetcher: (missingKeys: string[]) => Promise<Map<string, T>>
  ): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const missingKeys: string[] = [];

    // Check cache first
    for (const key of keys) {
      const cached = cache.get(key);
      if (cached) {
        results.set(key, cached);
        this.stats.hits++;
      } else {
        missingKeys.push(key);
        this.stats.misses++;
      }
    }

    // Fetch missing items
    if (missingKeys.length > 0) {
      const fetched = await fetcher(missingKeys);
      for (const [key, value] of fetched) {
        cache.set(key, value);
        results.set(key, value);
      }
    }

    return results;
  }

  /**
   * Invalidate caches selectively
   */
  invalidateTemplate(id: number) {
    this.templateCache.delete(`template:${id}`);
    // Also invalidate related queries
    this.invalidatePattern('template-list');
    this.invalidatePattern('popular-templates');
  }

  invalidateUser(id: number) {
    this.userCache.delete(`user:${id}`);
    this.invalidatePattern(`user-${id}`);
  }

  invalidatePattern(pattern: string) {
    // Invalidate all query cache entries matching pattern
    for (const key of this.queryCache.keys()) {
      if (key.includes(pattern)) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * Preload commonly accessed data
   */
  private async preloadStaticData() {
    try {
      // Cache popular destinations
      this.staticCache.set('popular-destinations', [
        'Paris', 'Tokyo', 'New York', 'London', 'Rome',
        'Barcelona', 'Amsterdam', 'Berlin', 'Singapore', 'Dubai'
      ]);

      // Cache common tags
      this.staticCache.set('common-tags', [
        'adventure', 'romantic', 'family', 'budget', 'luxury',
        'cultural', 'beach', 'city', 'nature', 'food'
      ]);

      // Cache price ranges
      this.staticCache.set('price-ranges', [
        { min: 0, max: 0, label: 'Free' },
        { min: 1, max: 10, label: '$1-10' },
        { min: 11, max: 25, label: '$11-25' },
        { min: 26, max: 50, label: '$26-50' },
        { min: 51, max: 100, label: '$51-100' },
        { min: 101, max: null, label: '$100+' }
      ]);

      logger.info('Static data preloaded into cache');
    } catch (error) {
      logger.error('Failed to preload static data:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalSize =
      this.templateCache.calculatedSize +
      this.queryCache.calculatedSize +
      this.userCache.calculatedSize +
      this.geoCache.calculatedSize +
      this.staticCache.calculatedSize;

    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      totalSize: totalSize,
      caches: {
        templates: {
          size: this.templateCache.size,
          maxSize: this.templateCache.max,
          memoryUsage: this.templateCache.calculatedSize
        },
        queries: {
          size: this.queryCache.size,
          maxSize: this.queryCache.max,
          memoryUsage: this.queryCache.calculatedSize
        },
        users: {
          size: this.userCache.size,
          maxSize: this.userCache.max,
          memoryUsage: this.userCache.calculatedSize
        },
        geo: {
          size: this.geoCache.size,
          maxSize: this.geoCache.max,
          memoryUsage: this.geoCache.calculatedSize
        },
        static: {
          size: this.staticCache.size,
          maxSize: this.staticCache.max,
          memoryUsage: this.staticCache.calculatedSize
        }
      }
    };
  }

  /**
   * Clear all caches (use sparingly)
   */
  clearAll() {
    this.templateCache.clear();
    this.queryCache.clear();
    this.userCache.clear();
    this.geoCache.clear();
    this.staticCache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      memoryUsage: 0
    };
    logger.info('All caches cleared');
  }

  /**
   * Log cache statistics
   */
  private logStats() {
    const stats = this.getStats();
    logger.info('Cache statistics', {
      hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
      totalSize: `${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`,
      evictions: stats.evictions
    });
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(storage: any) {
    try {
      logger.info('Warming up cache...');

      // Cache top templates
      const topTemplates = await storage.searchTemplates({
        sort: 'popular',
        limit: 100
      });

      for (const template of topTemplates.templates) {
        this.templateCache.set(`template:${template.id}`, template);
      }

      // Cache recent templates
      const recentTemplates = await storage.searchTemplates({
        sort: 'newest',
        limit: 50
      });

      for (const template of recentTemplates.templates) {
        this.templateCache.set(`template:${template.id}`, template);
      }

      logger.info(`Cache warmed up with ${this.templateCache.size} templates`);
    } catch (error) {
      logger.error('Cache warmup failed:', error);
    }
  }

  /**
   * Smart caching based on access patterns
   */
  adaptiveCaching(key: string, data: any) {
    // Track access frequency (simple implementation)
    const accessCount = this.queryCache.get(`access:${key}`) || 0;
    this.queryCache.set(`access:${key}`, accessCount + 1, { ttl: 1000 * 60 * 60 });

    // Adjust TTL based on access frequency
    let ttl = 1000 * 60 * 5; // 5 minutes default
    if (accessCount > 100) {
      ttl = 1000 * 60 * 60; // 1 hour for very popular
    } else if (accessCount > 50) {
      ttl = 1000 * 60 * 30; // 30 minutes for popular
    } else if (accessCount > 10) {
      ttl = 1000 * 60 * 15; // 15 minutes for moderate
    }

    this.queryCache.set(key, data, { ttl });
  }
}

// Singleton instance
export const superCache = new SuperCache();