import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * HTTP Caching Middleware - Let browsers cache responses
 * Free performance boost by reducing server load
 */

interface CacheConfig {
  maxAge: number;
  sMaxAge?: number;
  public?: boolean;
  private?: boolean;
  immutable?: boolean;
  mustRevalidate?: boolean;
  noCache?: boolean;
  noStore?: boolean;
}

const cacheProfiles: Record<string, CacheConfig> = {
  // Static assets - cache aggressively
  static: {
    maxAge: 31536000, // 1 year
    public: true,
    immutable: true
  },
  
  // Template data - cache for 5 minutes
  template: {
    maxAge: 300,
    sMaxAge: 600, // CDN can cache for 10 minutes
    public: true
  },
  
  // Template list - cache for 1 minute
  templateList: {
    maxAge: 60,
    sMaxAge: 120,
    public: true
  },
  
  // User-specific data - private cache
  user: {
    maxAge: 60,
    private: true,
    mustRevalidate: true
  },
  
  // Search results - short cache
  search: {
    maxAge: 30,
    sMaxAge: 60,
    public: true
  },
  
  // API responses - default
  api: {
    maxAge: 0,
    mustRevalidate: true,
    noCache: true
  },
  
  // Sensitive data - never cache
  sensitive: {
    noStore: true
  }
};

/**
 * Generate ETag for response
 */
function generateETag(data: any): string {
  const hash = crypto.createHash('md5');
  hash.update(JSON.stringify(data));
  return `"${hash.digest('hex')}"`;
}

/**
 * Build Cache-Control header
 */
function buildCacheControl(config: CacheConfig): string {
  const directives: string[] = [];
  
  if (config.public) directives.push('public');
  if (config.private) directives.push('private');
  if (config.noCache) directives.push('no-cache');
  if (config.noStore) directives.push('no-store');
  if (config.mustRevalidate) directives.push('must-revalidate');
  if (config.immutable) directives.push('immutable');
  if (config.maxAge !== undefined) directives.push(`max-age=${config.maxAge}`);
  if (config.sMaxAge !== undefined) directives.push(`s-maxage=${config.sMaxAge}`);
  
  return directives.join(', ');
}

/**
 * HTTP Cache Middleware
 */
export function httpCache(profile: keyof typeof cacheProfiles = 'api') {
  return (req: Request, res: Response, next: NextFunction) => {
    const config = cacheProfiles[profile] || cacheProfiles.api;
    
    // Set Cache-Control header
    res.set('Cache-Control', buildCacheControl(config));
    
    // Add Vary header for proper caching
    res.set('Vary', 'Accept-Encoding, Authorization');
    
    // Override res.json to add ETag
    const originalJson = res.json.bind(res);
    res.json = function(data: any) {
      // Generate ETag for response
      if (!config.noStore && !config.noCache) {
        const etag = generateETag(data);
        res.set('ETag', etag);
        
        // Check if client has matching ETag
        const clientETag = req.headers['if-none-match'];
        if (clientETag === etag) {
          return res.status(304).end();
        }
      }
      
      // Add Last-Modified header
      if (!config.noStore) {
        res.set('Last-Modified', new Date().toUTCString());
      }
      
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * Conditional request handling
 */
export function conditionalCache() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check If-Modified-Since header
    const ifModifiedSince = req.headers['if-modified-since'];
    if (ifModifiedSince) {
      const lastModified = res.get('Last-Modified');
      if (lastModified && new Date(lastModified) <= new Date(ifModifiedSince)) {
        return res.status(304).end();
      }
    }
    
    next();
  };
}

/**
 * Smart caching based on endpoint patterns
 */
export function smartCache() {
  return (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    
    // Determine cache profile based on path
    let profile: keyof typeof cacheProfiles = 'api';
    
    if (path.includes('/templates/') && req.method === 'GET') {
      if (path.endsWith('/templates') || path.includes('search')) {
        profile = 'templateList';
      } else {
        profile = 'template';
      }
    } else if (path.includes('/static/') || path.includes('/assets/')) {
      profile = 'static';
    } else if (path.includes('/search')) {
      profile = 'search';
    } else if (path.includes('/user/') || path.includes('/my')) {
      profile = 'user';
    } else if (path.includes('/auth/') || path.includes('/payment/')) {
      profile = 'sensitive';
    }
    
    // Apply the appropriate cache profile
    httpCache(profile)(req, res, next);
  };
}

/**
 * Cache buster for development
 */
export function noCacheInDev() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'development') {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
    next();
  };
}

/**
 * Add cache headers for specific content types
 */
export function contentTypeCache() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Override res.type to add caching based on content type
    const originalType = res.type.bind(res);
    res.type = function(type: string) {
      originalType(type);
      
      // Cache images aggressively
      if (type.includes('image/')) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // Cache fonts
      else if (type.includes('font/')) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // Cache CSS/JS
      else if (type.includes('text/css') || type.includes('javascript')) {
        res.set('Cache-Control', 'public, max-age=86400'); // 1 day
      }
      
      return res;
    };
    
    next();
  };
}

/**
 * Stale-while-revalidate support
 */
export function staleWhileRevalidate(maxAge: number = 60, staleTime: number = 86400) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', `max-age=${maxAge}, stale-while-revalidate=${staleTime}`);
    next();
  };
}