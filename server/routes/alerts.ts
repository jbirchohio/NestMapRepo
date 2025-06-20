import type { Express } from "express";
import { authenticate as validateJWT, requireRole } from '../middleware/secureAuth.js';

const requireSuperadminRole = requireRole('superadmin');
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext';
import { db } from "../db";
import { adminAuditLog } from "@shared/schema";
import { desc, eq, and, gte } from "drizzle-orm";

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
  
  // Keep only last 100 alerts
  if (systemAlerts.length > 100) {
    systemAlerts = systemAlerts.slice(0, 100);
  }
  
  console.log(`ALERT_${type.toUpperCase()}:`, {
    title,
    message,
    category,
    timestamp: alert.timestamp
  });
  
  return alert;
}

// Auto-generate alerts based on system metrics
export function checkSystemHealthAndGenerateAlerts(metrics: {
  memory: { utilization: number };
  cpu: { usage: number };
  disk: { utilization: number };
  performance: { errorRate: number; responseTimeP95: number };
  network: { activeConnections: number };
}): void {
  const now = new Date();
  const recentAlerts = systemAlerts.filter(
    alert => new Date(alert.timestamp).getTime() > now.getTime() - 300000 // Last 5 minutes
  );
  
  // Memory alerts
  if (metrics.memory.utilization > 90) {
    const hasRecentMemoryAlert = recentAlerts.some(
      alert => alert.category === 'system' && alert.title.includes('Memory')
    );
    if (!hasRecentMemoryAlert) {
      createAlert(
        'critical',
        'system',
        'Critical Memory Usage',
        `System memory utilization at ${metrics.memory.utilization.toFixed(1)}%. Immediate action required.`,
        { memoryUtilization: metrics.memory.utilization }
      );
    }
  } else if (metrics.memory.utilization > 75) {
    const hasRecentMemoryAlert = recentAlerts.some(
      alert => alert.category === 'system' && alert.title.includes('Memory')
    );
    if (!hasRecentMemoryAlert) {
      createAlert(
        'warning',
        'system',
        'High Memory Usage',
        `System memory utilization at ${metrics.memory.utilization.toFixed(1)}%. Consider optimization.`,
        { memoryUtilization: metrics.memory.utilization }
      );
    }
  }
  
  // CPU alerts
  if (metrics.cpu.usage > 85) {
    const hasRecentCpuAlert = recentAlerts.some(
      alert => alert.category === 'performance' && alert.title.includes('CPU')
    );
    if (!hasRecentCpuAlert) {
      createAlert(
        'critical',
        'performance',
        'Critical CPU Usage',
        `CPU usage at ${metrics.cpu.usage.toFixed(1)}%. System performance severely impacted.`,
        { cpuUsage: metrics.cpu.usage }
      );
    }
  } else if (metrics.cpu.usage > 70) {
    const hasRecentCpuAlert = recentAlerts.some(
      alert => alert.category === 'performance' && alert.title.includes('CPU')
    );
    if (!hasRecentCpuAlert) {
      createAlert(
        'warning',
        'performance',
        'High CPU Usage',
        `CPU usage at ${metrics.cpu.usage.toFixed(1)}%. Monitor system performance.`,
        { cpuUsage: metrics.cpu.usage }
      );
    }
  }
  
  // Disk alerts
  if (metrics.disk.utilization > 95) {
    const hasRecentDiskAlert = recentAlerts.some(
      alert => alert.category === 'system' && alert.title.includes('Disk')
    );
    if (!hasRecentDiskAlert) {
      createAlert(
        'critical',
        'system',
        'Critical Disk Space',
        `Disk utilization at ${metrics.disk.utilization.toFixed(1)}%. Storage cleanup required.`,
        { diskUtilization: metrics.disk.utilization }
      );
    }
  } else if (metrics.disk.utilization > 85) {
    const hasRecentDiskAlert = recentAlerts.some(
      alert => alert.category === 'system' && alert.title.includes('Disk')
    );
    if (!hasRecentDiskAlert) {
      createAlert(
        'warning',
        'system',
        'Low Disk Space',
        `Disk utilization at ${metrics.disk.utilization.toFixed(1)}%. Plan storage cleanup.`,
        { diskUtilization: metrics.disk.utilization }
      );
    }
  }
  
  // Performance alerts
  if (metrics.performance.errorRate > 5) {
    const hasRecentErrorAlert = recentAlerts.some(
      alert => alert.category === 'performance' && alert.title.includes('Error Rate')
    );
    if (!hasRecentErrorAlert) {
      createAlert(
        'critical',
        'performance',
        'High Error Rate',
        `Error rate at ${metrics.performance.errorRate.toFixed(2)}%. System reliability compromised.`,
        { errorRate: metrics.performance.errorRate }
      );
    }
  } else if (metrics.performance.errorRate > 1) {
    const hasRecentErrorAlert = recentAlerts.some(
      alert => alert.category === 'performance' && alert.title.includes('Error Rate')
    );
    if (!hasRecentErrorAlert) {
      createAlert(
        'warning',
        'performance',
        'Elevated Error Rate',
        `Error rate at ${metrics.performance.errorRate.toFixed(2)}%. Monitor application stability.`,
        { errorRate: metrics.performance.errorRate }
      );
    }
  }
  
  // Response time alerts
  if (metrics.performance.responseTimeP95 > 5000) {
    const hasRecentResponseAlert = recentAlerts.some(
      alert => alert.category === 'performance' && alert.title.includes('Response Time')
    );
    if (!hasRecentResponseAlert) {
      createAlert(
        'critical',
        'performance',
        'Severe Response Time Degradation',
        `95th percentile response time at ${metrics.performance.responseTimeP95.toFixed(0)}ms. User experience severely impacted.`,
        { responseTimeP95: metrics.performance.responseTimeP95 }
      );
    }
  } else if (metrics.performance.responseTimeP95 > 2000) {
    const hasRecentResponseAlert = recentAlerts.some(
      alert => alert.category === 'performance' && alert.title.includes('Response Time')
    );
    if (!hasRecentResponseAlert) {
      createAlert(
        'warning',
        'performance',
        'Slow Response Times',
        `95th percentile response time at ${metrics.performance.responseTimeP95.toFixed(0)}ms. Performance optimization needed.`,
        { responseTimeP95: metrics.performance.responseTimeP95 }
      );
    }
  }
  
  // Network connection alerts
  if (metrics.network.activeConnections > 1000) {
    const hasRecentNetworkAlert = recentAlerts.some(
      alert => alert.category === 'network' && alert.title.includes('Connections')
    );
    if (!hasRecentNetworkAlert) {
      createAlert(
        'warning',
        'network',
        'High Connection Count',
        `${metrics.network.activeConnections} active connections. Monitor for potential DDoS or traffic spike.`,
        { activeConnections: metrics.network.activeConnections }
      );
    }
  }
}

// Security alert generation from audit logs
export async function generateSecurityAlerts(): Promise<void> {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    // Check for multiple failed login attempts
    const recentFailedLogins = await db
      .select()
      .from(adminAuditLog)
      .where(
        and(
          eq(adminAuditLog.action_type, 'failed_login'),
          gte(adminAuditLog.timestamp, fifteenMinutesAgo)
        )
      )
      .orderBy(desc(adminAuditLog.timestamp));
    
    if (recentFailedLogins.length >= 5) {
      const uniqueIPs = new Set(recentFailedLogins.map(log => log.ip_address));
      createAlert(
        'warning',
        'security',
        'Multiple Failed Login Attempts',
        `${recentFailedLogins.length} failed login attempts from ${uniqueIPs.size} unique IP(s) in the last 15 minutes.`,
        { 
          failedAttempts: recentFailedLogins.length,
          uniqueIPs: uniqueIPs.size,
          timeframe: '15 minutes'
        }
      );
    }
    
    // Check for suspicious admin actions
    const suspiciousActions = await db
      .select()
      .from(adminAuditLog)
      .where(
        and(
          gte(adminAuditLog.timestamp, fifteenMinutesAgo)
        )
      )
      .orderBy(desc(adminAuditLog.timestamp));
    
    const adminActionCount = suspiciousActions.filter(
      log => ['user_role_change', 'user_deleted', 'system_config_change'].includes(log.action_type)
    ).length;
    
    if (adminActionCount >= 3) {
      createAlert(
        'info',
        'security',
        'High Administrative Activity',
        `${adminActionCount} administrative actions performed in the last 15 minutes.`,
        { 
          adminActions: adminActionCount,
          timeframe: '15 minutes'
        }
      );
    }
    
  } catch (error) {
    console.error('Error generating security alerts:', error);
  }
}

export function registerAlertsRoutes(app: Express): void {
  // Apply middleware to all alert routes
  app.use('/api/alerts', validateJWT);
  app.use('/api/alerts', injectOrganizationContext);
  app.use('/api/alerts', validateOrganizationAccess);
  
  // Get all active alerts
  app.get("/api/alerts", requireSuperadminRole, async (req, res) => {
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
      
      res.json({
        alerts: filteredAlerts,
        summary: {
          total: systemAlerts.length,
          critical: systemAlerts.filter(a => a.type === 'critical' && !a.acknowledged).length,
          warning: systemAlerts.filter(a => a.type === 'warning' && !a.acknowledged).length,
          info: systemAlerts.filter(a => a.type === 'info' && !a.acknowledged).length,
          unacknowledged: systemAlerts.filter(a => !a.acknowledged).length
        }
      });
    } catch (error) {
      console.error('Error getting alerts:', error);
      res.status(500).json({ error: 'Failed to retrieve alerts' });
    }
  });
  
  // Acknowledge an alert
  app.post("/api/alerts/:id/acknowledge", validateJWT, injectOrganizationContext, requireSuperadminRole, validateOrganizationAccess, (req, res) => {
    try {
      const { id } = req.params;
      const alert = systemAlerts.find(a => a.id === id);
      
      if (!alert) {
        return res.status(404).json({ error: 'Alert not found' });
      }
      
      alert.acknowledged = true;
      
      res.json({ 
        message: 'Alert acknowledged successfully',
        alert 
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
  });
  
  // Acknowledge all alerts
  app.post("/api/alerts/acknowledge-all", validateJWT, injectOrganizationContext, requireSuperadminRole, validateOrganizationAccess, (req, res) => {
    try {
      const unacknowledgedCount = systemAlerts.filter(a => !a.acknowledged).length;
      systemAlerts.forEach(alert => alert.acknowledged = true);
      
      res.json({ 
        message: `${unacknowledgedCount} alerts acknowledged successfully`,
        acknowledgedCount: unacknowledgedCount
      });
    } catch (error) {
      console.error('Error acknowledging all alerts:', error);
      res.status(500).json({ error: 'Failed to acknowledge all alerts' });
    }
  });
  
  // Clear old alerts
  app.delete("/api/alerts/clear-old", validateJWT, injectOrganizationContext, requireSuperadminRole, validateOrganizationAccess, (req, res) => {
    try {
      const hoursOld = parseInt(req.query.hours as string) || 24;
      const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
      
      const initialCount = systemAlerts.length;
      systemAlerts = systemAlerts.filter(
        alert => new Date(alert.timestamp) > cutoffTime
      );
      const removedCount = initialCount - systemAlerts.length;
      
      res.json({ 
        message: `Removed ${removedCount} alerts older than ${hoursOld} hours`,
        removedCount,
        remainingCount: systemAlerts.length
      });
    } catch (error) {
      console.error('Error clearing old alerts:', error);
      res.status(500).json({ error: 'Failed to clear old alerts' });
    }
  });
  
  // Get alert statistics
  app.get("/api/alerts/stats", validateJWT, injectOrganizationContext, requireSuperadminRole, validateOrganizationAccess, (req, res) => {
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
      });
    } catch (error) {
      console.error('Error getting alert statistics:', error);
      res.status(500).json({ error: 'Failed to retrieve alert statistics' });
    }
  });
}