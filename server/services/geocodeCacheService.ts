import { createLRUCache } from '../utils/lruCache';
import { logger } from '../utils/logger';

interface GeocodedLocation {
  latitude: string;
  longitude: string;
  formattedAddress?: string;
}

interface CacheEntry {
  result: GeocodedLocation | null;
  timestamp: number;
}

export class GeocodeCacheService {
  private cache: any;
  private readonly TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly MAX_SIZE_MB = 50; // 50MB for geocode cache
  private readonly MAX_ENTRIES = 10000; // Max 10,000 locations cached

  constructor() {
    this.cache = createLRUCache<string, CacheEntry>({
      max: this.MAX_ENTRIES,
      maxSize: this.MAX_SIZE_MB * 1024 * 1024, // Convert to bytes
      sizeCalculation: (value: CacheEntry) => {
        // Estimate size of cached entry
        return JSON.stringify(value).length;
      },
      ttl: this.TTL_MS,
      updateAgeOnGet: true, // Reset TTL on access
      updateAgeOnHas: false,
    });

    logger.info(`GeocodeCache initialized with ${this.MAX_ENTRIES} max entries, ${this.MAX_SIZE_MB}MB max size`);
  }

  /**
   * Generate a cache key from location name and context
   */
  private getCacheKey(locationName: string, cityContext?: string): string {
    const normalizedLocation = locationName.toLowerCase().trim();
    const normalizedContext = cityContext?.toLowerCase().trim() || '';
    return `geo:${normalizedLocation}:${normalizedContext}`;
  }

  /**
   * Get cached geocode result
   */
  get(locationName: string, cityContext?: string): GeocodedLocation | null | undefined {
    const key = this.getCacheKey(locationName, cityContext);
    const entry = this.cache.get(key);
    
    if (entry) {
      const age = Date.now() - entry.timestamp;
      logger.debug(`GeocodeCache hit for "${locationName}" (age: ${Math.round(age / 1000)}s)`);
      return entry.result;
    }
    
    return undefined; // undefined means not in cache
  }

  /**
   * Store geocode result in cache
   */
  set(locationName: string, result: GeocodedLocation | null, cityContext?: string): void {
    const key = this.getCacheKey(locationName, cityContext);
    const entry: CacheEntry = {
      result,
      timestamp: Date.now()
    };
    
    this.cache.set(key, entry);
    logger.debug(`GeocodeCache stored result for "${locationName}"`);
  }

  /**
   * Check if location is in cache
   */
  has(locationName: string, cityContext?: string): boolean {
    const key = this.getCacheKey(locationName, cityContext);
    return this.cache.has(key);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const size = this.cache.size;
    const calculatedSize = this.cache.calculatedSize;
    const hitRate = this.cache.size > 0 
      ? Math.round((this.cache.size / this.MAX_ENTRIES) * 100) 
      : 0;

    return {
      entries: size,
      sizeBytes: calculatedSize,
      sizeMB: Math.round((calculatedSize / (1024 * 1024)) * 100) / 100,
      hitRate: `${hitRate}%`,
      maxEntries: this.MAX_ENTRIES,
      maxSizeMB: this.MAX_SIZE_MB,
      ttlDays: Math.round(this.TTL_MS / (24 * 60 * 60 * 1000))
    };
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    logger.info('GeocodeCache cleared');
  }

  /**
   * Remove expired entries
   */
  purgeExpired(): number {
    const beforeSize = this.cache.size;
    this.cache.purgeStale();
    const purged = beforeSize - this.cache.size;
    
    if (purged > 0) {
      logger.info(`GeocodeCache purged ${purged} expired entries`);
    }
    
    return purged;
  }
}

// Export singleton instance
export const geocodeCacheService = new GeocodeCacheService();