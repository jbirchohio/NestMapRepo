// Simple in-memory cache for AI search results
// Upgrade to Redis when scaling beyond single server

interface CacheEntry {
  data: any;
  expiry: number;
  hits: number;
}

class AISearchCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 500; // Reduced for Railway's 512MB plan
  
  // Cache durations in seconds (optimized for Railway's 512MB plan)
  readonly DURATIONS = {
    LOCATION_SEARCH: 3 * 24 * 60 * 60,       // 3 days (reduced from 7)
    ACTIVITY_SUGGESTIONS: 7 * 24 * 60 * 60,  // 7 days (reduced from 30)
    RESTAURANT_SEARCH: 24 * 60 * 60,         // 1 day (reduced from 3)
    WEATHER_ACTIVITIES: 3 * 60 * 60,         // 3 hours (unchanged)
    DEFAULT: 12 * 60 * 60                    // 12 hours default
  };

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      console.log(`Cache miss for: ${key}`);
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      console.log(`Cache expired for: ${key}`);
      return null;
    }
    
    // Update hit count
    entry.hits++;
    console.log(`Cache hit for: ${key} (${entry.hits} total hits)`);
    
    return entry.data;
  }

  set(key: string, data: any, ttlSeconds?: number): void {
    // Use default TTL if not specified
    const ttl = ttlSeconds || this.DURATIONS.DEFAULT;
    
    // Implement simple LRU: remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      console.log(`Cache full, evicted: ${firstKey}`);
    }
    
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttl * 1000),
      hits: 0
    });
    
    console.log(`Cached: ${key} for ${ttl} seconds`);
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
    
    this.cache.forEach(entry => {
      totalHits += entry.hits;
    });
    
    return {
      entries: totalEntries,
      totalHits,
      averageHits: totalEntries > 0 ? totalHits / totalEntries : 0,
      memorySizeEstimate: JSON.stringify([...this.cache]).length
    };
  }

  // Clear expired entries
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    this.cache.forEach((entry, key) => {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      console.log(`Cleaned ${cleaned} expired cache entries`);
    }
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    console.log('Cache cleared');
  }
}

// Export singleton instance
export const aiCache = new AISearchCache();

// Run cleanup every hour
setInterval(() => {
  aiCache.cleanup();
}, 60 * 60 * 1000);