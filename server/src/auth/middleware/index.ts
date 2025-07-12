import { Request, Response, NextFunction } from 'express.js';
import { verifyToken } from '../jwt.js';
import { TokenType, TokenVerificationResult, AuthUser } from '../types.js';
import { logger } from '../../../utils/logger.js';
import { redis } from '../../../db/redis.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      token?: string;
    }
  }
}

// Session management
const SESSION_PREFIX = 'session:.js';

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

    const result: TokenVerificationResult = await verifyToken(token, 'access');
    
    if (!result.valid || !result.payload) {
      return res.status(401).json({
        success: false,
        error: result.error || 'Invalid token',
        code: 'INVALID_TOKEN',
        expired: result.expired
      });
    }

    // Verify session
    const session = await redis.get(`${SESSION_PREFIX}${result.payload.sessionId}`);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Session expired',
        code: 'SESSION_EXPIRED'
      });
    }

    // Update session last active time
    const sessionData = JSON.parse(session);
    sessionData.lastActive = new Date().toISOString();
    await redis.set(
      `${SESSION_PREFIX}${result.payload.sessionId}`,
      JSON.stringify(sessionData)
    );

    // Attach user to request
    req.user = {
      id: result.payload.sub,
      email: result.payload.email,
      role: result.payload.role,
      organizationId: result.payload.organizationId,
      sessionId: result.payload.sessionId
    };

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

export default {
  authenticate,
  requireRole,
  requireOrganizationAccess
};
