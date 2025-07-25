import express from 'express';
import { getDatabase } from '../db/connection.js';
import { superadminAuditLogs } from '../db/schema.js';
import { authenticate as validateJWT } from '../middleware/secureAuth';
import { requireSuperadmin, type AuthenticatedRequest } from '../middleware/superadmin';
import { injectOrganizationContext } from '../middleware/organizationContext';

// Helper to get database instance
const getDB = () => {
  const db = getDatabase();
  if (!db) {
    throw new Error('Database connection not available');
  }
  return db;
};


// Import route modules
import organizationsRouter from './superadmin/organizations';
import usersRouter from './superadmin/users';
import billingRouter from './superadmin/billing';
import featureFlagsRouter from './superadmin/feature-flags';
import dashboardRouter from './superadmin/dashboard';
import auditLogsRouter from './superadmin/audit-logs';

// Audit logging function
export const logSuperadminAction = async (
  adminUserId: number,
  action: string,
  targetType: string,
  targetId?: number,
  details?: any
) => {
  try {
    const db = getDB();

    await db.insert(superadminAuditLogs).values({
      adminUserId,
      action,
      targetType,
      targetId: targetId?.toString() || '',
      details,
      ipAddress: null,
      userAgent: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to log superadmin action:', error);
  }
};

// Apply JWT auth to all superadmin routes with proper middleware
const createSuperadminRoutes = () => {
  const router = express.Router();
  
  // Apply JWT auth and organization context to all routes
  router.use(validateJWT);
  router.use(requireSuperadmin);
  router.use(injectOrganizationContext);
  
  // Mount route modules
  router.use('/organizations', organizationsRouter);
  router.use('/users', usersRouter);
  router.use('/billing', billingRouter);
  router.use('/feature-flags', featureFlagsRouter);
  router.use('/audit-logs', auditLogsRouter);
  router.use('/dashboard', dashboardRouter);
  
  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'superadmin-api' });
  });
  
  return router;
};

const router = createSuperadminRoutes();

export default router;
