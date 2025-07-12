import { Router, Request, Response } from 'express';
import { db } from '../db-connection.js';
import { users, adminAuditLog, organizations, userSessions } from '../../@shared/schema';
import { eq, and, desc, gte, sql, count } from 'drizzle-orm';
import { z } from 'zod';
import { getActiveUserCount } from '../middleware/sessionTracking.js';
import { authenticate as validateJWT } from '../middleware/secureAuth.js';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext.js';

const router = Router();

// Apply middleware to all security routes
router.use(validateJWT);
router.use(injectOrganizationContext);
router.use(validateOrganizationAccess);

// Security alert types
export interface SecurityAlert {
  id: string;
  type: 'suspicious_login' | 'privilege_escalation' | 'unusual_activity' | 'failed_authentication' | 'data_access.js';
  severity: 'low' | 'medium' | 'high' | 'critical.js';
  title: string;
  description: string;
  timestamp: Date;
  userId?: number;
  organizationId?: number;
  metadata: Record<string, any>;
  resolved: boolean;
}

// GET /api/security/alerts - Get security alerts
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    // Get recent suspicious activities from audit logs
    const recentLogs = await db.select()
      .from(adminAuditLog)
      .where(and(
        eq(adminAuditLog.target_organization_id, organizationId),
        gte(adminAuditLog.timestamp, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
      ))
      .orderBy(desc(adminAuditLog.timestamp))
      .limit(100);

    // Analyze logs for security patterns
    const alerts: SecurityAlert[] = [];

    // Check for privilege escalation attempts
    const privilegeChanges = recentLogs.filter(log => 
      log.action_type === 'role_updated' || log.action_type === 'user_role_changed'
    );

    if (privilegeChanges.length > 5) {
      alerts.push({
        id: `priv_esc_${Date.now()}`,
        type: 'privilege_escalation',
        severity: 'high',
        title: 'Multiple Privilege Changes Detected',
        description: `${privilegeChanges.length} privilege changes in the last 7 days. Review for unauthorized escalations.`,
        timestamp: new Date(),
        organizationId,
        metadata: { count: privilegeChanges.length, actions: privilegeChanges.map(p => p.action_type) },
        resolved: false
      });
    }

    // Check for unusual admin activity
    const adminActions = recentLogs.filter(log => 
      log.action_type.includes('admin') || log.action_type.includes('delete') || log.action_type.includes('role')
    );

    if (adminActions.length > 10) {
      alerts.push({
        id: `admin_activity_${Date.now()}`,
        type: 'unusual_activity',
        severity: 'medium',
        title: 'High Administrative Activity',
        description: `${adminActions.length} administrative actions detected. Verify all changes are authorized.`,
        timestamp: new Date(),
        organizationId,
        metadata: { count: adminActions.length },
        resolved: false
      });
    }

    // Check for data access patterns
    const dataAccessActions = recentLogs.filter(log => 
      log.action_type.includes('export') || log.action_type.includes('download')
    );

    if (dataAccessActions.length > 0) {
      alerts.push({
        id: `data_access_${Date.now()}`,
        type: 'data_access',
        severity: 'low',
        title: 'Data Export Activity',
        description: `${dataAccessActions.length} data export operations detected.`,
        timestamp: new Date(),
        organizationId,
        metadata: { count: dataAccessActions.length },
        resolved: false
      });
    }

    res.json(alerts);
  } catch (error) {
    console.error('Error fetching security alerts:', error);
    res.status(500).json({ error: 'Failed to fetch security alerts' });
  }
});

// GET /api/security/metrics - Get security metrics
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get user activity metrics
    const [
      totalUsers,
      activeUsers24h,
      adminActions24h,
      suspiciousActivity7d,
      failedLogins30d
    ] = await Promise.all([
      db.select({ count: count() })
        .from(users)
        .where(eq(users.organization_id, organizationId)),
      
      // Use in-memory tracking for active users until database is updated
      Promise.resolve({ count: getActiveUserCount(organizationId) }),
      
      db.select({ count: count() })
        .from(adminAuditLog)
        .where(and(
          eq(adminAuditLog.target_organization_id, organizationId),
          gte(adminAuditLog.timestamp, last24h),
          sql`action_type LIKE '%admin%' OR action_type LIKE '%delete%' OR action_type LIKE '%role%'`
        )),
      
      db.select({ count: count() })
        .from(adminAuditLog)
        .where(and(
          eq(adminAuditLog.target_organization_id, organizationId),
          gte(adminAuditLog.timestamp, last7d),
          sql`action_type LIKE '%failed%' OR action_type LIKE '%suspicious%'`
        )),
      
      db.select({ count: count() })
        .from(adminAuditLog)
        .where(and(
          eq(adminAuditLog.target_organization_id, organizationId),
          gte(adminAuditLog.timestamp, last30d),
          sql`action_type LIKE '%login_failed%' OR action_type LIKE '%auth_failed%'`
        ))
    ]);

    // Calculate security score (0-100)
    const securityScore = calculateSecurityScore({
      totalUsers: totalUsers[0].count,
      adminActions: adminActions24h[0].count,
      suspiciousActivity: suspiciousActivity7d[0].count,
      failedLogins: failedLogins30d[0].count
    });

    const metrics = {
      securityScore,
      totalUsers: totalUsers[0].count,
      activeUsers24h: activeUsers24h.count,
      adminActions24h: adminActions24h[0].count,
      suspiciousActivity7d: suspiciousActivity7d[0].count,
      failedLogins30d: failedLogins30d[0].count,
      lastUpdated: new Date(),
      trends: {
        securityTrend: 'stable', // Could be 'improving', 'declining', 'stable'
        riskLevel: securityScore > 80 ? 'low' : securityScore > 60 ? 'medium' : 'high'
      }
    };

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching security metrics:', error);
    res.status(500).json({ error: 'Failed to fetch security metrics' });
  }
});

// GET /api/security/audit-summary - Get audit log summary
router.get('/audit-summary', async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get audit summary by action type
    const auditSummary = await db.execute(sql`
      SELECT 
        action_type,
        COUNT(*) as count,
        MAX(timestamp) as last_occurrence
      FROM admin_audit_log 
      WHERE target_organization_id = ${organizationId} 
        AND timestamp >= ${last7d}
      GROUP BY action_type 
      ORDER BY count DESC 
      LIMIT 20
    `);

    // Get recent critical actions
    const criticalActions = await db.select()
      .from(adminAuditLog)
      .where(and(
        eq(adminAuditLog.target_organization_id, organizationId),
        gte(adminAuditLog.timestamp, last7d),
        sql`action_type IN ('user_deleted', 'role_created', 'role_deleted', 'organization_updated', 'admin_access_granted')`
      ))
      .orderBy(desc(adminAuditLog.timestamp))
      .limit(10);

    const summary = {
      actionSummary: auditSummary.rows.map((row: any) => ({
        action: row.action_type,
        count: parseInt(row.count),
        lastOccurrence: new Date(row.last_occurrence)
      })),
      criticalActions: criticalActions.map(action => ({
        id: action.id,
        action: action.action_type,
        adminUserId: action.admin_user_id,
        details: action.action_data,
        createdAt: action.timestamp,
        ipAddress: action.ip_address
      })),
      period: '7 days',
      generatedAt: new Date()
    };

    res.json(summary);
  } catch (error) {
    console.error('Error fetching audit summary:', error);
    res.status(500).json({ error: 'Failed to fetch audit summary' });
  }
});

// POST /api/security/alerts/:id/resolve - Resolve security alert
router.post('/alerts/:id/resolve', async (req: Request, res: Response) => {
  try {
    const alertId = req.params.id;
    const { resolution, notes } = req.body;

    // In a real implementation, you'd store alert resolutions in a database
    // For now, we'll just acknowledge the resolution
    
    // Log the resolution as an admin action
    const logEntry = {
      admin_user_id: req.user?.id || 0,
      action_type: 'security_alert_resolved',
      target_organization_id: req.user?.organization_id,
      action_data: { alertId, resolution, notes },
      ip_address: req.ip || 'unknown'
    };

    await db.insert(adminAuditLog).values(logEntry);

    res.json({ 
      success: true, 
      message: 'Security alert resolved successfully',
      resolvedAt: new Date()
    });
  } catch (error) {
    console.error('Error resolving security alert:', error);
    res.status(500).json({ error: 'Failed to resolve security alert' });
  }
});

// Helper function to calculate security score
function calculateSecurityScore(metrics: {
  totalUsers: number;
  adminActions: number;
  suspiciousActivity: number;
  failedLogins: number;
}): number {
  let score = 100;

  // Deduct points for excessive admin actions (relative to user base)
  const adminActionRatio = metrics.totalUsers > 0 ? metrics.adminActions / metrics.totalUsers : 0;
  if (adminActionRatio > 0.5) score -= 20;
  else if (adminActionRatio > 0.3) score -= 10;
  else if (adminActionRatio > 0.1) score -= 5;

  // Deduct points for suspicious activity
  if (metrics.suspiciousActivity > 10) score -= 30;
  else if (metrics.suspiciousActivity > 5) score -= 15;
  else if (metrics.suspiciousActivity > 0) score -= 5;

  // Deduct points for failed logins
  if (metrics.failedLogins > 50) score -= 25;
  else if (metrics.failedLogins > 20) score -= 15;
  else if (metrics.failedLogins > 10) score -= 10;
  else if (metrics.failedLogins > 0) score -= 5;

  return Math.max(0, Math.min(100, score));
}

export default router;