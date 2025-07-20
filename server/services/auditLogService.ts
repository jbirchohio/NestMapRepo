/**
 * Comprehensive Audit Logging Service
 * Tracks all user actions and system events for security and compliance
 */

import { db } from '../db/db';
import { auditLogs } from '../db/auditLog';
import { logger } from '../utils/logger';
import { Request } from 'express';

export interface AuditLogEntry {
  id?: string;
  userId?: string;
  organizationId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'auth' | 'data' | 'system' | 'security' | 'billing' | 'api';
  status: 'success' | 'failure' | 'warning';
  metadata?: Record<string, any>;
}

export class AuditLogService {
  private static instance: AuditLogService;

  public static getInstance(): AuditLogService {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService();
    }
    return AuditLogService.instance;
  }

  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        ...entry,
        timestamp: new Date()
      };

      // Insert into database
      await db.insert(auditLogs).values({
        userId: auditEntry.userId || 'system',
        organizationId: auditEntry.organizationId || 'system',
        action: auditEntry.action,
        resource: auditEntry.resource,
        resourceId: auditEntry.resourceId,
        metadata: {
          details: auditEntry.details,
          ipAddress: auditEntry.ipAddress,
          userAgent: auditEntry.userAgent,
          severity: auditEntry.severity,
          category: auditEntry.category,
          status: auditEntry.status,
          timestamp: auditEntry.timestamp.toISOString(),
          ...auditEntry.metadata
        }
      });

      // Also log to application logger for immediate visibility
      logger.info('Audit log entry created', {
        action: auditEntry.action,
        resource: auditEntry.resource,
        userId: auditEntry.userId,
        organizationId: auditEntry.organizationId,
        severity: auditEntry.severity,
        status: auditEntry.status
      });
    } catch (error) {
      logger.error('Failed to create audit log entry:', error);
      // Don't throw error to avoid breaking the main application flow
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(
    action: 'login' | 'logout' | 'register' | 'password_reset' | 'mfa_enable' | 'mfa_disable',
    userId: string,
    organizationId: string | undefined,
    req: Request,
    status: 'success' | 'failure' = 'success',
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action,
      resource: 'authentication',
      details,
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
      severity: status === 'failure' ? 'high' : 'medium',
      category: 'auth',
      status
    });
  }

  /**
   * Log data access events
   */
  async logDataAccess(
    action: 'create' | 'read' | 'update' | 'delete',
    resource: string,
    resourceId: string,
    userId: string,
    organizationId: string | undefined,
    req: Request,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action,
      resource,
      resourceId,
      details,
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
      severity: action === 'delete' ? 'high' : 'low',
      category: 'data',
      status: 'success'
    });
  }

  /**
   * Log security events
   */
  async logSecurity(
    action: string,
    resource: string,
    userId: string | undefined,
    organizationId: string | undefined,
    req: Request,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'high',
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action,
      resource,
      details,
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
      severity,
      category: 'security',
      status: 'warning'
    });
  }

  /**
   * Log system events
   */
  async logSystem(
    action: string,
    resource: string,
    details?: Record<string, any>,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ): Promise<void> {
    await this.log({
      action,
      resource,
      details,
      severity,
      category: 'system',
      status: 'success'
    });
  }

  /**
   * Log API events
   */
  async logAPI(
    action: string,
    resource: string,
    userId: string | undefined,
    organizationId: string | undefined,
    req: Request,
    status: 'success' | 'failure' = 'success',
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action,
      resource,
      details: {
        ...details,
        method: req.method,
        path: req.path,
        query: req.query,
        responseTime: (req as any).responseTime
      },
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
      severity: status === 'failure' ? 'medium' : 'low',
      category: 'api',
      status
    });
  }

  /**
   * Log billing events
   */
  async logBilling(
    action: string,
    resource: string,
    userId: string,
    organizationId: string,
    req: Request,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      organizationId,
      action,
      resource,
      details,
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
      severity: 'high',
      category: 'billing',
      status: 'success'
    });
  }

  /**
   * Get audit logs for organization
   */
  async getOrganizationLogs(
    organizationId: string,
    filters?: {
      userId?: string;
      action?: string;
      resource?: string;
      category?: string;
      severity?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<AuditLogEntry[]> {
    try {
      // This would need to be implemented with proper Drizzle query building
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error('Failed to fetch audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(
    organizationId: string,
    timeframe: 'day' | 'week' | 'month' = 'week'
  ): Promise<{
    totalEvents: number;
    eventsByCategory: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    eventsByStatus: Record<string, number>;
    topUsers: Array<{ userId: string; count: number }>;
    topActions: Array<{ action: string; count: number }>;
  }> {
    try {
      // This would need to be implemented with proper aggregation queries
      // For now, return empty stats
      return {
        totalEvents: 0,
        eventsByCategory: {},
        eventsBySeverity: {},
        eventsByStatus: {},
        topUsers: [],
        topActions: []
      };
    } catch (error) {
      logger.error('Failed to fetch audit stats:', error);
      return {
        totalEvents: 0,
        eventsByCategory: {},
        eventsBySeverity: {},
        eventsByStatus: {},
        topUsers: [],
        topActions: []
      };
    }
  }
}

export const auditLogService = AuditLogService.getInstance();
