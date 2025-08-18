/**
 * Cache for OpenStreetMap place data to avoid rate limiting
 */
import { logger } from '../utils/logger';

interface RealPlace {
  name: string;
  lat: number;
  lon: number;
  cuisine?: string;
  tourism?: string;
  amenity?: string;
}

interface CachedPlaces {
  restaurants: RealPlace[];
  attractions: RealPlace[];
  cafes: RealPlace[];
  timestamp: number;
  key: string;
}

class OSMCache {
  private cache: Map<string, CachedPlaces> = new Map();
  private readonly TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_ENTRIES = 100; // Limit cache size for memory

  /**
   * Generate cache key from city and country
   */
  private getKey(city: string, country: string): string {
    return `${city.toLowerCase()}_${country.toLowerCase()}`.replace(/\s+/g, '_');
  }

  /**
   * Get cached places if available and not expired
   */
  get(city: string, country: string): CachedPlaces | null {
    const key = this.getKey(city, country);
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.TTL) {
      logger.info(`[OSMCache] Cache expired for ${key}`);
      this.cache.delete(key);
      return null;
    }

    logger.info(`[OSMCache] Cache hit for ${key} (${cached.restaurants.length} restaurants, ${cached.attractions.length} attractions, ${cached.cafes.length} cafes)`);
    return cached;
  }

  /**
   * Set cached places
   */
  set(city: string, country: string, places: Omit<CachedPlaces, 'timestamp' | 'key'>): void {
    const key = this.getKey(city, country);
    
    // Enforce cache size limit (LRU-like behavior)
    if (this.cache.size >= this.MAX_ENTRIES) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
      logger.info(`[OSMCache] Evicted oldest entry: ${firstKey}`);
    }

    const cached: CachedPlaces = {
      ...places,
      timestamp: Date.now(),
      key
    };

    this.cache.set(key, cached);
    logger.info(`[OSMCache] Cached data for ${key} (${places.restaurants.length} restaurants, ${places.attractions.length} attractions, ${places.cafes.length} cafes)`);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    logger.info('[OSMCache] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_ENTRIES,
      entries: Array.from(this.cache.keys())
    };
  }
}

export const osmCache = new OSMCache();