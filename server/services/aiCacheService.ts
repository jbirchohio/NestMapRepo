import { CONFIG } from '../config/constants';

// Simple in-memory cache for AI search results
// Upgrade to Redis when scaling beyond single server

interface CacheEntry {
  data: any;
  expiry: number;
  hits: number;
}

class AISearchCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = CONFIG.CACHE_MAX_SIZE;
  private currentMemoryUsage = 0; // Track memory in bytes
  private maxMemoryMB = CONFIG.CACHE_MAX_MEMORY_MB;
  
  // Cache durations in seconds from configuration
  readonly DURATIONS = {
    LOCATION_SEARCH: CONFIG.CACHE_TTL_LOCATION,
    ACTIVITY_SUGGESTIONS: CONFIG.CACHE_TTL_ACTIVITY,
    RESTAURANT_SEARCH: CONFIG.CACHE_TTL_RESTAURANT,
    WEATHER_ACTIVITIES: CONFIG.CACHE_TTL_WEATHER,
    DEFAULT: CONFIG.CACHE_TTL_DEFAULT
  };

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    // Update hit count
    entry.hits++;
    
    return entry.data;
  }

  set(key: string, data: any, ttlSeconds?: number): void {
    // Use default TTL if not specified
    const ttl = ttlSeconds || this.DURATIONS.DEFAULT;
    
    // Calculate size of new data
    const dataSize = Buffer.byteLength(JSON.stringify(data));
    const maxMemoryBytes = this.maxMemoryMB * 1024 * 1024;
    
    // Check memory limit before size limit
    while ((this.currentMemoryUsage + dataSize > maxMemoryBytes || this.cache.size >= this.maxSize) && this.cache.size > 0) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        const entry = this.cache.get(firstKey);
        if (entry) {
          const entrySize = Buffer.byteLength(JSON.stringify(entry.data));
          this.currentMemoryUsage -= entrySize;
        }
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttl * 1000),
      hits: 0
    });
    
    this.currentMemoryUsage += dataSize;
  }

  // Generate consistent cache keys
  generateKey(type: string, query: string, context?: string): string {
    const normalizedQuery = query.toLowerCase().trim();
    const normalizedContext = context?.toLowerCase().trim() || '';
    return `ai:${type}:${normalizedContext}:${normalizedQuery}`;
  }

  // Get cache statistics
  getStats() {
    let totalHits = 0;
    let totalEntries = this.cache.size;
    let approximateSize = 0;
    
    this.cache.forEach(entry => {
      totalHits += entry.hits;
      // Approximate memory size without serializing entire cache
      if (entry.data) {
        approximateSize += JSON.stringify(entry.data).length;
      }
    });
    
    return {
      entries: totalEntries,
      totalHits,
      averageHits: totalEntries > 0 ? totalHits / totalEntries : 0,
      memorySizeBytes: this.currentMemoryUsage,
      memorySizeMB: this.currentMemoryUsage / 1024 / 1024,
      maxMemoryMB: this.maxMemoryMB
    };
  }

  // Clear expired entries
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    this.cache.forEach((entry, key) => {
      if (now > entry.expiry) {
        const entrySize = Buffer.byteLength(JSON.stringify(entry.data));
        this.currentMemoryUsage -= entrySize;
        this.cache.delete(key);
        cleaned++;
      }
    });
    
    // Cleaned expired entries
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.currentMemoryUsage = 0;
  }
}

// Export singleton instance
export const aiCache = new AISearchCache();

// Run cleanup every hour
setInterval(() => {
  aiCache.cleanup();
}, 60 * 60 * 1000);