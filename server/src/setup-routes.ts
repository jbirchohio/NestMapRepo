import type { Express, Router } from 'express';
import { Router as createRouter } from 'express';
import type { Container } from './common/container.js';

/**
 * Sets up all application routes with dependency injection
 * @param app Express application instance
 * @param container Dependency injection container
 */
export async function setupRoutes(app: Express, container: Container): Promise<void> {
  const router = createRouter();
  
  // Import route modules
  const { authRouter } = await import('./auth/auth.routes.js');
  const { default: proposalsRoutes } = await import('../routes/proposals.js');
  const { default: tripRoutes } = await import('../routes/trips.js');
  const { default: activityRoutes } = await import('../routes/activities.js');
  const { default: organizationRoutes } = await import('../routes/organizations.js');
  const { default: analyticsRoutes } = await import('../routes/analytics.js');
  const { default: paymentsRoutes } = await import('../routes/payments.js');
  const { default: adminRoutes } = await import('../routes/admin.js');
  const { default: invoicesRoutes } = await import('../routes/invoices.js');
  const { default: calendarRoutes } = await import('../routes/calendar.js');
  const { default: approvalRoutes } = await import('../routes/approvals.js');
  const { default: expenseRoutes } = await import('../routes/expenses.js');
  const { default: reportingRoutes } = await import('../routes/reporting.js');
  const { default: superadminRoutes } = await import('../routes/superadmin/index.js');
  const { default: webhookRoutes } = await import('../routes/webhooks.js');
  const { default: subscriptionStatusRoutes } = await import('../routes/subscription-status.js');
  const { default: aiRoutes } = await import('../routes/ai.js');
  const { default: billingRoutes } = await import('../routes/billing.js');
  const { default: securityRoutes } = await import('../routes/security.js');
  const { default: healthRoutes } = await import('../routes/health.js');
  const { default: notificationsRoutes } = await import('../routes/notifications.js');
  const { default: flightRoutes } = await import('../routes/flights.js');
  const { default: exportRoutes } = await import('../routes/export.js');
  const { default: testRoutes } = await import('../routes/test.routes.js');

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
