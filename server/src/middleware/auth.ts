import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        organizationId?: string;
        role?: string;
        email?: string;
      };
    }
  }
}

interface JWTPayload {
  userId: string;
  organizationId?: string;
  iat?: number;
  exp?: number;
}

export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: 'Access token required' },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: { message: 'Server configuration error' },
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    
    // TODO: Optionally fetch user details from database to get role, email, etc.
    // For now, we'll use the basic info from the token
    req.user = {
      userId: decoded.userId,
      organizationId: decoded.organizationId,
      // role and email would be fetched from DB in a complete implementation
    };

    next();
  } catch (error) {
    logger.error('JWT authentication error:', error);
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: { message: 'Token expired' },
      });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid token' },
      });
    }

    return res.status(500).json({
      success: false,
      error: { message: 'Authentication failed' },
    });
  }
};

// Optional: Role-based authorization middleware
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' },
      });
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions' },
      });
    }

    next();
  };
};

// Optional: Organization-based authorization middleware
export const requireOrganization = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required' },
    });
  }

  if (!req.user.organizationId) {
    return res.status(403).json({
      success: false,
      error: { message: 'Organization membership required' },
    });
  }

  next();
};

export default { authenticateJWT, requireRole, requireOrganization };
