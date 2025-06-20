import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import { db } from '../db';
import { auditLogs } from '../db/auditLog';
import { authenticate as validateJWT } from '../middleware/secureAuth.js';
import { requireSuperadmin, type AuthenticatedRequest } from '../middleware/superadmin';
import { injectOrganizationContext } from '../middleware/organizationContext';

// Import route modules
import organizationsRouter from './superadmin/organizations';
import usersRouter from './superadmin/users';
import billingRouter from './superadmin/billing';
import featureFlagsRouter from './superadmin/feature-flags';
import dashboardRouter from './superadmin/dashboard';
import auditLogsRouter from './superadmin/audit-logs';

// Audit logging function
export const logSuperadminAction = async (
  adminUserId: string,
  action: string,
  resource: string,
  resourceId?: string,
  metadata?: Record<string, unknown>
) => {
  try {
    await db.insert(auditLogs).values({
      organizationId: '00000000-0000-0000-0000-000000000000', // System organization for superadmin actions
      userId: adminUserId,
      action,
      resource,
      resourceId: resourceId || null,
      metadata: metadata || null,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Failed to log superadmin action:', error);
  }
};

// Helper to properly type middleware with AuthenticatedRequest
const typedMiddleware = (
  middleware: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void | Promise<void | Response> | Response
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Call the middleware with proper typing
    const result = middleware(req as unknown as AuthenticatedRequest, res, (err?: any) => {
      if (err) return next(err);
      next();
    });
    
    // Handle async middleware
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      return (result as Promise<void | Response>).catch(next);
    }
    
    // If the middleware returned a response, return it
    return result;
  };
};

// Apply JWT auth to all superadmin routes with proper middleware
const createSuperadminRoutes = () => {
  const router = express.Router();

  // Type for middleware that can be sync or async and may return a Response
  type Middleware = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void | Response | Promise<void | Response>;

  // Helper to apply middleware with proper typing
  const applyMiddleware = (middleware: Middleware) => {
    return (req: Request, res: Response, next: NextFunction) => {
      // Create a next function wrapper that properly handles errors
      const nextWrapper = (err?: any) => {
        if (err) return next(err);
        next();
      };

      try {
        // Call the middleware with the wrapped next function
        const result = middleware(req, res, nextWrapper);
        
        // If the middleware returned a Promise, handle it
        if (result && typeof result === 'object' && 'then' in result) {
          return (result as Promise<void | Response>)
            .then(() => {})
            .catch(next);
        }
        
        // If the middleware returned a Response, return it
        if (result && result instanceof Response) {
          return result;
        }
        
        return undefined;
      } catch (err) {
        return next(err);
      }
    };
  };

  // Apply middleware in sequence with proper typing
  router.use(applyMiddleware(validateJWT));
  router.use(applyMiddleware((req, res, next) => 
    requireSuperadmin(req as AuthenticatedRequest, res, next)
  ));
  router.use(applyMiddleware(injectOrganizationContext));
  
  // Mount route modules
  router.use('/organizations', organizationsRouter);
  router.use('/users', usersRouter);
  router.use('/billing', billingRouter);
  router.use('/feature-flags', featureFlagsRouter);
  router.use('/audit-logs', auditLogsRouter);
  router.use('/dashboard', dashboardRouter);
  
  // Health check endpoint
  router.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'superadmin-api' });
  });
  
  return router;
};

const router = createSuperadminRoutes();

export default router;
