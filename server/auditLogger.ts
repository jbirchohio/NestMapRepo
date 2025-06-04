import { db } from './db';
import { superadminAuditLogs } from '@shared/schema';

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
      await db.insert(superadminAuditLogs).values({
        superadmin_user_id: event.userId,
        action: event.action,
        target_type: event.entityType,
        target_id: event.entityId?.toString() || '',
        details: event.details,
        ip_address: event.ipAddress,
        user_agent: event.userAgent
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging failures shouldn't break the application
    }
  }

  /**
   * Map risk level to severity for superadmin audit logs
   */
  private mapRiskToSeverity(riskLevel: 'low' | 'medium' | 'high' | 'critical'): string {
    switch (riskLevel) {
      case 'low':
        return 'info';
      case 'medium':
        return 'info';
      case 'high':
        return 'warning';
      case 'critical':
        return 'critical';
      default:
        return 'info';
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
      riskLevel: 'critical' // Security events are always critical
    });
  }

  /**
   * Calculate risk level for authentication events
   */
  private calculateAuthRiskLevel(action: string, details: any): 'low' | 'medium' | 'high' | 'critical' {
    if (action === 'login_failed') return 'medium';
    if (action === 'password_reset') return 'medium';
    if (action === 'mfa_disabled') return 'high';
    if (action === 'account_locked') return 'high';
    if (action === 'suspicious_login') return 'critical';
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
}

export const auditLogger = new AuditLogger();

/**
 * Express middleware for automatic audit logging
 */
export function auditMiddleware(req: any, res: any, next: any) {
  if (req.user && req.user.organizationId) {
    const originalJson = res.json;
    res.json = function(body: any) {
      // Log successful API calls
      if (res.statusCode < 400) {
        auditLogger.logAction({
          userId: req.user.id,
          organizationId: req.user.organizationId,
          action: `${req.method}_${req.path.replace(/\//g, '_')}`,
          entityType: 'api',
          details: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          riskLevel: 'low'
        });
      }
      return originalJson.call(this, body);
    };
  }
  next();
}