/**
 * SINGLE SOURCE OF TRUTH: API Security Middleware
 *
 * This is the canonical implementation for all API security-related middleware in the application.
 * All security-related functionality should be centralized through this module to ensure consistency.
 *
 * Features:
 * - API versioning and deprecation handling
 * - Request/response encryption for sensitive data
 * - API key management and validation
 * - Webhook signature verification
 * - Advanced rate limiting with tiered access
 * - Endpoint monitoring and anomaly detection
 *
 * DO NOT create duplicate security implementations - extend this one if needed.
 */
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Extend the Express Request type with our custom properties
declare global {
  namespace Express {
    interface Request {
      apiVersion?: string;
      apiKeyAuth?: {
        organizationId: number;
        permissions: string[];
        rateLimit: number;
      };
      // Note: 'user' property is already defined in express-augmentations.d.ts
      // with a different type, so we'll use the existing one
      [key: string]: any;
    }
  }
}

type SecureRequest = Request & {
    apiVersion?: string;
    apiKeyAuth?: {
        organizationId: number;
        permissions: string[];
        rateLimit: number;
    };
    user?: {
        id: string | number;
        role: string;
        organization_id?: number;
        subscription_tier?: 'free' | 'premium' | 'enterprise';
    };
    [key: string]: any;
};
/**
 * API versioning and deprecation middleware
 */
export function apiVersioning(req: SecureRequest, res: Response, next: NextFunction): Response | void {
    const version = req.headers['api-version'] || req.query.v || 'v1';
    const supportedVersions = ['v1', 'v2'];
    const deprecatedVersions = ['v1'];
    if (!supportedVersions.includes(version as string)) {
        return res.status(400).json({
            error: 'Unsupported API version',
            supportedVersions,
            requested: version
        });
    }
    if (deprecatedVersions.includes(version as string)) {
        res.setHeader('Deprecation', 'true');
        res.setHeader('Sunset', '2025-12-31');
        res.setHeader('Link', '</api/v2>; rel="successor-version"');
    }
    req.apiVersion = version as string;
    return next();
}
/**
 * Request/Response encryption middleware for sensitive data
 */
export function encryptSensitiveData(req: SecureRequest, res: Response, next: NextFunction): Response | void {
    // Skip encryption for non-HTTPS in development
    if (process.env.NODE_ENV !== 'production' && !req.secure) {
        return next();
    }
    const originalJson = res.json;
    res.json = function (body: any) {
        // Encrypt sensitive fields in response
        if (body && typeof body === 'object') {
            const sensitiveFields = ['email', 'phone', 'ssn', 'creditCard', 'password'];
            const encrypted = encryptSensitiveFields(body, sensitiveFields);
            return originalJson.call(this, encrypted);
        }
        return originalJson.call(this, body);
    };
    return next();
}
function encryptSensitiveFields(obj: any, fields: string[]): any {
    if (!obj || typeof obj !== 'object')
        return obj;
    const result: any = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
        if (fields.includes(key.toLowerCase()) && typeof obj[key] === 'string') {
            // In production, implement proper encryption
            result[key] = '***ENCRYPTED***';
        }
        else if (typeof obj[key] === 'object') {
            result[key] = encryptSensitiveFields(obj[key], fields);
        }
        else {
            result[key] = obj[key];
        }
    }
    return result;
}
/**
 * API key management middleware
 */
class ApiKeyManager {
    private keys = new Map<string, {
        name: string;
        organizationId: number;
        permissions: string[];
        rateLimit: number;
        expiresAt?: Date;
        lastUsed: Date;
        usageCount: number;
    }>();
    generateApiKey(organizationId: number, permissions: string[]): string {
        const keyId = crypto.randomBytes(16).toString('hex');
        const keySecret = crypto.randomBytes(32).toString('hex');
        const apiKey = `nm_${keyId}_${keySecret}`;
        this.keys.set(apiKey, {
            name: `API Key ${keyId}`,
            organizationId,
            permissions,
            rateLimit: 1000, // requests per hour
            lastUsed: new Date(),
            usageCount: 0
        });
        return apiKey;
    }
    validateApiKey(apiKey: string): {
        valid: boolean;
        organizationId?: number;
        permissions?: string[];
        rateLimit?: number;
    } {
        const keyData = this.keys.get(apiKey);
        if (!keyData) {
            return { valid: false };
        }
        if (keyData.expiresAt && new Date() > keyData.expiresAt) {
            this.keys.delete(apiKey);
            return { valid: false };
        }
        keyData.lastUsed = new Date();
        keyData.usageCount++;
        return {
            valid: true,
            organizationId: keyData.organizationId,
            permissions: keyData.permissions,
            rateLimit: keyData.rateLimit
        };
    }
    revokeApiKey(apiKey: string): boolean {
        return this.keys.delete(apiKey);
    }
}
const apiKeyManager = new ApiKeyManager();
export function authenticateApiKey(req: SecureRequest, res: Response, next: NextFunction): Response | void {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
        return next(); // Let other auth methods handle this
    }
    const validation = apiKeyManager.validateApiKey(apiKey);
    if (!validation.valid) {
        return res.status(401).json({ error: 'Invalid API key' });
    }
    req.apiKeyAuth = {
        organizationId: validation.organizationId!,
        permissions: validation.permissions!,
        rateLimit: validation.rateLimit!
    };
    return next();
}
/**
 * Webhook signature verification
 */
export function verifyWebhookSignature(secret: string) {
    return (req: SecureRequest, res: Response, next: NextFunction): Response | void => {
        const signature = req.headers['x-webhook-signature'] as string;
        const timestamp = req.headers['x-webhook-timestamp'] as string;
        if (!signature || !timestamp) {
            return res.status(401).json({ error: 'Missing webhook signature or timestamp' });
        }
        // Verify timestamp is recent (within 5 minutes)
        const now = Math.floor(Date.now() / 1000);
        const webhookTime = parseInt(timestamp);
        if (Math.abs(now - webhookTime) > 300) {
            return res.status(401).json({ error: 'Webhook timestamp too old' });
        }
        // Verify signature
        const payload = JSON.stringify(req.body);
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(`${timestamp}.${payload}`)
            .digest('hex');
        const providedSignature = signature.replace('sha256=', '');
        if (!crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(providedSignature, 'hex'))) {
            return res.status(401).json({ error: 'Invalid webhook signature' });
        }
        return next();
    };
}
/**
 * Advanced rate limiting with different tiers
 */
class AdvancedRateLimit {
    private buckets = new Map<string, {
        tokens: number;
        lastRefill: number;
        violations: number;
    }>();
    private readonly limits: Record<string, {
        requests: number;
        window: number;
    }> = {
        free: { requests: 100, window: 3600 }, // 100/hour
        premium: { requests: 1000, window: 3600 }, // 1000/hour
        enterprise: { requests: 10000, window: 3600 } // 10000/hour
    };
    checkLimit(key: string, tier: string): {
        allowed: boolean;
        remaining: number;
        resetTime: number;
    } {
        const limit = this.limits[tier];
        const now = Date.now();
        const bucket = this.buckets.get(key) || {
            tokens: limit.requests,
            lastRefill: now,
            violations: 0
        };
        // Refill tokens based on time elapsed
        const timePassed = (now - bucket.lastRefill) / 1000;
        const tokensToAdd = Math.floor(timePassed * (limit.requests / limit.window));
        bucket.tokens = Math.min(limit.requests, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
        if (bucket.tokens > 0) {
            bucket.tokens--;
            bucket.violations = Math.max(0, bucket.violations - 1);
            this.buckets.set(key, bucket);
            return {
                allowed: true,
                remaining: bucket.tokens,
                resetTime: now + ((limit.requests - bucket.tokens) * (limit.window / limit.requests) * 1000)
            };
        }
        else {
            bucket.violations++;
            this.buckets.set(key, bucket);
            return {
                allowed: false,
                remaining: 0,
                resetTime: now + (limit.window * 1000)
            };
        }
    }
    getViolations(key: string): number {
        return this.buckets.get(key)?.violations || 0;
    }
}
const advancedRateLimit = new AdvancedRateLimit();
export function tieredRateLimit(req: SecureRequest, res: Response, next: NextFunction): Response | void {
    const key = req.ip || 'unknown';
    const tier = req.user?.subscription_tier || 'free';
    const result = advancedRateLimit.checkLimit(key, tier as any);
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
    if (!result.allowed) {
        // Increase delay for repeated violations
        const violations = advancedRateLimit.getViolations(key);
        const delay = Math.min(violations * 1000, 10000); // Max 10 second delay
        setTimeout(() => {
            res.status(429).json({
                error: 'Rate limit exceeded',
                retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
                tier: tier
            });
        }, delay);
        return;
    }
    return next();
}
/**
 * API endpoint monitoring and alerting
 */
class EndpointMonitor {
    private metrics = new Map<string, {
        requests: number;
        errors: number;
        totalResponseTime: number;
        lastHour: {
            requests: number;
            errors: number;
            timestamp: number;
        }[];
    }>();
    recordRequest(endpoint: string, responseTime: number, isError: boolean) {
        const metric = this.metrics.get(endpoint) || {
            requests: 0,
            errors: 0,
            totalResponseTime: 0,
            lastHour: []
        };
        metric.requests++;
        metric.totalResponseTime += responseTime;
        if (isError)
            metric.errors++;
        // Track hourly metrics
        const now = Date.now();
        const hourlyMetric = {
            requests: 1,
            errors: isError ? 1 : 0,
            timestamp: now
        };
        metric.lastHour.push(hourlyMetric);
        // Clean old hourly data
        metric.lastHour = metric.lastHour.filter(m => now - m.timestamp < 3600000);
        this.metrics.set(endpoint, metric);
        // Check for anomalies
        this.checkAnomalies(endpoint, metric);
    }
    private checkAnomalies(endpoint: string, metric: {
        requests: number;
        errors: number;
        totalResponseTime: number;
        lastHour: {
            requests: number;
            errors: number;
            timestamp: number;
        }[];
    }) {
        const hourlyRequests = metric.lastHour.reduce((sum: number, m: any) => sum + m.requests, 0);
        const hourlyErrors = metric.lastHour.reduce((sum: number, m: any) => sum + m.errors, 0);
        const errorRate = hourlyErrors / hourlyRequests;
        const avgResponseTime = metric.totalResponseTime / metric.requests;
        // Alert conditions
        if (errorRate > 0.1) { // >10% error rate
            console.warn('HIGH_ERROR_RATE:', { endpoint, errorRate, hourlyErrors, hourlyRequests });
        }
        if (avgResponseTime > 2000) { // >2s average response time
            console.warn('SLOW_ENDPOINT:', { endpoint, avgResponseTime });
        }
        if (hourlyRequests > 10000) { // Unusual traffic spike
            console.warn('TRAFFIC_SPIKE:', { endpoint, hourlyRequests });
        }
    }
    getMetrics(endpoint?: string): any {
        if (endpoint) {
            return this.metrics.get(endpoint);
        }
        return Object.fromEntries(this.metrics);
    }
}
const endpointMonitor = new EndpointMonitor();
export function monitorEndpoints(req: SecureRequest, res: Response, next: NextFunction): Response | void {
    const start = process.hrtime.bigint();
    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    const originalEnd = res.end;
    res.end = function (chunk?: any, encoding?: any, cb?: any) {
        const end = process.hrtime.bigint();
        const responseTime = Number(end - start) / 1000000; // Convert to milliseconds
        const isError = res.statusCode >= 400;
        endpointMonitor.recordRequest(endpoint, responseTime, isError);
        return originalEnd.call(this, chunk, encoding, cb);
    };
    return next();
}
export { apiKeyManager, advancedRateLimit, endpointMonitor };
export {};
