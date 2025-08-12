import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';
import { Request, Response } from 'express';

// Type declaration for rate limit info
declare module 'express' {
  interface Request {
    rateLimit?: {
      limit: number;
      current: number;
      remaining: number;
      resetTime: Date;
    };
  }
}

// General API rate limit - 500 requests per 15 minutes (more generous)
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 100
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limit for auth endpoints - 10 attempts per 15 minutes (reasonable for forgot password)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Increased from 5
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true // Don't count successful logins
});

// Payment endpoints - 20 requests per hour (allows retries)
export const paymentRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Increased to allow retries
  message: 'Too many payment attempts, please try again later'
});

// Super strict for password reset - 3 attempts per hour
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset attempts, please try again later',
  skipSuccessfulRequests: false
});

// Health check endpoints - higher limits
export const healthCheckRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 1 per second
  message: 'Too many health check requests'
});

// AI endpoints - moderate limits
export const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many AI requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Search endpoints - higher limits for browsing
export const searchRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: 'Too many search requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false
});

// Template creation - lower limits
export const templateCreationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 templates per hour
  message: 'Too many template creation attempts',
  standardHeaders: true,
  legacyHeaders: false
});

// Webhook endpoints - very high limits
export const webhookRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // Very high for webhooks
  message: 'Too many webhook requests',
  standardHeaders: true,
  legacyHeaders: false
});