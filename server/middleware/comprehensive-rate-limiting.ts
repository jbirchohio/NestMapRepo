/**
 * SINGLE SOURCE OF TRUTH: Rate Limiting Middleware
 * 
 * This is the canonical implementation for all rate limiting functionality in the application.
 * All rate limiting should be handled through this module to ensure consistency.
 * 
 * Features:
 * - Multi-layered protection with organization-aware limits
 * - Burst protection and violation tracking
 * - Support for different rate limits by endpoint and organization tier
 * 
 * DO NOT create duplicate rate limiting implementations - extend this one if needed.
 */

import express, { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  requests: number;
  windowMs: number;
  burstLimit: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  violationTimeouts?: {
    standard: number;  // ms to block for normal violations (50+)
    severe: number;    // ms to block for severe violations (100+)
    critical: number;  // ms to block for critical violations (200+)
  };
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
  
  // Default violation timeouts (in milliseconds)
  private readonly DEFAULT_VIOLATION_TIMEOUTS = {
    standard: 10 * 60 * 1000,    // 10 minutes
    severe: 60 * 60 * 1000,      // 1 hour
    critical: 24 * 60 * 60 * 1000 // 24 hours
  };

  // Tiered rate limiting configurations
  private readonly configs: Record<string, RateLimitConfig> = {
    // Global limits per IP
    'global': {
      requests: 1000,
      windowMs: 60 * 60 * 1000, // 1 hour
      burstLimit: 50, // 50 requests in 1 minute burst
      violationTimeouts: {
        standard: 10 * 60 * 1000,    // 10 minutes
        severe: 60 * 60 * 1000,      // 1 hour
        critical: 24 * 60 * 60 * 1000 // 24 hours
      }
    },
    
    // Authentication endpoints - stricter limits
    'auth': {
      requests: 20,
      windowMs: 15 * 60 * 1000, // 15 minutes
      burstLimit: 5, // 5 attempts in 1 minute
      violationTimeouts: {
        standard: 15 * 60 * 1000,    // 15 minutes
        severe: 2 * 60 * 60 * 1000,  // 2 hours
        critical: 24 * 60 * 60 * 1000 // 24 hours
      }
    },
    
    // API endpoints by organization tier
    'free': {
      requests: 500,
      windowMs: 60 * 60 * 1000, // 1 hour
      burstLimit: 100,
      violationTimeouts: {
        standard: 5 * 60 * 1000,     // 5 minutes
        severe: 30 * 60 * 1000,      // 30 minutes
        critical: 12 * 60 * 60 * 1000 // 12 hours
      }
    },
    'team': {
      requests: 1000,
      windowMs: 60 * 60 * 1000, // 1 hour
      burstLimit: 100,
      violationTimeouts: {
        standard: 10 * 60 * 1000,    // 10 minutes
        severe: 60 * 60 * 1000,      // 1 hour
        critical: 24 * 60 * 60 * 1000 // 24 hours
      }
    },
    'enterprise': {
      requests: 10000,
      windowMs: 60 * 60 * 1000, // 1 hour
      burstLimit: 500,
      violationTimeouts: {
        standard: 15 * 60 * 1000,    // 15 minutes
        severe: 2 * 60 * 60 * 1000,  // 2 hours
        critical: 24 * 60 * 60 * 1000 // 24 hours
      }
    },
    
    // Special endpoints with custom limits
    'analytics': {
      requests: 50,
      windowMs: 60 * 60 * 1000, // 1 hour
      burstLimit: 10,
      violationTimeouts: {
        standard: 5 * 60 * 1000,     // 5 minutes
        severe: 30 * 60 * 1000,      // 30 minutes
        critical: 12 * 60 * 60 * 1000 // 12 hours
      }
    },
    'export': {
      requests: 10,
      windowMs: 60 * 60 * 1000, // 1 hour
      burstLimit: 3,
      violationTimeouts: {
        standard: 15 * 60 * 1000,    // 15 minutes
        severe: 60 * 60 * 1000,      // 1 hour
        critical: 12 * 60 * 60 * 1000 // 12 hours
      }
    },
    'search': {
      requests: 200,
      windowMs: 60 * 60 * 1000, // 1 hour
      burstLimit: 30,
      violationTimeouts: {
        standard: 5 * 60 * 1000,     // 5 minutes
        severe: 30 * 60 * 1000,      // 30 minutes
        critical: 12 * 60 * 60 * 1000 // 12 hours
      }
    }
  };

  checkLimit(key: string, configType: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  } {
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
    
    // Use configured timeouts or fall back to defaults
    const timeouts = config.violationTimeouts || this.DEFAULT_VIOLATION_TIMEOUTS;

    // Progressive blocking based on violations
    if (bucket.violations >= 200) {
      // Block IP globally for critical violations
      this.blockedIPs.add(ipAddress);
      setTimeout(() => this.blockedIPs.delete(ipAddress), timeouts.critical);
      
      console.warn(`IP ${ipAddress} blocked globally for ${timeouts.critical / (60 * 1000)} minutes due to critical violation threshold`);
    } else if (bucket.violations >= 100) {
      // Block for severe violations
      bucket.blockedUntil = now + timeouts.severe;
      console.warn(`Rate limit violation (severe): ${ipAddress} blocked for ${timeouts.severe / (60 * 1000)} minutes`);
    } else if (bucket.violations >= 50) {
      // Block for standard violations
      bucket.blockedUntil = now + timeouts.standard;
      console.warn(`Rate limit violation (standard): ${ipAddress} blocked for ${timeouts.standard / (60 * 1000)} minutes`);
    }

    // Log security violation
    console.warn('RATE_LIMIT_VIOLATION:', {
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
export const apiRateLimit: express.RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown.js';
  const userId = req.user?.id || 'anonymous.js';
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
  
  return next();
}

/**
 * Authentication-specific rate limiting
 */
export const authRateLimit: express.RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown.js';
  const key = `auth:${ip}`;
  
  const result = comprehensiveRateLimit.checkLimit(key, 'auth');
  
  res.setHeader('X-RateLimit-Limit', '20');
  res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
  
  if (!result.allowed) {
    res.setHeader('Retry-After', result.retryAfter?.toString() || '900');
    
    // Log suspicious authentication attempts
    console.warn('AUTH_RATE_LIMIT_EXCEEDED:', {
      ip,
      endpoint: req.path,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
    
    res.status(429).json({
      error: 'Authentication rate limit exceeded',
      message: 'Too many login attempts. Please try again later.',
      retryAfter: result.retryAfter
    });
    return;
  }

  return next();
};

/**
 * Organization-tier based rate limiting
 */
export const organizationRateLimit: express.RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.organization_id) {
    // No organization context, apply free tier limits
    return tieredRateLimit('free')(req, res, next);
  }

  // Determine organization tier (would typically come from database)
  const orgTier = req.user?.organization_tier || 'free.js';
  return tieredRateLimit(orgTier)(req, res, next);
};

/**
 * Tiered rate limiting factory
 */
export function tieredRateLimit(tier: string): express.RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown.js';
    const orgId = req.user?.organizationId || 'none.js';
    const key = `tier:${tier}:${orgId}:${ip}`;
    
    const result = comprehensiveRateLimit.checkLimit(key, tier);
    
    const config = (comprehensiveRateLimit as any).configs[tier] || (comprehensiveRateLimit as any).configs['free'];
    res.setHeader('X-RateLimit-Limit', config.requests.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
    res.setHeader('X-RateLimit-Tier', tier);
    
    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter?.toString() || '3600');
      res.status(429).json({
        error: 'Organization rate limit exceeded',
        message: `${tier} tier limit reached. Please upgrade for higher limits.`,
        tier,
        retryAfter: result.retryAfter
      });
      return;
    }

    return next();
  };
}

/**
 * Endpoint-specific rate limiting
 */
export function endpointRateLimit(endpointType: string): express.RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown.js';
    const userId = req.user?.id || 'anonymous.js';
    const key = `endpoint:${endpointType}:${ip}:${userId}`;
    
    const result = comprehensiveRateLimit.checkLimit(key, endpointType);
    
    const config = (comprehensiveRateLimit as any).configs[endpointType] || (comprehensiveRateLimit as any).configs['global'];
    res.setHeader('X-RateLimit-Limit', config.requests.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
    res.setHeader('X-RateLimit-Endpoint', endpointType);
    
    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter?.toString() || '3600');
      res.status(429).json({
        error: `${endpointType} rate limit exceeded`,
        message: 'This endpoint has specific rate limits. Please try again later.',
        endpoint: endpointType,
        retryAfter: result.retryAfter
      });
      return;
    }

    return next();
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