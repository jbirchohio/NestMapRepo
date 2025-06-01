import { db } from './db';
import { adminAuditLog } from '@shared/schema';

export interface AuditEvent {
  userId: number;
  organizationId: number;
  action: string;
  entityType: string;
  entityId?: number;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class AuditLogger {
  
  /**
   * Log a user action for compliance and security monitoring
   */
  async logAction(event: AuditEvent): Promise<void> {
    try {
      await db.insert(adminAuditLog).values({
        userId: event.userId,
        organizationId: event.organizationId,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        details: event.details,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        riskLevel: event.riskLevel,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging failures shouldn't break the application
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(userId: number, organizationId: number, action: string, details: any, ipAddress?: string): Promise<void> {
    await this.logAction({
      userId,
      organizationId,
      action,
      entityType: 'authentication',
      details,
      ipAddress,
      riskLevel: this.calculateAuthRiskLevel(action, details)
    });
  }

  /**
   * Log data access events
   */
  async logDataAccess(userId: number, organizationId: number, entityType: string, entityId: number, action: string, details: any = {}): Promise<void> {
    await this.logAction({
      userId,
      organizationId,
      action,
      entityType,
      entityId,
      details,
      riskLevel: this.calculateDataAccessRiskLevel(action, entityType)
    });
  }

  /**
   * Log administrative actions
   */
  async logAdminAction(userId: number, organizationId: number, action: string, details: any, ipAddress?: string): Promise<void> {
    await this.logAction({
      userId,
      organizationId,
      action,
      entityType: 'administration',
      details,
      ipAddress,
      riskLevel: 'high' // Admin actions are always high risk
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(userId: number, organizationId: number, event: string, details: any, ipAddress?: string): Promise<void> {
    await this.logAction({
      userId,
      organizationId,
      action: event,
      entityType: 'security',
      details,
      ipAddress,
      riskLevel: 'critical'
    });
  }

  /**
   * Calculate risk level for authentication events
   */
  private calculateAuthRiskLevel(action: string, details: any): 'low' | 'medium' | 'high' | 'critical' {
    if (action === 'login_failed' && details.attempts > 3) return 'high';
    if (action === 'password_reset') return 'medium';
    if (action === 'mfa_disabled') return 'high';
    if (action === 'login_success' && details.newLocation) return 'medium';
    return 'low';
  }

  /**
   * Calculate risk level for data access events
   */
  private calculateDataAccessRiskLevel(action: string, entityType: string): 'low' | 'medium' | 'high' | 'critical' {
    if (action === 'delete' && ['user', 'organization'].includes(entityType)) return 'critical';
    if (action === 'bulk_export') return 'high';
    if (action === 'permission_change') return 'high';
    if (action === 'create' && entityType === 'user') return 'medium';
    return 'low';
  }

  /**
   * Get audit trail for compliance reporting
   */
  async getAuditTrail(organizationId: number, filters: {
    userId?: number;
    entityType?: string;
    action?: string;
    riskLevel?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}) {
    const { userId, entityType, action, riskLevel, startDate, endDate, limit = 1000 } = filters;

    let query = db
      .select()
      .from(adminAuditLog)
      .where(eq(adminAuditLog.organizationId, organizationId));

    if (userId) {
      query = query.where(eq(adminAuditLog.userId, userId));
    }

    if (entityType) {
      query = query.where(eq(adminAuditLog.entityType, entityType));
    }

    if (action) {
      query = query.where(eq(adminAuditLog.action, action));
    }

    if (riskLevel) {
      query = query.where(eq(adminAuditLog.riskLevel, riskLevel));
    }

    if (startDate) {
      query = query.where(gte(adminAuditLog.timestamp, startDate));
    }

    if (endDate) {
      query = query.where(lte(adminAuditLog.timestamp, endDate));
    }

    return await query
      .orderBy(desc(adminAuditLog.timestamp))
      .limit(limit);
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(organizationId: number, period: string) {
    const startDate = this.getPeriodStartDate(period);
    const endDate = new Date();

    const auditEvents = await this.getAuditTrail(organizationId, { startDate, endDate });

    const report = {
      period,
      totalEvents: auditEvents.length,
      eventsByType: this.groupBy(auditEvents, 'entityType'),
      eventsByRisk: this.groupBy(auditEvents, 'riskLevel'),
      eventsByAction: this.groupBy(auditEvents, 'action'),
      highRiskEvents: auditEvents.filter(e => ['high', 'critical'].includes(e.riskLevel)),
      userActivity: this.groupBy(auditEvents, 'userId'),
      complianceMetrics: {
        dataAccessLogged: auditEvents.filter(e => e.entityType !== 'authentication').length,
        authEventsLogged: auditEvents.filter(e => e.entityType === 'authentication').length,
        adminActionsLogged: auditEvents.filter(e => e.entityType === 'administration').length,
        securityEventsLogged: auditEvents.filter(e => e.entityType === 'security').length
      }
    };

    return report;
  }

  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        return new Date(now.getFullYear(), quarter * 3, 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = item[key];
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }
}

export const auditLogger = new AuditLogger();

// Middleware to automatically log API requests
export function auditMiddleware(req: any, res: any, next: any) {
  const originalSend = res.send;
  
  res.send = function(data: any) {
    // Log after response is sent
    if (req.user && req.user.organization_id) {
      const action = `${req.method.toLowerCase()}_${req.route?.path || req.path}`;
      const details = {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
        responseTime: Date.now() - req.startTime
      };

      auditLogger.logAction({
        userId: req.user.id,
        organizationId: req.user.organization_id,
        action,
        entityType: 'api_request',
        details,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        riskLevel: res.statusCode >= 400 ? 'medium' : 'low'
      }).catch(console.error);
    }
    
    return originalSend.call(this, data);
  };

  req.startTime = Date.now();
  next();
}

// Data retention policy implementation
export class DataRetentionManager {
  
  /**
   * Clean up old audit logs based on retention policy
   */
  async cleanupAuditLogs(organizationId: number, retentionDays: number = 2555) { // 7 years default
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    const deletedCount = await db
      .delete(adminAuditLog)
      .where(and(
        eq(adminAuditLog.organizationId, organizationId),
        lte(adminAuditLog.timestamp, cutoffDate)
      ));

    await auditLogger.logAdminAction(
      0, // System user
      organizationId,
      'audit_log_cleanup',
      { deletedRecords: deletedCount, cutoffDate, retentionDays }
    );

    return deletedCount;
  }

  /**
   * Archive old data to cold storage
   */
  async archiveOldData(organizationId: number, archiveAfterDays: number = 365) {
    // Implementation would depend on cold storage solution (S3, etc.)
    const cutoffDate = new Date(Date.now() - archiveAfterDays * 24 * 60 * 60 * 1000);
    
    // This would export data to archive and mark as archived
    console.log(`Archiving data older than ${cutoffDate} for organization ${organizationId}`);
    
    return { archived: true, cutoffDate };
  }
}

export const dataRetentionManager = new DataRetentionManager();