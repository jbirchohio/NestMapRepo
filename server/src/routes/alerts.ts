import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { getDatabase } from '../db/connection.js';
import { auditLogs } from '../db/schema';
import { eq } from '../utils/drizzle-shim';
import { and, gte } from '../utils/drizzle-shim';
// TODO: Fix count and sql imports - may need different approach
import { and, gte } from "drizzle-orm";
import { count } from "../utils/drizzle-shim";
import { logger } from '../utils/logger.js';

const router = Router();

// Apply authentication to all alert routes
router.use(authenticateJWT);

// Require superadmin role for all alert operations
const requireSuperadmin = requireRole(['super_admin']);
router.use(requireSuperadmin);

interface SystemAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'performance' | 'security' | 'system' | 'network';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  metadata?: Record<string, any>;
}

// In-memory alert storage for real-time alerts
let systemAlerts: SystemAlert[] = [];
let alertIdCounter = 1;

// Helper to get database instance
const getDB = () => {
  const db = getDatabase();
  if (!db) {
    throw new Error('Database connection not available');
  }
  return db;
};

export function createAlert(
  type: SystemAlert['type'],
  category: SystemAlert['category'],
  title: string,
  message: string,
  metadata?: Record<string, any>
): SystemAlert {
  const alert: SystemAlert = {
    id: (alertIdCounter++).toString(),
    type,
    category,
    title,
    message,
    timestamp: new Date().toISOString(),
    acknowledged: false,
    metadata
  };
  
  systemAlerts.unshift(alert);
  
  // Keep only the last 1000 alerts to prevent memory issues
  if (systemAlerts.length > 1000) {
    systemAlerts = systemAlerts.slice(0, 1000);
  }
  
  logger.info(`System alert created: ${type} - ${title}`);
  return alert;
}

export function checkSystemHealthAndGenerateAlerts(metrics: {
  memoryUsagePercent?: number;
  cpuUsagePercent?: number;
  diskUsagePercent?: number;
  responseTimeMs?: number;
  errorRate?: number;
}): void {
  const now = new Date().toISOString();
  
  // Memory usage alerts
  if (metrics.memoryUsagePercent && metrics.memoryUsagePercent > 90) {
    createAlert('critical', 'performance', 'Critical Memory Usage', 
      `Memory usage at ${metrics.memoryUsagePercent}%`, 
      { memoryUsagePercent: metrics.memoryUsagePercent, timestamp: now });
  } else if (metrics.memoryUsagePercent && metrics.memoryUsagePercent > 80) {
    createAlert('warning', 'performance', 'High Memory Usage', 
      `Memory usage at ${metrics.memoryUsagePercent}%`, 
      { memoryUsagePercent: metrics.memoryUsagePercent, timestamp: now });
  }
  
  // CPU usage alerts
  if (metrics.cpuUsagePercent && metrics.cpuUsagePercent > 95) {
    createAlert('critical', 'performance', 'Critical CPU Usage', 
      `CPU usage at ${metrics.cpuUsagePercent}%`, 
      { cpuUsagePercent: metrics.cpuUsagePercent, timestamp: now });
  } else if (metrics.cpuUsagePercent && metrics.cpuUsagePercent > 85) {
    createAlert('warning', 'performance', 'High CPU Usage', 
      `CPU usage at ${metrics.cpuUsagePercent}%`, 
      { cpuUsagePercent: metrics.cpuUsagePercent, timestamp: now });
  }
  
  // Disk usage alerts
  if (metrics.diskUsagePercent && metrics.diskUsagePercent > 95) {
    createAlert('critical', 'system', 'Critical Disk Usage', 
      `Disk usage at ${metrics.diskUsagePercent}%`, 
      { diskUsagePercent: metrics.diskUsagePercent, timestamp: now });
  } else if (metrics.diskUsagePercent && metrics.diskUsagePercent > 85) {
    createAlert('warning', 'system', 'High Disk Usage', 
      `Disk usage at ${metrics.diskUsagePercent}%`, 
      { diskUsagePercent: metrics.diskUsagePercent, timestamp: now });
  }
  
  // Response time alerts
  if (metrics.responseTimeMs && metrics.responseTimeMs > 5000) {
    createAlert('critical', 'performance', 'Critical Response Time', 
      `Average response time ${metrics.responseTimeMs}ms`, 
      { responseTimeMs: metrics.responseTimeMs, timestamp: now });
  } else if (metrics.responseTimeMs && metrics.responseTimeMs > 2000) {
    createAlert('warning', 'performance', 'High Response Time', 
      `Average response time ${metrics.responseTimeMs}ms`, 
      { responseTimeMs: metrics.responseTimeMs, timestamp: now });
  }
  
  // Error rate alerts
  if (metrics.errorRate && metrics.errorRate > 10) {
    createAlert('critical', 'system', 'Critical Error Rate', 
      `Error rate at ${metrics.errorRate}%`, 
      { errorRate: metrics.errorRate, timestamp: now });
  } else if (metrics.errorRate && metrics.errorRate > 5) {
    createAlert('warning', 'system', 'High Error Rate', 
      `Error rate at ${metrics.errorRate}%`, 
      { errorRate: metrics.errorRate, timestamp: now });
  }
}

export async function generateSecurityAlerts(): Promise<void> {
  try {
    const db = getDB();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Check for failed login attempts in the last hour
    const recentFailedLogins = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, 'login_failed'),
          gte(auditLogs.createdAt, oneHourAgo)
        )
      );
    
    const failedLoginCount = recentFailedLogins[0]?.count || 0;
    
    if (failedLoginCount > 50) {
      createAlert('critical', 'security', 'Massive Failed Login Attempts', 
        `${failedLoginCount} failed login attempts in the last hour`, 
        { failedLoginCount, timeframe: '1_hour' });
    } else if (failedLoginCount > 20) {
      createAlert('warning', 'security', 'High Failed Login Attempts', 
        `${failedLoginCount} failed login attempts in the last hour`, 
        { failedLoginCount, timeframe: '1_hour' });
    }
    
    // Check for suspicious admin actions
    const suspiciousActions = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, 'admin_access'),
          gte(auditLogs.createdAt, oneHourAgo)
        )
      );
    
    const suspiciousCount = suspiciousActions[0]?.count || 0;
    
    if (suspiciousCount > 100) {
      createAlert('warning', 'security', 'High Admin Activity', 
        `${suspiciousCount} admin actions in the last hour`, 
        { adminActionCount: suspiciousCount, timeframe: '1_hour' });
    }
    
  } catch (error) {
    logger.error('Error generating security alerts:', error);
    createAlert('warning', 'system', 'Security Alert Generation Failed', 
      'Unable to generate security alerts due to database error', 
      { error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// Get all alerts with security check and fresh data
router.get('/', async (req, res) => {
  try {
    // Generate fresh security alerts before returning
    await generateSecurityAlerts();
    
    const { acknowledged } = req.query;
    let filteredAlerts = systemAlerts;
    
    if (acknowledged === 'false') {
      filteredAlerts = systemAlerts.filter(alert => !alert.acknowledged);
    } else if (acknowledged === 'true') {
      filteredAlerts = systemAlerts.filter(alert => alert.acknowledged);
    }
    
    // Sort by timestamp (newest first)
    filteredAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    res.json({
      success: true,
      data: filteredAlerts,
      meta: {
        total: filteredAlerts.length,
        unacknowledged: systemAlerts.filter(a => !a.acknowledged).length,
        critical: filteredAlerts.filter(a => a.type === 'critical').length,
        warning: filteredAlerts.filter(a => a.type === 'warning').length,
        info: filteredAlerts.filter(a => a.type === 'info').length
      }
    });
  } catch (error) {
    logger.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts'
    });
  }
});

// Acknowledge an alert with audit logging
router.post('/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const alertIndex = systemAlerts.findIndex(alert => alert.id === id);
    
    if (alertIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }
    
    const alert = systemAlerts[alertIndex];
    alert.acknowledged = true;
    
    // Log the acknowledgment for audit purposes
    try {
      const db = getDB();
      await db.insert(auditLogs).values({
        action: 'alert_acknowledged',
        entityType: 'system_alert',
        entityId: id,
        userId: req.user?.userId,
        metadata: {
          alertType: alert.type,
          alertCategory: alert.category,
          alertTitle: alert.title,
          acknowledgedAt: new Date().toISOString()
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    } catch (auditError) {
      logger.error('Failed to log alert acknowledgment:', auditError);
      // Continue anyway - acknowledgment is more important than audit log
    }
    
    logger.info(`Alert ${id} acknowledged by user ${req.user?.userId}`);
    
    res.json({
      success: true,
      data: alert,
      message: 'Alert acknowledged successfully'
    });
  } catch (error) {
    logger.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert'
    });
  }
});

// Acknowledge all alerts with audit logging
router.post('/acknowledge-all', async (req, res) => {
  try {
    const unacknowledgedCount = systemAlerts.filter(a => !a.acknowledged).length;
    
    if (unacknowledgedCount === 0) {
      return res.json({
        success: true,
        message: 'No alerts to acknowledge'
      });
    }
    
    // Mark all as acknowledged
    systemAlerts = systemAlerts.map(alert => ({
      ...alert,
      acknowledged: true
    }));
    
    // Log the bulk acknowledgment
    try {
      const db = getDB();
      await db.insert(auditLogs).values({
        action: 'alerts_acknowledge_all',
        entityType: 'system_alerts',
        userId: req.user?.userId,
        metadata: {
          acknowledgedCount: unacknowledgedCount,
          acknowledgedAt: new Date().toISOString()
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    } catch (auditError) {
      logger.error('Failed to log bulk alert acknowledgment:', auditError);
    }
    
    logger.info(`All ${unacknowledgedCount} alerts acknowledged by user ${req.user?.userId}`);
    
    res.json({
      success: true,
      message: `Successfully acknowledged ${unacknowledgedCount} alerts`,
      data: { acknowledgedCount: unacknowledgedCount }
    });
  } catch (error) {
    logger.error('Error acknowledging all alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge all alerts'
    });
  }
});

// Clear old acknowledged alerts with audit logging
router.delete('/clear-old', async (req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const initialCount = systemAlerts.length;
    
    // Only remove acknowledged alerts older than 24 hours
    systemAlerts = systemAlerts.filter(
      alert => new Date(alert.timestamp) > oneDayAgo || !alert.acknowledged
    );
    
    const clearedCount = initialCount - systemAlerts.length;
    
    // Log the cleanup operation
    if (clearedCount > 0) {
      try {
        const db = getDB();
        await db.insert(auditLogs).values({
          action: 'alerts_cleanup',
          entityType: 'system_alerts',
          userId: req.user?.userId,
          metadata: {
            clearedCount,
            cleanupThreshold: '24_hours',
            clearedAt: new Date().toISOString()
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      } catch (auditError) {
        logger.error('Failed to log alert cleanup:', auditError);
      }
      
      logger.info(`Cleared ${clearedCount} old alerts by user ${req.user?.userId}`);
    }
    
    res.json({
      success: true,
      message: `Cleared ${clearedCount} old acknowledged alerts`,
      data: { 
        clearedCount,
        remainingCount: systemAlerts.length
      }
    });
  } catch (error) {
    logger.error('Error clearing old alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear old alerts'
    });
  }
});

// Get alert statistics
router.get('/stats', async (_req, res) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recent24h = systemAlerts.filter(
      alert => new Date(alert.timestamp) > last24Hours
    );
    const recentHour = systemAlerts.filter(
      alert => new Date(alert.timestamp) > lastHour
    );
    
    res.json({
      success: true,
      data: {
        total: systemAlerts.length,
        last24Hours: {
          total: recent24h.length,
          critical: recent24h.filter(a => a.type === 'critical').length,
          warning: recent24h.filter(a => a.type === 'warning').length,
          info: recent24h.filter(a => a.type === 'info').length,
        },
        lastHour: {
          total: recentHour.length,
          critical: recentHour.filter(a => a.type === 'critical').length,
          warning: recentHour.filter(a => a.type === 'warning').length,
          info: recentHour.filter(a => a.type === 'info').length,
        },
        byCategory: {
          performance: systemAlerts.filter(a => a.category === 'performance').length,
          security: systemAlerts.filter(a => a.category === 'security').length,
          system: systemAlerts.filter(a => a.category === 'system').length,
          network: systemAlerts.filter(a => a.category === 'network').length,
        },
        acknowledged: systemAlerts.filter(a => a.acknowledged).length,
        unacknowledged: systemAlerts.filter(a => !a.acknowledged).length
      }
    });
  } catch (error) {
    console.error('Error getting alert statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alert statistics'
    });
  }
});

export default router;



