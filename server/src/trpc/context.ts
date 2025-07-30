import type { inferAsyncReturnType } from '@trpc/server';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';

type UserContext = {
  userId?: string;
  organizationId?: string;
  role?: string;
  email?: string;
};

type CreateContextOptions = {
  req: Request;
  res: Response;
};

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/context
 */
export async function createContext({ req, res }: CreateContextOptions) {
  // Initialize user context
  const userContext: UserContext = {};
  
  // Authenticate the user if a token is present
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    try {
      // Verify the token and extract user info
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'your-secret-key',
        { maxAge: '7d' }
      ) as UserContext & { iat?: number; exp?: number };
      
      // Set user context from token
      Object.assign(userContext, {
        userId: decoded.userId,
        organizationId: decoded.organizationId,
        role: decoded.role,
        email: decoded.email,
      });
    } catch (error) {
      // Token verification failed - we'll proceed without authentication
      console.error('Token verification failed:', error);
    }
  }

  return {
    // Express request/response objects
    req,
    res,
    
    // Database instance
    db,
    
    // User context
    user: userContext.userId ? userContext : undefined,
    userId: userContext.userId,
    
    // Organization ID from the token or headers (if available)
    orgId: userContext.organizationId || (req.headers['x-org-id'] as string | undefined),
    
    // User roles
    roles: userContext.role ? [userContext.role] : [],
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
