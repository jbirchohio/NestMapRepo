import express from '../../express-augmentations.ts';
import { db } from '../db.ts';
import { superadminAuditLogs } from '../db/schema.js';
import { authenticate as validateJWT } from '../middleware/secureAuth.js';
import { requireSuperadmin, type AuthenticatedRequest } from '../middleware/superadmin.js';
import { injectOrganizationContext } from '../middleware/organizationContext.ts';
// Import route modules
import organizationsRouter from './superadmin/organizations/index.ts';
import usersRouter from './superadmin/users/index.ts';
import billingRouter from './superadmin/billing/index.ts';
import featureFlagsRouter from './superadmin/feature-flags/index.ts';
import dashboardRouter from './superadmin/dashboard/index.ts';
import auditLogsRouter from './superadmin/audit-logs/index.ts';
// Audit logging function
export const logSuperadminAction = async (adminUserId: number, action: string, targetType: string, targetId?: number, details?: any) => {
    try {
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
    }
    catch (error) {
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
