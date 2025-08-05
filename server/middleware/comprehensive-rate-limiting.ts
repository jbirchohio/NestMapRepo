import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Comprehensive API Rate Limiting Implementation
 * Provides multi-layered protection with organization-aware limits
 */

interface RateLimitConfig {
  requests: number;
  windowMs: number;
  burstLimit: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
  burstTokens: number;
  violations: number;
  blockedUntil?: number;
}

class ComprehensiveRateLimit {
  private buckets = new Map<string, RateLimitBucket>();
  private blockedIPs = new Set<string>();
  
  // Disable rate limiting in development
  private readonly isDevelopment = process.env.NODE_ENV === 'development';
  
  // Tiered rate limiting configurations
  private readonly configs: Record<string, RateLimitConfig> = {
    // Global limits per IP
    'global': {
      requests: 1000,
      windowMs: 60 * 60 * 1000, // 1 hour
      burstLimit: 50, // 50 requests in 1 minute burst
    },
    
    // Authentication endpoints - reasonable limits for consumer app
    'auth': {
      requests: 100, // Increased from 20
      windowMs: 15 * 60 * 1000, // 15 minutes
      burstLimit: 20, // Increased from 5 - allows multiple sign-in attempts
    },
    
    // API endpoints by organization tier
    'free': {
      requests: 500,
      windowMs: 60 * 60 * 1000, // 1 hour
      burstLimit: 100,
    },
    'team': {
      requests: 1000,
      windowMs: 60 * 60 * 1000, // 1 hour
      burstLimit: 100,
    },
    'enterprise': {
      requests: 10000,
      windowMs: 60 * 60 * 1000, // 1 hour
      burstLimit: 500,
    },
    
    // Special endpoints with custom limits
    'analytics': {
      requests: 50,
      windowMs: 60 * 60 * 1000, // 1 hour
      burstLimit: 10,
    },
    'export': {
      requests: 10,
      windowMs: 60 * 60 * 1000, // 1 hour
      burstLimit: 3,
    },
    'search': {
      requests: 200,
      windowMs: 60 * 60 * 1000, // 1 hour
      burstLimit: 30,
    }
  };

  private checkLimitWithConfig(key: string, config: RateLimitConfig): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  } {
    const now = Date.now();
    
    const bucket = this.buckets.get(key) || {
      tokens: config.requests,
      lastRefill: now,
      burstTokens: config.burstLimit,
      violations: 0
    };

    // Refill tokens
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(timePassed * (config.requests / config.windowMs));
    bucket.tokens = Math.min(config.requests, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens <= 0) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: now + config.windowMs,
        retryAfter: Math.ceil(config.windowMs / 1000)
      };
    }

    bucket.tokens--;
    this.buckets.set(key, bucket);

    return {
      allowed: true,
      remaining: bucket.tokens,
      resetTime: now + ((config.requests - bucket.tokens) * (config.windowMs / config.requests))
    };
  }

  checkLimit(key: string, configType: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  } {
    // Skip rate limiting in development
    if (this.isDevelopment) {
      return {
        allowed: true,
        remaining: 9999,
        resetTime: Date.now() + 3600000,
        retryAfter: undefined
      };
    }
    
    // For auth endpoints, check if we should use relaxed limits
    if (configType === 'auth' && process.env.RELAX_AUTH_LIMIT === 'true') {
      const relaxedConfig = {
        requests: 1000, // Very high limit
        windowMs: 15 * 60 * 1000,
        burstLimit: 100
      };
      return this.checkLimitWithConfig(key, relaxedConfig);
    }
    
    const config = this.configs[configType] || this.configs['global'];
    const now = Date.now();
    
    // Check if IP is globally blocked
    if (this.blockedIPs.has(key.split(':')[0])) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: now + config.windowMs,
        retryAfter: Math.ceil(config.windowMs / 1000)
      };
    }

    const bucket = this.buckets.get(key) || {
      tokens: config.requests,
      lastRefill: now,
      burstTokens: config.burstLimit,
      violations: 0
    };

    // Check if temporarily blocked due to violations
    if (bucket.blockedUntil && now < bucket.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: bucket.blockedUntil,
        retryAfter: Math.ceil((bucket.blockedUntil - now) / 1000)
      };
    }

    // Refill tokens based on time elapsed
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(timePassed * (config.requests / config.windowMs));
    
    bucket.tokens = Math.min(config.requests, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Refill burst tokens every minute
    if (timePassed >= 60000) { // 1 minute
      bucket.burstTokens = config.burstLimit;
    }

    // Check burst limit first
    if (bucket.burstTokens <= 0) {
      bucket.violations++;
      this.handleViolation(key, bucket, config);
      
      return {
        allowed: false,
        remaining: bucket.tokens,
        resetTime: now + 60000, // Reset burst in 1 minute
        retryAfter: 60
      };
    }

    // Check main rate limit - temporarily more lenient for debugging
    if (bucket.tokens <= 0) {
      // Only increment violations if tokens are heavily depleted (not for normal usage)
      if (bucket.tokens < -10) {
        bucket.violations++;
        this.handleViolation(key, bucket, config);
      }
      
      const resetTime = now + config.windowMs;
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil(config.windowMs / 1000)
      };
    }

    // Allow request - consume tokens
    bucket.tokens--;
    bucket.burstTokens--;
    bucket.violations = Math.max(0, bucket.violations - 0.1); // Gradual violation recovery
    
    this.buckets.set(key, bucket);

    return {
      allowed: true,
      remaining: bucket.tokens,
      resetTime: now + ((config.requests - bucket.tokens) * (config.windowMs / config.requests))
    };
  }

  private handleViolation(key: string, bucket: RateLimitBucket, config: RateLimitConfig) {
    const now = Date.now();
    const ipAddress = key.split(':')[0];

    // Progressive blocking based on violations - less aggressive thresholds
    if (bucket.violations >= 50) {
      // Block for 10 minutes after 50 violations
      bucket.blockedUntil = now + (10 * 60 * 1000);
    } else if (bucket.violations >= 100) {
      // Block for 1 hour after 100 violations
      bucket.blockedUntil = now + (60 * 60 * 1000);
    } else if (bucket.violations >= 200) {
      // Block IP globally for 24 hours after 200 violations
      this.blockedIPs.add(ipAddress);
      setTimeout(() => this.blockedIPs.delete(ipAddress), 24 * 60 * 60 * 1000);
    }

    // Log security violation
    logger.warn('RATE_LIMIT_VIOLATION:', {
      key,
      violations: bucket.violations,
      timestamp: new Date().toISOString(),
      blockedUntil: bucket.blockedUntil ? new Date(bucket.blockedUntil).toISOString() : null
    });
  }

  getViolationCount(key: string): number {
    return this.buckets.get(key)?.violations || 0;
  }

  clearViolations(key: string): void {
    const bucket = this.buckets.get(key);
    if (bucket) {
      bucket.violations = 0;
      bucket.blockedUntil = undefined;
      this.buckets.set(key, bucket);
    }
  }

  getStats(): {
    totalBuckets: number;
    blockedIPs: number;
    highViolationKeys: string[];
  } {
    const highViolationKeys = Array.from(this.buckets.entries())
      .filter(([, bucket]) => bucket.violations >= 5)
      .map(([key]) => key);

    return {
      totalBuckets: this.buckets.size,
      blockedIPs: this.blockedIPs.size,
      highViolationKeys
    };
  }
}

const comprehensiveRateLimit = new ComprehensiveRateLimit();

/**
 * General API rate limiting middleware
 */
export function apiRateLimit(req: Request, res: Response, next: NextFunction) {
  // Skip rate limiting in test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userId = req.user?.id || 'anonymous';
  const key = `global:${ip}:${userId}`;
  
  const result = comprehensiveRateLimit.checkLimit(key, 'global');
  
  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', '1000');
  res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
  
  if (!result.allowed) {
    res.setHeader('Retry-After', result.retryAfter?.toString() || '3600');
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: result.retryAfter
    });
  }
  
  next();
}

/**
 * Authentication-specific rate limiting
 */
export function authRateLimit(req: Request, res: Response, next: NextFunction) {
  // Skip rate limiting in test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const key = `auth:${ip}`;
  
  const result = comprehensiveRateLimit.checkLimit(key, 'auth');
  
  res.setHeader('X-RateLimit-Limit', '20');
  res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
  
  if (!result.allowed) {
    res.setHeader('Retry-After', result.retryAfter?.toString() || '900');
    
    // Log suspicious authentication attempts
    logger.warn('AUTH_RATE_LIMIT_EXCEEDED:', {
      ip,
      endpoint: req.path,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
    
    return res.status(429).json({
      error: 'Authentication rate limit exceeded',
      message: 'Too many authentication attempts. Please try again later.',
      retryAfter: result.retryAfter
    });
  }
  
  next();
}

/**
 * Organization-tier based rate limiting
 */
export function organizationRateLimit(req: Request, res: Response, next: NextFunction) {
  // Skip rate limiting in test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  
  if (!req.user?.organization_id) {
    // No organization context, apply free tier limits
    return tieredRateLimit('free')(req, res, next);
  }

  // Determine organization tier (would typically come from database)
  const orgTier = (req.user as any)?.organization_tier || 'free';
  return tieredRateLimit(orgTier)(req, res, next);
}

/**
 * Tiered rate limiting factory
 */
export function tieredRateLimit(tier: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const orgId = req.user?.organization_id || 'none';
    const key = `tier:${tier}:${orgId}:${ip}`;
    
    const result = comprehensiveRateLimit.checkLimit(key, tier);
    
    const config = (comprehensiveRateLimit as any).configs[tier] || (comprehensiveRateLimit as any).configs['free'];
    res.setHeader('X-RateLimit-Limit', config.requests.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
    res.setHeader('X-RateLimit-Tier', tier);
    
    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter?.toString() || '3600');
      return res.status(429).json({
        error: 'Organization rate limit exceeded',
        message: `${tier} tier limit reached. Please upgrade for higher limits.`,
        tier,
        retryAfter: result.retryAfter
      });
    }
    
    next();
  };
}

/**
 * Endpoint-specific rate limiting
 */
export function endpointRateLimit(endpointType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = req.user?.id || 'anonymous';
    const key = `endpoint:${endpointType}:${ip}:${userId}`;
    
    const result = comprehensiveRateLimit.checkLimit(key, endpointType);
    
    const config = (comprehensiveRateLimit as any).configs[endpointType] || (comprehensiveRateLimit as any).configs['global'];
    res.setHeader('X-RateLimit-Limit', config.requests.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
    res.setHeader('X-RateLimit-Endpoint', endpointType);
    
    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter?.toString() || '3600');
      return res.status(429).json({
        error: `${endpointType} rate limit exceeded`,
        message: 'This endpoint has specific rate limits. Please try again later.',
        endpoint: endpointType,
        retryAfter: result.retryAfter
      });
    }
    
    next();
  };
}

/**
 * Rate limit statistics endpoint (for monitoring)
 */
export function getRateLimitStats(): any {
  return comprehensiveRateLimit.getStats();
}

/**
 * Clear violations for a specific key (admin function)
 */
export function clearViolations(key: string): void {
  comprehensiveRateLimit.clearViolations(key);
}