import { Request, Response, NextFunction } from 'express';
import pkg from 'lru-cache';
const { LRUCache } = pkg;
import crypto from 'crypto';
import { logger } from '../utils/logger';

/**
 * Idempotency middleware to prevent duplicate requests
 * Critical for payment processing and other sensitive operations
 */

// Cache for storing request results (10MB, 1 hour TTL)
const idempotencyCache = new LRUCache<string, {
  statusCode: number;
  body: any;
  headers: Record<string, string>;
}>({
  max: 1000,
  ttl: 1000 * 60 * 60, // 1 hour
  sizeCalculation: (value) => JSON.stringify(value).length,
  maxSize: 10 * 1024 * 1024, // 10MB
});

// Track in-progress requests to prevent race conditions
const inProgressRequests = new Map<string, Promise<any>>();

/**
 * Generate idempotency key from request
 */
function generateIdempotencyKey(req: Request): string | null {
  // Check for explicit idempotency key header
  const explicitKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
  if (explicitKey) {
    return `explicit:${explicitKey}`;
  }

  // For POST/PUT requests, generate key from body + path
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const body = JSON.stringify(req.body || {});
    const userId = (req as any).user?.id || 'anonymous';
    const key = `${req.method}:${req.path}:${userId}:${body}`;
    
    // Create hash for consistent key length
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    return `auto:${hash}`;
  }

  return null;
}

/**
 * Idempotency middleware for critical operations
 */
export function idempotent(options?: {
  ttl?: number;
  includeGet?: boolean;
  keyGenerator?: (req: Request) => string | null;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip GET requests by default (they're naturally idempotent)
    if (req.method === 'GET' && !options?.includeGet) {
      return next();
    }

    // Generate idempotency key
    const key = options?.keyGenerator?.(req) || generateIdempotencyKey(req);
    if (!key) {
      return next();
    }

    // Check if we have a cached result
    const cached = idempotencyCache.get(key);
    if (cached) {
      logger.info(`Idempotency cache hit for key: ${key.substring(0, 20)}...`);
      
      // Set headers from cached response
      Object.entries(cached.headers).forEach(([header, value]) => {
        res.setHeader(header, value);
      });
      
      // Add idempotency header
      res.setHeader('X-Idempotent-Replayed', 'true');
      
      return res.status(cached.statusCode).json(cached.body);
    }

    // Check if request is already in progress
    if (inProgressRequests.has(key)) {
      logger.info(`Request already in progress for key: ${key.substring(0, 20)}...`);
      
      try {
        // Wait for the in-progress request to complete
        const result = await inProgressRequests.get(key);
        
        // Return the same result
        res.setHeader('X-Idempotent-Replayed', 'true');
        return res.status(result.statusCode).json(result.body);
      } catch (error) {
        // If the original request failed, allow this one to proceed
        logger.error(`In-progress request failed for key ${key}:`, error);
      }
    }

    // Create promise to track this request
    const requestPromise = new Promise((resolve, reject) => {
      // Store original methods
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);
      const originalEnd = res.end.bind(res);

      // Helper to cache response
      const cacheResponse = (body: any) => {
        const statusCode = res.statusCode;
        const headers: Record<string, string> = {};
        
        // Capture important headers
        ['content-type', 'x-request-id', 'x-correlation-id'].forEach(header => {
          const value = res.getHeader(header);
          if (value) {
            headers[header] = String(value);
          }
        });

        const result = { statusCode, body, headers };
        
        // Only cache successful responses and client errors (not server errors)
        if (statusCode < 500) {
          const ttl = options?.ttl || (1000 * 60 * 60); // Default 1 hour
          idempotencyCache.set(key!, result, { ttl });
          logger.info(`Cached response for idempotency key: ${key!.substring(0, 20)}...`);
        }
        
        resolve(result);
      };

      // Override response methods to capture the response
      res.json = function(body: any) {
        cacheResponse(body);
        return originalJson(body);
      };

      res.send = function(body: any) {
        cacheResponse(body);
        return originalSend(body);
      };

      res.end = function(...args: any[]) {
        if (args.length > 0) {
          cacheResponse(args[0]);
        }
        return originalEnd.apply(res, args as any);
      };

      // Set up error handling
      const errorHandler = (error: any) => {
        inProgressRequests.delete(key!);
        reject(error);
      };

      res.on('error', errorHandler);
      res.on('close', () => {
        inProgressRequests.delete(key!);
      });
    });

    // Track this request
    inProgressRequests.set(key, requestPromise);

    // Add idempotency key to request for logging
    (req as any).idempotencyKey = key;

    // Continue with the request
    next();
  };
}

/**
 * Idempotency middleware specifically for payment endpoints
 */
export const paymentIdempotency = idempotent({
  ttl: 1000 * 60 * 60 * 24, // 24 hours for payments
  keyGenerator: (req: Request) => {
    // For payments, use stripe payment intent ID if available
    const paymentIntentId = req.body?.paymentIntentId || req.body?.payment_intent_id;
    if (paymentIntentId) {
      return `payment:${paymentIntentId}`;
    }
    
    // Otherwise use default key generation
    return generateIdempotencyKey(req);
  }
});

/**
 * Clear idempotency cache (for testing or manual intervention)
 */
export function clearIdempotencyCache(pattern?: string) {
  if (pattern) {
    let cleared = 0;
    for (const key of idempotencyCache.keys()) {
      if (key.includes(pattern)) {
        idempotencyCache.delete(key);
        cleared++;
      }
    }
    logger.info(`Cleared ${cleared} idempotency cache entries matching pattern: ${pattern}`);
    return cleared;
  } else {
    const size = idempotencyCache.size;
    idempotencyCache.clear();
    inProgressRequests.clear();
    logger.info(`Cleared all ${size} idempotency cache entries`);
    return size;
  }
}

/**
 * Get idempotency cache statistics
 */
export function getIdempotencyStats() {
  return {
    cacheSize: idempotencyCache.size,
    cacheMaxSize: idempotencyCache.max,
    inProgressRequests: inProgressRequests.size,
    calculatedSize: idempotencyCache.calculatedSize,
  };
}