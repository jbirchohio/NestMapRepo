// Phase 3: Advanced Performance Cache Manager
import LRUCache from 'lru-cache';
import { useState, useEffect, useCallback } from 'react';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  size: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  entries: number;
  memoryUsage: number;
  averageAccessTime: number;
}

/**
 * Advanced multi-level cache system for optimal performance
 * Implements LRU, TTL, and intelligent prefetching strategies
 */
class AdvancedCacheManager {
  private l1Cache: LRUCache<string, any>; // Hot data - ultra fast access
  private l2Cache: LRUCache<string, any>; // Warm data - fast access
  private l3Cache: Map<string, CacheEntry<any>>; // Cold data - slower but larger
  
  private stats = {
    l1: { hits: 0, misses: 0, accessTimes: [] as number[] },
    l2: { hits: 0, misses: 0, accessTimes: [] as number[] },
    l3: { hits: 0, misses: 0, accessTimes: [] as number[] }
  };

  private prefetchQueue = new Set<string>();
  private compressionEnabled = true;

  constructor() {
    // L1: 50 entries, 1 minute TTL - for actively used data
    this.l1Cache = new LRUCache({
      max: 50,
      ttl: 60 * 1000,
      updateAgeOnGet: true,
      allowStale: false
    });

    // L2: 200 entries, 5 minute TTL - for recently used data  
    this.l2Cache = new LRUCache({
      max: 200,
      ttl: 5 * 60 * 1000,
      updateAgeOnGet: true,
      allowStale: true
    });

    // L3: 1000 entries, manual management - for background data
    this.l3Cache = new Map();

    // Start background cleanup
    this.startBackgroundCleanup();
  }

  /**
   * Get data with intelligent cache hierarchy traversal
   */
  async get<T>(key: string): Promise<T | null> {
    const start = performance.now();
    
    // Try L1 cache first (hottest data)
    if (this.l1Cache.has(key)) {
      const value = this.l1Cache.get(key);
      this.recordAccess('l1', performance.now() - start, true);
      this.promoteToPrefetch(key);
      return value;
    }

    // Try L2 cache (warm data)
    if (this.l2Cache.has(key)) {
      const value = this.l2Cache.get(key);
      // Promote to L1 for frequent access
      this.l1Cache.set(key, value);
      this.recordAccess('l2', performance.now() - start, true);
      return value;
    }

    // Try L3 cache (cold data)
    const l3Entry = this.l3Cache.get(key);
    if (l3Entry && this.isL3EntryValid(l3Entry)) {
      const value = l3Entry.value;
      // Promote through hierarchy
      this.l2Cache.set(key, value);
      this.l1Cache.set(key, value);
      l3Entry.accessCount++;
      this.recordAccess('l3', performance.now() - start, true);
      return value;
    }

    // Cache miss - record and return null
    this.recordAccess('l1', performance.now() - start, false);
    return null;
  }

  /**
   * Set data with intelligent cache placement
   */
  set<T>(key: string, value: T): void {
    const size = this.calculateSize(value);
    
    // Always set in L1 for immediate access
    this.l1Cache.set(key, value);
    
    // Set in L2 for medium-term storage
    this.l2Cache.set(key, value);
    
    // Set in L3 for long-term storage with metadata
    this.l3Cache.set(key, {
      value: this.compressionEnabled ? this.compress(value) : value,
      timestamp: Date.now(),
      accessCount: 1,
      size
    });

    // Trigger prefetch for related keys
    this.triggerRelatedPrefetch(key);
  }

  /**
   * Intelligent prefetching based on access patterns
   */
  async prefetch(keys: string[]): Promise<void> {
    const prefetchPromises = keys
      .filter(key => !this.l1Cache.has(key) && !this.prefetchQueue.has(key))
      .map(async (key) => {
        this.prefetchQueue.add(key);
        
        try {
          // Simulate fetching data (replace with actual data source)
          const data = await this.fetchFromSource(key);
          if (data) {
            this.set(key, data); // Prefetched data
          }
        } catch (error) {
          console.warn(`Prefetch failed for key: ${key}`, error);
        } finally {
          this.prefetchQueue.delete(key);
        }
      });

    await Promise.allSettled(prefetchPromises);
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    const totalHits = this.stats.l1.hits + this.stats.l2.hits + this.stats.l3.hits;
    const totalMisses = this.stats.l1.misses + this.stats.l2.misses + this.stats.l3.misses;
    const totalRequests = totalHits + totalMisses;
    
    const allAccessTimes = [
      ...this.stats.l1.accessTimes,
      ...this.stats.l2.accessTimes,
      ...this.stats.l3.accessTimes
    ];
    
    return {
      hits: totalHits,
      misses: totalMisses,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      entries: this.l1Cache.size + this.l2Cache.size + this.l3Cache.size,
      memoryUsage: this.calculateMemoryUsage(),
      averageAccessTime: allAccessTimes.length > 0 
        ? allAccessTimes.reduce((a, b) => a + b, 0) / allAccessTimes.length 
        : 0
    };
  }

  /**
   * Clear all cache levels
   */
  clear(): void {
    this.l1Cache.clear();
    this.l2Cache.clear();
    this.l3Cache.clear();
    this.prefetchQueue.clear();
    
    // Reset stats
    this.stats = {
      l1: { hits: 0, misses: 0, accessTimes: [] },
      l2: { hits: 0, misses: 0, accessTimes: [] },
      l3: { hits: 0, misses: 0, accessTimes: [] }
    };
  }

  /**
   * Optimize cache by moving frequently accessed L3 items to higher levels
   */
  optimize(): void {
    const l3Entries = Array.from(this.l3Cache.entries())
      .filter(([_, entry]) => this.isL3EntryValid(entry))
      .sort(([_, a], [__, b]) => b.accessCount - a.accessCount)
      .slice(0, 50); // Top 50 most accessed items

    l3Entries.forEach(([key, entry]) => {
      if (entry.accessCount > 3) {
        // Promote frequently accessed items
        const decompressed = this.compressionEnabled ? this.decompress(entry.value) : entry.value;
        this.l2Cache.set(key, decompressed);
        
        if (entry.accessCount > 10) {
          this.l1Cache.set(key, decompressed);
        }
      }
    });
  }

  private recordAccess(level: 'l1' | 'l2' | 'l3', time: number, hit: boolean): void {
    if (hit) {
      this.stats[level].hits++;
    } else {
      this.stats[level].misses++;
    }
    
    this.stats[level].accessTimes.push(time);
    
    // Keep only last 100 access times for average calculation
    if (this.stats[level].accessTimes.length > 100) {
      this.stats[level].accessTimes = this.stats[level].accessTimes.slice(-100);
    }
  }

  private isL3EntryValid(entry: CacheEntry<any>): boolean {
    const maxAge = 30 * 60 * 1000; // 30 minutes
    return Date.now() - entry.timestamp < maxAge;
  }

  private calculateSize(value: any): number {
    return JSON.stringify(value).length * 2; // Rough estimate in bytes
  }

  private calculateMemoryUsage(): number {
    let total = 0;
    
    // L1 and L2 use LRU cache, estimate size
    total += this.l1Cache.size * 1000; // Rough estimate
    total += this.l2Cache.size * 2000; // Rough estimate
    
    // L3 has actual size tracking
    for (const entry of this.l3Cache.values()) {
      total += entry.size;
    }
    
    return total;
  }

  private compress(value: any): any {
    // Simple compression simulation - in real implementation, use actual compression
    if (typeof value === 'string' && value.length > 100) {
      return { __compressed: true, data: value };
    }
    return value;
  }

  private decompress(value: any): any {
    if (value && value.__compressed) {
      return value.data;
    }
    return value;
  }

  private promoteToPrefetch(key: string): void {
    // Extract pattern from key and prefetch related data
    const patterns = this.extractPatterns(key);
    patterns.forEach(pattern => {
      if (!this.prefetchQueue.has(pattern)) {
        setImmediate(() => this.prefetch([pattern]));
      }
    });
  }

  private triggerRelatedPrefetch(key: string): void {
    // Intelligent prefetch based on key relationships
    const relatedKeys = this.generateRelatedKeys(key);
    if (relatedKeys.length > 0) {
      setImmediate(() => this.prefetch(relatedKeys));
    }
  }

  private extractPatterns(key: string): string[] {
    // Extract common patterns for predictive prefetching
    const patterns: string[] = [];
    
    // Pattern: /api/trips/{id}/activities -> prefetch /api/trips/{id}/conflicts
    if (key.includes('/activities')) {
      patterns.push(key.replace('/activities', '/conflicts'));
      patterns.push(key.replace('/activities', '/reminders'));
    }
    
    // Pattern: optimization data -> prefetch conflicts
    if (key.includes('/optimize/')) {
      patterns.push(key.replace('/optimize/', '/conflicts/'));
    }
    
    return patterns;
  }

  private generateRelatedKeys(key: string): string[] {
    const related: string[] = [];
    
    // If setting trip data, prefetch optimization data
    if (key.includes('/trips/')) {
      const tripId = key.match(/\/trips\/(\d+)/)?.[1];
      if (tripId) {
        related.push(`/api/optimize/schedule/${tripId}`);
        related.push(`/api/conflicts/detect/${tripId}`);
      }
    }
    
    return related;
  }

  private async fetchFromSource(key: string): Promise<any> {
    // Placeholder for actual data fetching
    // In real implementation, this would call the appropriate API
    console.log(`Prefetching data for key: ${key}`);
    return null;
  }

  private startBackgroundCleanup(): void {
    // Clean up expired L3 entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      const maxAge = 30 * 60 * 1000; // 30 minutes
      
      for (const [key, entry] of this.l3Cache.entries()) {
        if (now - entry.timestamp > maxAge) {
          this.l3Cache.delete(key);
        }
      }
      
      // Optimize cache hierarchy
      this.optimize();
    }, 5 * 60 * 1000);
  }
}

// Singleton instance for global cache management
export const advancedCache = new AdvancedCacheManager();

/**
 * React hook for cached data with automatic prefetching
 */
export function useCachedData<T>(
  key: string, 
  fetcher: () => Promise<T>,
  prefetchKeys: string[] = []
): {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try cache first
      const cached = await advancedCache.get<T>(key);
      if (cached) {
        setData(cached);
        setIsLoading(false);
        return;
      }

      // Fetch from source
      const result = await fetcher();
      setData(result);
      
      // Cache the result
      advancedCache.set(key, result);
      
      // Trigger prefetch for related data
      if (prefetchKeys.length > 0) {
        advancedCache.prefetch(prefetchKeys);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, prefetchKeys]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Fetch on mount and key change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refresh };
}

/**
 * Cache performance monitoring hook
 */
export function useCachePerformance() {
  const [stats, setStats] = useState<CacheStats | null>(null);

  useEffect(() => {
    const updateStats = () => {
      setStats(advancedCache.getStats());
    };

    // Update stats every 5 seconds
    const interval = setInterval(updateStats, 5000);
    updateStats(); // Initial update

    return () => clearInterval(interval);
  }, []);

  return stats;
}
