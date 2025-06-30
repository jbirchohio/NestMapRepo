import type { Express, Router } from 'express';
import { Router as createRouter } from 'express';
import type { Container } from './common/container.js';

/**
 * Sets up all application routes with dependency injection
 * @param app Express application instance
 * @param container Dependency injection container
 */
export function setupRoutes(app: Express, container: Container): void {
  const router = createRouter();
  
  // Import route modules
  const { authRouter } = await import('./auth/auth.routes.js');
  const proposalsRoutes = (await import('../routes/proposals.js')).default;
  const tripRoutes = (await import('../routes/trips.js')).default;
  const activityRoutes = (await import('../routes/activities.js')).default;
  const organizationRoutes = (await import('../routes/organizations.js')).default;
  const analyticsRoutes = (await import('../routes/analytics.js')).default;
  const paymentsRoutes = (await import('../routes/payments.js')).default;
  const adminRoutes = (await import('../routes/admin.js')).default;
  const invoicesRoutes = (await import('../routes/invoices.js')).default;
  const calendarRoutes = (await import('../routes/calendar.js')).default;
  const approvalRoutes = (await import('../routes/approvals.js')).default;
  const expenseRoutes = (await import('../routes/expenses.js')).default;
  const reportingRoutes = (await import('../routes/reporting.js')).default;
  const superadminRoutes = (await import('../routes/superadmin/index.js')).default;
  const webhookRoutes = (await import('../routes/webhooks.js')).default;
  const subscriptionStatusRoutes = (await import('../routes/subscription-status.js')).default;
  const aiRoutes = (await import('../routes/ai.js')).default;
  const billingRoutes = (await import('../routes/billing.js')).default;
  const securityRoutes = (await import('../routes/security.js')).default;
  const healthRoutes = (await import('../routes/health.js')).default;
  const notificationsRoutes = (await import('../routes/notifications.js')).default;
  const flightRoutes = (await import('../routes/flights.js')).default;
  const exportRoutes = (await import('../routes/export.js')).default;
  const testRoutes = (await import('../routes/test.routes.js')).default;

  // Mount all route modules with authentication where needed
  router.use('/auth', authRouter);
  
  // Protected routes (require authentication)
  const protectedRouter = createRouter();
  
  // Apply authentication middleware to all protected routes
  protectedRouter.use(container.requireAuth());
  
  // Mount protected routes
  protectedRouter.use('/proposals', proposalsRoutes);
  protectedRouter.use('/trips', tripRoutes);
  protectedRouter.use('/activities', activityRoutes);
  protectedRouter.use('/organizations', organizationRoutes);
  protectedRouter.use('/analytics', analyticsRoutes);
  protectedRouter.use('/admin', adminRoutes);
  protectedRouter.use('/calendar', calendarRoutes);
  protectedRouter.use('/approvals', approvalRoutes);
  protectedRouter.use('/expenses', expenseRoutes);
  protectedRouter.use('/reporting', reportingRoutes);
  protectedRouter.use('/invoices', invoicesRoutes);
  protectedRouter.use('/ai', aiRoutes);
  protectedRouter.use('/billing', billingRoutes);
  protectedRouter.use('/security', securityRoutes);
  protectedRouter.use('/notifications', notificationsRoutes);
  protectedRouter.use('/flights', flightRoutes);
  protectedRouter.use('/export', exportRoutes);
  
  // Mount protected routes under /api
  router.use('/api', protectedRouter);
  
  // Webhook routes (no authentication required)
  router.use('/webhooks', webhookRoutes);
  
  // Health check routes (no authentication required)
  router.use('/health', healthRoutes);
  
  // Superadmin routes (require superadmin role)
  const superadminRouter = createRouter();
  superadminRouter.use(container.requireSuperAdmin());
  superadminRouter.use('', superadminRoutes);
  router.use('/superadmin', superadminRouter);
  
  // Test routes (development only)
  if (process.env.NODE_ENV === 'development') {
    router.use('/test', testRoutes);
  }
  
  // Mount the router to the app
  app.use(router);
  
  // 404 handler for unhandled routes
  app.use((_req, res) => {
    res.status(404).json({
      status: 'error',
      message: 'Not Found',
      code: 'NOT_FOUND',
    });
  });
}

// Export a function to get the router for testing
export function createTestRouter(container: Container): Router {
  const router = createRouter();
  
  // Mount test routes
  if (process.env.NODE_ENV === 'test') {
    const testRoutes = require('../routes/test.routes.js').default;
    router.use('/test', testRoutes);
  }
  
  return router;
}
