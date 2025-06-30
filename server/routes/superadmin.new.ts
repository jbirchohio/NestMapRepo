import express from '../../express-augmentations.js';
import { db } from '../db.js';
import { superadminAuditLogs } from '../db/schema.js';
import { authenticate as validateJWT } from '../middleware/secureAuth.js';
import { requireSuperadmin, type AuthenticatedRequest } from '../middleware/superadmin.js';
import { injectOrganizationContext } from '../middleware/organizationContext.js';
// Import route modules
import organizationsRouter from './superadmin/organizations/index.js';
import usersRouter from './superadmin/users/index.js';
import billingRouter from './superadmin/billing/index.js';
import featureFlagsRouter from './superadmin/feature-flags/index.js';
import dashboardRouter from './superadmin/dashboard/index.js';
import auditLogsRouter from './superadmin/audit-logs/index.js';
// Audit logging function
export const logSuperadminAction = async (adminUserId: number, action: string, targetType: string, targetId?: number, details?: any /** FIXANYERROR: Replace 'any' */) => {
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
