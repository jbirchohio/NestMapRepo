import express, { Request, Response, RequestHandler } from 'express';
import { authenticate } from '../../shared/src/schema';
import { requireSuperadmin } from './middleware/superadmin';
import { injectOrganizationContext } from './middleware/organizationContext';

// Import route handlers
import organizationsRouter from './routes/organizations';
import usersRouter from './routes/users';
import billingRouter from './routes/billing';
import featureFlagsRouter from './routes/feature-flags';
import auditLogsRouter from './routes/audit-logs';

// Create and configure the router
const createSuperadminRoutes = () => {
  const router = express.Router();
  
  // Apply global middleware
  router.use(authenticate as unknown as RequestHandler);
  router.use(requireSuperadmin as unknown as RequestHandler);
  router.use(injectOrganizationContext as unknown as RequestHandler);
  
  // Mount route handlers
  router.use('/organizations', organizationsRouter);
  router.use('/users', usersRouter);
  router.use('/billing', billingRouter);
  router.use('/feature-flags', featureFlagsRouter);
  router.use('/audit-logs', auditLogsRouter);
  
  // Health check endpoint with proper typing
  router.get('/health', ((_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'superadmin-api' });
  }) as RequestHandler);
  
  return router;
};

const router = createSuperadminRoutes();

export default router;
