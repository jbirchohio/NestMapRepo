import type { Request, Response, NextFunction } from '../../express-augmentations.js';
/**
 * Performance optimization service for acquisition-ready deployment
 * Addresses memory spikes and slow request issues in development/production
 */
interface CacheEntry {
    data: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */;
    timestamp: number;
    ttl: number;
}
class PerformanceOptimizer {
    private cache = new Map<string, CacheEntry>();
    private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
    private readonly MAX_CACHE_SIZE = 1000;
    /**
     * Intelligent response caching for static-like requests
     */
    cacheMiddleware(ttl: number = this.DEFAULT_TTL) {
        return (req: Request, res: Response, next: NextFunction) => {
            // Only cache GET requests that don't contain dynamic user data
            if (req.method !== 'GET' || this.isDynamicRequest(req)) {
                return next();
            }
            const cacheKey = this.generateCacheKey(req);
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                res.setHeader('X-Cache', 'HIT');
                return res.json(cached);
            }
            // Intercept response to cache it
            const originalJson = res.json;
            res.json = (body: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */) => {
                if (res.statusCode === 200) {
                    this.setCache(cacheKey, body, ttl);
                }
                res.setHeader('X-Cache', 'MISS');
                return originalJson.call(res, body);
            };
            next();
        };
    }
    /**
     * Memory pressure relief middleware
     */
    memoryReliefMiddleware() {
        return (req: Request, res: Response, next: NextFunction) => {
            // Clean up expired cache entries periodically
            if (Math.random() < 0.01) { // 1% chance per request
                this.cleanupExpiredCache();
            }
            // Force garbage collection on high memory in development
            const memUsage = process.memoryUsage();
            const highMemoryThreshold = 300 * 1024 * 1024; // 300MB
            if (memUsage.heapUsed > highMemoryThreshold && process.env.NODE_ENV === 'development') {
                if (global.gc) {
                    setImmediate(() => {
                        global.gc?.();
                        console.log('🧹 Performance optimizer triggered garbage collection');
                    });
                }
            }
            next();
        };
    }
    /**
     * Static asset optimization for Vite development mode
     */
    viteAssetOptimizer() {
        return (req: Request, res: Response, next: NextFunction) => {
            // Set aggressive caching for static assets in development
            if (this.isStaticAsset(req.url)) {
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                res.setHeader('X-Static-Asset', 'true');
            }
            // Compress responses for large assets
            if (req.url?.includes('.js') || req.url?.includes('.css')) {
                res.setHeader('Vary', 'Accept-Encoding');
            }
            next();
        };
    }
    private isDynamicRequest(req: Request): boolean {
        const dynamicPatterns = [
            '/api/auth/',
            '/api/trips/',
            '/api/activities/',
            '/api/analytics/'
        ];
        return dynamicPatterns.some(pattern => req.url?.includes(pattern));
    }
    private isStaticAsset(url: string | undefined): boolean {
        if (!url)
            return false;
        const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
        return staticExtensions.some(ext => url.includes(ext));
    }
    private generateCacheKey(req: Request): string {
        const url = req.url || '';
        const userId = (req as any).user?.id || 'anonymous';
        const orgId = (req as any).organization_id || 'no-org';
        return `${req.method}:${url}:${userId}:${orgId}`;
    }
    private getFromCache(key: string): any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ | null {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.timestamp + entry.ttl) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    private setCache(key: string, data: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */, ttl: number): void {
        // Prevent cache from growing too large
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) {
                this.cache.delete(oldestKey);
            }
        }
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }
    private cleanupExpiredCache(): void {
        const now = Date.now();
        const toDelete: string[] = [];
        this.cache.forEach((entry, key) => {
            if (now > entry.timestamp + entry.ttl) {
                toDelete.push(key);
            }
        });
        toDelete.forEach(key => this.cache.delete(key));
        if (toDelete.length > 0) {
            console.log(`🧹 Cleaned up ${toDelete.length} expired cache entries`);
        }
    }
    /**
     * Get cache statistics for monitoring
     */
    getCacheStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;
        this.cache.forEach(entry => {
            if (now > entry.timestamp + entry.ttl) {
                expiredEntries++;
            }
            else {
                validEntries++;
            }
        });
        return {
            totalEntries: this.cache.size,
            validEntries,
            expiredEntries,
            memoryUsage: process.memoryUsage()
        };
    }
    /**
     * Clear all cache entries
     */
    clearCache(): void {
        this.cache.clear();
        console.log('🧹 Performance cache cleared');
    }
}
export const performanceOptimizer = new PerformanceOptimizer();
