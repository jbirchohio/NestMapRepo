import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/jwtAuthService';
import type { TokenPayload } from '../jwt/types';

// Create local logger if not available
const logger = {
  error: console.error,
  info: console.info,
  warn: console.warn,
  debug: console.debug
};

// Define Redis interface for type safety
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
}

// Create local redis client stub implementation
const redis: RedisClient = {
  // Implementation that ignores parameters but satisfies the interface
  get: async () => null,
  set: async () => {},
  del: async () => {}
};

// Session management
const SESSION_PREFIX = 'session:';

// Only declare interface types, not global namespaces
// The global namespace is already defined in the main Express types

/**
 * Extracts token from request
 */
function extractToken(req: Request): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
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
}

/**
 * Authentication middleware
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Pass token type as a string literal
    const result = await verifyToken(token, 'access');
    
    if (!result.valid || !result.payload) {
      return res.status(401).json({
        success: false,
        error: result.error || 'Invalid token',
        code: 'INVALID_TOKEN',
        expired: result.expired
      });
    }

    // Get payload from the result
    const payload = result.payload as TokenPayload & { 
      role: string;
      sessionId?: string;
    };

    // Handle session if we have a session ID
    if (payload.sessionId) {
      // Verify session existence
      const sessionKey = `${SESSION_PREFIX}${payload.sessionId}`;
      const session = await redis.get(sessionKey);
      
      if (!session) {
        return res.status(401).json({
          success: false,
          error: 'Session expired',
          code: 'SESSION_EXPIRED'
        });
      }

      // Update session last active time
      try {
        const sessionData = JSON.parse(session);
        sessionData.lastActive = new Date().toISOString();
        await redis.set(sessionKey, JSON.stringify(sessionData));
      } catch (e) {
        // If parsing fails, continue with authentication
        logger.warn('Failed to parse session data:', e);
      }
    }

    // Attach user to request
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role || 'user',
      organizationId: payload.organizationId
    };

    // Store token for later use
    req.token = token;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during authentication',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Role-based access control middleware
 */
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

/**
 * Organization access control middleware
 */
export const requireOrganizationAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  // If user is a super admin, bypass organization check
  if (req.user.role === 'super_admin') {
    return next();
  }

  const organizationId = req.params.organizationId || req.body.organizationId;
  
  if (req.user.organizationId !== organizationId) {
    return res.status(403).json({
      success: false,
      error: 'Access to this organization is forbidden',
      code: 'ORG_ACCESS_DENIED'
    });
  }

  next();
};

