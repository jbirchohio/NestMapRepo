import { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import { prismaTenantMiddleware, prismaErrorHandler, AuthUser } from '../database/prisma.js';

// Extend Express types to include our custom properties
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      organizationId?: string | null;
    }
  }
}

/**
 * Middleware to set up Prisma context for the request
 * This should be added after the auth middleware but before route handlers
 */
export const prismaContextMiddleware: RequestHandler = (req, res, next) => {
  try {
    // Set up the organization context from the authenticated user
    if (req.user) {
      // The auth middleware should have already set req.user
      // We'll use the prismaTenantMiddleware to handle the organization context
      return prismaTenantMiddleware(req, res, next);
    }
    
    // If no user is authenticated, continue to the next middleware
    // The route handlers will need to handle unauthenticated requests
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to handle Prisma errors
 * This should be added as an error handling middleware
 */
export const handlePrismaErrors: ErrorRequestHandler = (err, req, res, next) => {
  return prismaErrorHandler(err, req, res, next);
};

/**
 * Middleware to ensure database connection is available
 * This should be added early in the middleware chain
 */
export const ensureDbConnection: RequestHandler = async (_req, _res, next) => {
  try {
    // The Prisma client will handle connection pooling automatically
    // We don't need to explicitly connect on each request
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    next(error);
  }
};

export default {
  prismaContextMiddleware,
  handlePrismaErrors,
  ensureDbConnection,
};
