import type { Request, Response, NextFunction } from 'express';
import { prismaAuthService } from '../services/prisma-auth.service.js';
import { PrismaUserRepository } from '../../common/database/index.js';
import { AuthErrorCode, AuthErrorException } from '@shared/types/auth/auth.js';
import { logger } from '../../../utils/logger.js';
import type { UserRole as PrismaUserRole } from '@prisma/client';
import { hasRole as checkRole, hasPermission as checkPermission } from '../../types/auth-user.js';

// Import UserRole from the correct location in the user types
import type { UserRole } from '@shared/schema/types/user';

// Define AuthUser interface to match the one in auth-user.ts
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: string[];
  organizationId?: string | null;
  [key: string]: unknown;
}

// Extend Express types
  /**
   * Global namespace extension to include custom properties and methods
   * in the Express User and Request interfaces.
   *
   * Extends the base User interface to include:
   *   - hasRole(role: UserRole | UserRole[]): boolean
   *   - hasPermission(permission: string | string[]): boolean
   * Extends the base Request interface to include:
   *   - user?: User
   *   - token?: string
   *   - tokenPayload?: TokenPayload
   */
declare global {
  namespace Express {
    // Extend the base User interface to include our methods
    interface User {
      id: string;
      email: string;  // Ensured to be non-optional
      role: UserRole;
      permissions: string[];
      organizationId?: string | null;
      hasRole(role: UserRole | UserRole[]): boolean;
      hasPermission(permission: string | string[]): boolean;
      [key: string]: unknown;
    }
    
    // Extend the base Request interface to include our custom properties
    interface Request {
      user?: User;
      token?: string;
      tokenPayload?: TokenPayload;
    }
  }
}

// Import TokenPayload from the auth service
import type { TokenPayload as AuthServiceTokenPayload } from '../services/prisma-auth.service.js';

// Align with the TokenPayload from the auth service
type TokenPayload = AuthServiceTokenPayload & {
  // Add any additional properties needed by the middleware
  jti?: string;
};

interface AuthenticatedRequest extends Request {
  user: AuthUser; // Non-null user for authenticated routes
  token: string;
  tokenPayload: TokenPayload;
}

// Type guard to check if a request is authenticated
function isAuthenticatedRequest(req: Request): req is AuthenticatedRequest {
  return !!(req as AuthenticatedRequest).user;
}



/**
 * Middleware to authenticate requests using JWT tokens
 * Verifies the access token and attaches the user to the request object
 */
/**
 * Middleware to authenticate requests using JWT tokens
 * Verifies the access token and attaches the user to the request object
 */
export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthErrorException(AuthErrorCode.MISSING_TOKEN, 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AuthErrorException(AuthErrorCode.MISSING_TOKEN, 'No token provided');
    }

    // Verify the token
    const payload = await prismaAuthService.verifyToken(token, 'access') as unknown as TokenPayload;
    
    if (!payload?.userId || !payload.email || !payload.role) {
      throw new AuthErrorException(AuthErrorCode.INVALID_TOKEN, 'Invalid token payload');
    }

    // Store the token payload on the request for later use
    const tokenPayload: TokenPayload = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId,
      iat: payload.iat ?? Math.floor(Date.now() / 1000),
      exp: payload.exp ?? Math.floor(Date.now() / 1000) + 3600, // Default 1 hour
      jti: payload.jti || ''
    };
    
    req.tokenPayload = tokenPayload;
    
    // Get user from database to ensure they still exist and have valid permissions
    const dbUser = await PrismaUserRepository.findUserById(payload.userId);
    if (!dbUser) {
      throw new AuthErrorException(AuthErrorCode.USER_NOT_FOUND, 'User not found');
    }
    
    // Get user permissions (simplified for now - will be implemented in the repository)
    const permissions = dbUser.role ? [dbUser.role] : [];
    
    // Create user object with all required properties
    // Ensure all required fields are present and properly typed
    const user: Express.User = {
      id: dbUser.id,
      email: dbUser.email || '', // Ensure email is never undefined
      role: (dbUser.role || 'user') as UserRole, // Default to 'user' role if not specified
      permissions: dbUser.role ? [dbUser.role] : [],
      organizationId: dbUser.organizationId ?? null,
      // Add any additional properties from dbUser if needed
      ...(dbUser.firstName && { firstName: dbUser.firstName }),
      ...(dbUser.lastName && { lastName: dbUser.lastName }),
      ...(dbUser.avatar && { avatar: dbUser.avatar }),
      ...(dbUser.lastLogin && { lastLogin: dbUser.lastLogin }),
      // Implement required methods with proper typing
      hasRole: function(this: AuthUser, role: UserRole | UserRole[]): boolean {
        return checkRole(this, role);
      },
      hasPermission: function(this: AuthUser, permission: string | string[]): boolean {
        return checkPermission(this, permission);
      },
      preferences: dbUser.preferences ? JSON.parse(JSON.stringify(dbUser.preferences)) : undefined
    };
    
    // Assign the user and token to the request
    (req as AuthenticatedRequest).user = user;
    (req as AuthenticatedRequest).token = token;
    (req as AuthenticatedRequest).tokenPayload = tokenPayload;
    next();
  } catch (error) {
    logger.error('Authentication error:', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    next(new AuthErrorException(AuthErrorCode.INVALID_CREDENTIALS, errorMessage));
  }
};

/**
 * Middleware to check if the authenticated user has the required role
 * @param roles Array of allowed roles
 */
/**
 * Middleware to check if the authenticated user has the required role(s)
 * @param roles Single role or array of roles that are allowed
 */
export const requireRole = (roles: PrismaUserRole | PrismaUserRole[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isAuthenticatedRequest(req)) {
      const response = { 
        error: 'Authentication required' as const,
        code: 'UNAUTHORIZED' as const
      } as const;
      res.status(401).json(response);
      return;
    }

    if (!allowedRoles.includes(req.user.role as PrismaUserRole)) {
      const response = { 
        error: 'Insufficient permissions' as const,
        code: 'FORBIDDEN' as const,
        requiredRoles: allowedRoles,
        userRole: req.user.role
      } as const;
      res.status(403).json(response);
      return;
    }

    next();
  };
};

/**
 * Fetches user permissions from the database
 * @param userId The ID of the user to fetch permissions for
 * @returns Array of permission strings
 * 
 * @todo Implement proper permission fetching once the repository is updated
 */
async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    // For now, return an empty array - permissions will be implemented in the repository
    // TODO: Implement proper permission fetching using PrismaUserRepository
    return [];
  } catch (error) {
    logger.error('Failed to fetch user permissions:', { 
      userId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return [];
  }
}

/**
 * Middleware to check if the authenticated user is the owner of the resource
 * @param getResourceOwnerId Function to get the resource owner's ID from the request
 */
/**
 * Middleware to check if the authenticated user owns the requested resource
 * @param getResourceOwnerId Function that returns the resource owner's ID from the request
 */
export const requireOwnership = (
  getResourceOwnerId: (req: Request) => Promise<string | null>
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!isAuthenticatedRequest(req)) {
        res.status(401).json({ 
          error: 'Authentication required',
          code: 'UNAUTHORIZED' 
        } as const);
        return;
      }

      // Allow admins to bypass ownership check
      if (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'super_admin') {
        return next();
      }

      const resourceOwnerId = await getResourceOwnerId(req);
      if (resourceOwnerId !== req.user.id) {
        const response = { 
          error: 'You do not have permission to access this resource' as const,
          code: 'FORBIDDEN' as const
        } as const;
        res.status(403).json(response);
        return;
      }

      next();
    } catch (error) {
      logger.error('Ownership check error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify resource ownership';
      next(new AuthErrorException(AuthErrorCode.UNKNOWN_ERROR, errorMessage));
    }
  };
};

/**
 * Middleware to ensure the request has a valid organization context
 * @param req The authenticated request
 * @param res Express response object
 * @param next Next middleware function
 */
/**
 * Middleware to ensure the request has a valid organization context
 * @param req The authenticated request
 * @param res Express response object
 * @param next Next middleware function
 */
export const requireOrganizationContext = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!isAuthenticatedRequest(req)) {
    res.status(401).json({ 
      error: 'Authentication required',
      code: 'UNAUTHORIZED' as const
    } as const);
    return;
  }
  // Type guard to check if user is authenticated
  if (!('user' in req) || !req.user) {
    const response = { 
      error: 'Authentication required',
      code: 'UNAUTHORIZED' as const
    };
    res.status(401).json(response);
    return;
  }
  
  // Type assertion to ensure we have the correct user type
  const user = req.user;
  if (!req.user) {
    const response = { 
      error: 'Authentication required',
      code: 'UNAUTHORIZED' as const
    };
    res.status(401).json(response);
    return;
  }

  if (!req.user.organizationId) {
    const response = { 
      error: 'Organization context is required' as const,
      code: 'ORGANIZATION_CONTEXT_REQUIRED' as const
    } as const;
    res.status(400).json(response);
    return;
  }

  next();
};

/**
 * Middleware to check if the authenticated user has all the required permissions
 * @param permissions Array of required permissions
 */
export const requirePermissions = (permissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!isAuthenticatedRequest(req)) {
      const response = { 
        error: 'Authentication required' as const,
        code: 'UNAUTHORIZED' as const
      } as const;
      res.status(401).json(response);
      return;
    }

    const userPermissions = req.user?.permissions || [];
    if (!permissions.every(p => userPermissions.includes(p))) {
      const response = { 
        error: 'Insufficient permissions' as const,
        code: 'FORBIDDEN' as const,
        requiredPermissions: permissions,
        userPermissions: userPermissions
      } as const;
      res.status(403).json(response);
      return;
    }

    next();
  };
};

export default {
  authenticateJWT,
  requireRole,
  requireOwnership,
  requireOrganizationContext,
  requirePermissions
};
