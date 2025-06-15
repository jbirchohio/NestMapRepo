import type { Request as ExpressRequest, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/db';

// Define the user type that will be attached to the request
type AuthUser = {
  id: string;
  email: string;
  organizationId: string;
  role: string;
};

// Custom type for the JWT payload
type JwtPayload = {
  userId: string;
  email: string;
  organizationId?: string;
  role?: string;
  [key: string]: unknown;
};

// This is needed for Node.js global types
declare const process: {
  env: {
    JWT_SECRET?: string;
  };
};

// Extend the Express Request type to include our user
declare module 'express-serve-static-core' {
  interface Request {
    user: AuthUser;
  }
}

// Re-export the extended Request type for use in route handlers
export type AuthRequest = ExpressRequest & {
  user: AuthUser;
};

// Type guard to check if a value is a valid AuthUser
function isAuthUser(user: unknown): user is AuthUser {
  const u = user as Record<string, unknown>;
  return (
    !!u && 
    typeof u === 'object' &&
    'id' in u &&
    'email' in u &&
    'organizationId' in u &&
    'role' in u &&
    typeof u.id === 'string' &&
    typeof u.email === 'string' &&
    typeof (u as { organizationId: unknown }).organizationId === 'string' &&
    typeof u.role === 'string'
  );
}

// Middleware to authenticate JWT tokens
export const authenticateJWT: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.header('authorization');

    if (!authHeader) {
      return res.sendStatus(401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.sendStatus(401);
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as JwtPayload;
    
    if (!decoded.userId || !decoded.email) {
      return res.sendStatus(403);
    }
    
    // Verify user exists in database
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, decoded.userId),
    });

    if (!user) {
      return res.sendStatus(403);
    }

    // Create user object with required properties
    const userObj: AuthUser = {
      id: user.id,
      email: user.email,
      // Handle both snake_case and camelCase organizationId
      organizationId: (user as { organization_id?: string }).organization_id || 
                     (user as { organizationId?: string }).organizationId || '',
      role: user.role || 'user',
    };

    // Attach user to request
    (req as AuthRequest).user = userObj;
    return next();
  } catch (error) {
    if (error instanceof Error) {
      console.error('JWT verification error:', error.message);
    }
    return res.sendStatus(403);
  }
};

interface RequireRoleOptions {
  allowAdmins?: boolean;
  allowSelf?: boolean;
  userIdParam?: string;
}

// Options for requireRole middleware
interface RequireRoleOptions {
  allowAdmins?: boolean;
  allowSelf?: boolean;
  userIdParam?: string;
}

// Middleware to require specific roles
export const requireRole = (
  roles: string | string[], 
  options: RequireRoleOptions = { allowAdmins: true, allowSelf: false, userIdParam: 'id' }
): RequestHandler => {
  const roleList = Array.isArray(roles) ? roles : [roles];
  
  return (async (req: ExpressRequest, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      
      if (!authReq.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Allow admins to bypass role checks if configured to do so
      if (options.allowAdmins && authReq.user.role === 'admin') {
        return next();
      }

      // Allow users to access their own resources if configured to do so
      if (options.allowSelf && options.userIdParam) {
        const userId = (req.params as Record<string, string>)[options.userIdParam];
        if (userId && userId === authReq.user.id) {
          return next();
        }
      }

      // Check if user has one of the required roles
      if (!roleList.includes(authReq.user.role)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          requiredRoles: roleList,
          userRole: authReq.user.role
        });
      }

      return next();
    } catch (error) {
      console.error('Error in requireRole middleware:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }) as RequestHandler;
};
