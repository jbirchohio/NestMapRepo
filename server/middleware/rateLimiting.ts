import { Request, Response, NextFunction } from 'express';
import { SecurityAuditLogger } from './securityAuditLogger';

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
  blockDurationMs: number;
}

/**
 * In-memory rate limiting for authentication endpoints
 * Production should use Redis for distributed rate limiting
 */
class RateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map();
  private blockedIPs: Map<string, number> = new Map();

  private authConfig: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5,
    blockDurationMs: 60 * 60 * 1000 // 1 hour
  };

  private generalConfig: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 100,
    blockDurationMs: 15 * 60 * 1000 // 15 minutes
  };

  /**
   * Get client identifier (IP + User-Agent hash for better tracking)
   */
  private getClientId(req: Request): string {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    return `${ip}_${this.simpleHash(userAgent)}`;
  }

  /**
   * Simple hash function for User-Agent
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if client is currently blocked
   */
  private isBlocked(clientId: string): boolean {
    const blockUntil = this.blockedIPs.get(clientId);
    if (blockUntil && Date.now() < blockUntil) {
      return true;
    }
    if (blockUntil && Date.now() >= blockUntil) {
      this.blockedIPs.delete(clientId);
    }
    return false;
  }

  /**
   * Clean old entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    
    // Clean old attempts
    for (const [clientId, entry] of this.attempts.entries()) {
      if (now - entry.lastAttempt > this.authConfig.windowMs * 2) {
        this.attempts.delete(clientId);
      }
    }

    // Clean expired blocks
    for (const [clientId, blockUntil] of this.blockedIPs.entries()) {
      if (now >= blockUntil) {
        this.blockedIPs.delete(clientId);
      }
    }
  }

  /**
   * Record an attempt and check if limit exceeded
   */
  private recordAttempt(clientId: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const entry = this.attempts.get(clientId);

    if (!entry) {
      this.attempts.set(clientId, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      });
      return false; // Not exceeded
    }

    // Reset if outside window
    if (now - entry.firstAttempt > config.windowMs) {
      this.attempts.set(clientId, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      });
      return false;
    }

    // Increment counter
    entry.count++;
    entry.lastAttempt = now;

    // Check if exceeded
    if (entry.count > config.maxAttempts) {
      this.blockedIPs.set(clientId, now + config.blockDurationMs);
      return true;
    }

    return false;
  }

  /**
   * Authentication rate limiting middleware
   */
  authRateLimit = (req: Request, res: Response, next: NextFunction) => {
    const clientId = this.getClientId(req);

    // Check if already blocked
    if (this.isBlocked(clientId)) {
      SecurityAuditLogger.logAction({
        userId: 0,
        action: 'RATE_LIMIT_BLOCKED',
        resource: 'authentication',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        success: false,
        details: {
          endpoint: req.path,
          clientId: clientId.substring(0, 20) // Partial for privacy
        }
      }).catch(() => {}); // Silent fail

      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Too many authentication attempts. Please try again later.',
        retryAfter: 3600
      });
    }

    // Record attempt
    const exceeded = this.recordAttempt(clientId, this.authConfig);
    
    if (exceeded) {
      SecurityAuditLogger.logAction({
        userId: 0,
        action: 'RATE_LIMIT_EXCEEDED',
        resource: 'authentication',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        success: false,
        details: {
          endpoint: req.path,
          attempts: this.authConfig.maxAttempts
        }
      }).catch(() => {});

      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Too many authentication attempts. Account temporarily locked.',
        retryAfter: 3600
      });
    }

    // Cleanup periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanup();
    }

    next();
  };

  /**
   * General API rate limiting middleware
   */
  generalRateLimit = (req: Request, res: Response, next: NextFunction) => {
    const clientId = this.getClientId(req);

    if (this.isBlocked(clientId)) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'API rate limit exceeded. Please slow down.',
        retryAfter: 900
      });
    }

    const exceeded = this.recordAttempt(clientId, this.generalConfig);
    
    if (exceeded) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'API rate limit exceeded. Please slow down.',
        retryAfter: 900
      });
    }

    next();
  };

  /**
   * Get current rate limit status for client
   */
  getStatus(req: Request): {
    remaining: number;
    resetTime: number;
    blocked: boolean;
  } {
    const clientId = this.getClientId(req);
    const entry = this.attempts.get(clientId);
    const blocked = this.isBlocked(clientId);

    if (!entry) {
      return {
        remaining: this.authConfig.maxAttempts,
        resetTime: Date.now() + this.authConfig.windowMs,
        blocked
      };
    }

    const remaining = Math.max(0, this.authConfig.maxAttempts - entry.count);
    const resetTime = entry.firstAttempt + this.authConfig.windowMs;

    return {
      remaining,
      resetTime,
      blocked
    };
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

// Export middleware functions
export const authRateLimit = rateLimiter.authRateLimit;
export const generalRateLimit = rateLimiter.generalRateLimit;
export const getRateLimitStatus = (req: Request) => rateLimiter.getStatus(req);

export default rateLimiter;