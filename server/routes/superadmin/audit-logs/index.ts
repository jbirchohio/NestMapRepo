import { Router } from 'express';
import { requireSuperadmin } from '../../shared/src/schema.js'/../middleware/superadmin.js';
import { getAuditLogs } from './audit-service.js';

const router = Router();

/**
 * @route GET /api/superadmin/audit-logs
 * @desc Get audit logs with filtering and pagination
 * @access Private/Superadmin
 */
router.get('/', requireSuperadmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      action, 
      targetType, 
      adminUserId, 
      targetId 
    } = req.query;

    const logs = await getAuditLogs({
      page: Number(page),
      limit: Math.min(Number(limit), 100), // Cap at 100 items per page
      action: action as string | undefined,
      targetType: targetType as string | undefined,
      adminUserId: adminUserId ? Number(adminUserId) : undefined,
      targetId: targetId as string | undefined,
    });

    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
