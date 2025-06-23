/**
 * SINGLE SOURCE OF TRUTH: Authentication Middleware
 *
 * This is the canonical implementation for all authentication and authorization in the application.
 * All authentication logic should be centralized through this module to ensure consistency.
 *
 * Features:
 * - JWT token verification and validation
 * - Role-based access control (RBAC)
 * - Token extraction from multiple sources (headers, cookies, query params)
 * - Rate limiting for authentication endpoints
 * - Refresh token handling
 *
 * DO NOT create duplicate authentication implementations - extend this one if needed.
 */
import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/secureJwt.js';
import { redis } from '../db/redis.js';
import { logger } from '../utils/logger.js';
import type { UserRole } from '../src/types/auth-user.js';

// Import TokenPayload from the correct location
import type { TokenPayload } from '../types/jwt.js';

// Extend Express Request type to include our custom token property
declare global {
    namespace Express {
        // This merges with the existing Request interface
        export interface Request {
            token?: string;
        }
    }
}

// Token extraction from various sources
const extractToken = (req: Request): string | null => {
    // Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7); // Remove 'Bearer ' prefix
    }
    // Check cookies
    if (req.cookies?.token) {
        return req.cookies.token;
    }
    // Check query parameters
    if (req.query?.token && typeof req.query.token === 'string') {
        return req.query.token;
    }
    return null;
};

// Convert TokenPayload to Express.User
const toUser = (payload: TokenPayload): Express.User => {
    // Extract organizationId if it exists on the payload (it's not in the TokenPayload type but might be present at runtime)
    const organizationId = 'organizationId' in payload ? (payload as any).organizationId : null;
    
    return {
        id: payload.userId,           // For compatibility with Express.User interface
        userId: payload.userId,       // Required by Express.User interface
        email: payload.email,
        role: payload.role,
        organizationId,               // Will be null if not present in payload
        displayName: payload.email.split('@')[0],
        jti: payload.jti,
        iat: payload.iat,
        exp: payload.exp,
        permissions: []
    };
};

// Middleware to verify access token
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = extractToken(req);
        if (!token) {
            logger.warn('No authentication token provided');
            res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
            return;
        }

        const result = await verifyToken(token, 'access');
        if (!result?.payload) {
            logger.warn('Invalid or expired token');
            res.status(401).json({
                success: false,
                error: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            });
            return;
        }

        // Convert and attach user to request
        req.user = toUser(result.payload as TokenPayload);
        req.token = token;
        next();
    } catch (error) {
        logger.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed',
            code: 'AUTH_FAILED'
        });
    }
};

// Middleware to verify refresh token
export const verifyRefreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = extractToken(req);
        if (!token) {
            logger.warn('No refresh token provided');
            res.status(401).json({
                success: false,
                error: 'Refresh token required',
                code: 'REFRESH_TOKEN_REQUIRED'
            });
            return;
        }

        const result = await verifyToken(token, 'refresh');
        if (!result?.payload) {
            logger.warn('Invalid or expired refresh token');
            res.status(401).json({
                success: false,
                error: 'Invalid or expired refresh token',
                code: 'INVALID_REFRESH_TOKEN'
            });
            return;
        }

        // Convert and attach user to request
        req.user = toUser(result.payload as TokenPayload);
        req.token = token;
        next();
    } catch (error) {
        logger.error('Refresh token verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Refresh token verification failed',
            code: 'REFRESH_FAILED'
        });
    }
};

// Role-based access control middleware
export const requireRole = (roles: UserRole | UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            logger.warn('Role check failed: No user in request');
            res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
            return;
        }

        const userRole = req.user.role;
        const requiredRoles = Array.isArray(roles) ? roles : [roles];
        const hasRole = requiredRoles.includes(userRole as UserRole);
        
        if (!hasRole) {
            logger.warn(`User ${req.user.id} attempted to access restricted route`);
            res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                code: 'FORBIDDEN'
            });
            return;
        }
        next();
    };
};

// Rate limiting middleware for authentication endpoints
export const rateLimitAuth = (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.connection.remoteAddress || '';
    const key = `auth:${ip}`;
    
    // Allow 5 failed attempts per 15 minutes
    redis.incr(key)
        .then((count) => {
            if (count === 1) {
                // Set expiration on first attempt
                redis.expire(key, 900); // 15 minutes
            }
            if (count > 5) {
                logger.warn(`Rate limit exceeded for IP: ${ip}`);
                res.status(429).json({
                    success: false,
                    error: 'Too many attempts. Please try again later.',
                    code: 'RATE_LIMIT_EXCEEDED',
                    retryAfter: 900
                });
                return;
            }
            next();
        })
        .catch((error) => {
            logger.error('Rate limit check failed:', error);
            next(); // Fail open in case of Redis issues
        });
};

// Middleware to reset rate limit on successful authentication
export const resetAuthRateLimit = (req: Request, _res: Response, next: NextFunction): void => {
    const ip = req.ip || req.connection.remoteAddress || '';
    const key = `auth:${ip}`;
    
    // Delete the rate limit key on successful authentication
    redis.del(key)
        .catch((error) => {
            logger.error('Failed to reset rate limit:', error);
        });
    next();
};

export default {
    authenticate,
    verifyRefreshToken,
    requireRole,
    rateLimitAuth,
    resetAuthRateLimit,
};
