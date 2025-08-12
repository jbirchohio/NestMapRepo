import { db } from '../db-connection';
import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';

export type AuditEventType =
  | 'template.created'
  | 'template.published'
  | 'template.purchased'
  | 'template.deleted'
  | 'template.price_changed'
  | 'payment.completed'
  | 'payment.refunded'
  | 'payment.disputed'
  | 'user.login'
  | 'user.signup'
  | 'user.suspicious_activity'
  | 'trip.created'
  | 'trip.shared'
  | 'security.webhook_failed'
  | 'security.rate_limit_exceeded'
  | 'security.piracy_detected';

export interface AuditEvent {
  eventType: AuditEventType;
  userId: number | null;
  entityId?: number | string;
  entityType?: string;
  metadata?: any;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * Lightweight audit logging service for tracking important events
 * Stores in JSON files for simplicity (can be migrated to database later)
 */
export class AuditService {
  private auditDir: string;
  private currentLogFile: string;
  private writeQueue: AuditEvent[] = [];
  private writeTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.auditDir = path.join(process.cwd(), 'logs', 'audit');
    this.currentLogFile = this.getLogFileName();
    this.ensureAuditDirectory();
  }

  /**
   * Log an audit event
   */
  async log(event: Omit<AuditEvent, 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: new Date()
    };

    // Add to write queue
    this.writeQueue.push(auditEvent);

    // Log to console for immediate visibility
    if (this.isImportantEvent(event.eventType)) {
      logger.info(`AUDIT: ${event.eventType}`, {
        userId: event.userId,
        entityId: event.entityId,
        metadata: event.metadata
      });
    }

    // Schedule batch write
    if (!this.writeTimer) {
      this.writeTimer = setTimeout(() => this.flushQueue(), 1000);
    }
  }

  /**
   * Log template events
   */
  async logTemplateEvent(
    eventType: Extract<AuditEventType, `template.${string}`>,
    templateId: number,
    userId: number,
    metadata?: any
  ) {
    await this.log({
      eventType,
      userId,
      entityId: templateId,
      entityType: 'template',
      metadata
    });
  }

  /**
   * Log payment events
   */
  async logPaymentEvent(
    eventType: Extract<AuditEventType, `payment.${string}`>,
    paymentIntentId: string,
    userId: number | null,
    metadata?: any
  ) {
    await this.log({
      eventType,
      userId,
      entityId: paymentIntentId,
      entityType: 'payment',
      metadata
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    eventType: Extract<AuditEventType, `security.${string}`>,
    userId: number | null,
    metadata?: any,
    ip?: string
  ) {
    await this.log({
      eventType,
      userId,
      metadata,
      ip
    });
  }

  /**
   * Query audit logs (simple implementation)
   */
  async queryLogs(filters: {
    eventType?: AuditEventType;
    userId?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditEvent[]> {
    try {
      const logFile = this.currentLogFile;
      const content = await fs.readFile(logFile, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      let events: AuditEvent[] = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean);

      // Apply filters
      if (filters.eventType) {
        events = events.filter(e => e.eventType === filters.eventType);
      }

      if (filters.userId !== undefined) {
        events = events.filter(e => e.userId === filters.userId);
      }

      if (filters.startDate) {
        const start = filters.startDate.getTime();
        events = events.filter(e => new Date(e.timestamp).getTime() >= start);
      }

      if (filters.endDate) {
        const end = filters.endDate.getTime();
        events = events.filter(e => new Date(e.timestamp).getTime() <= end);
      }

      // Sort by timestamp descending
      events.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Apply limit
      if (filters.limit) {
        events = events.slice(0, filters.limit);
      }

      return events;
    } catch (error) {
      logger.error('Failed to query audit logs:', error);
      return [];
    }
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(userId: number, days: number = 30): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    recentEvents: AuditEvent[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const events = await this.queryLogs({
      userId,
      startDate,
      limit: 1000
    });

    const eventsByType: Record<string, number> = {};
    for (const event of events) {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
    }

    return {
      totalEvents: events.length,
      eventsByType,
      recentEvents: events.slice(0, 10)
    };
  }

  /**
   * Detect anomalies in user behavior
   */
  async detectAnomalies(userId: number): Promise<{
    anomalies: string[];
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    const summary = await this.getUserActivitySummary(userId, 7);
    const anomalies: string[] = [];
    let riskScore = 0;

    // Check for suspicious patterns
    if (summary.eventsByType['template.created'] > 10) {
      anomalies.push('Excessive template creation');
      riskScore += 30;
    }

    if (summary.eventsByType['security.piracy_detected'] > 0) {
      anomalies.push('Piracy attempts detected');
      riskScore += 50;
    }

    if (summary.eventsByType['payment.disputed'] > 0) {
      anomalies.push('Payment disputes');
      riskScore += 40;
    }

    if (summary.eventsByType['security.rate_limit_exceeded'] > 5) {
      anomalies.push('Multiple rate limit violations');
      riskScore += 20;
    }

    // Calculate risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (riskScore >= 70) {
      riskLevel = 'high';
    } else if (riskScore >= 40) {
      riskLevel = 'medium';
    }

    return { anomalies, riskLevel };
  }

  /**
   * Generate audit report
   */
  async generateReport(startDate: Date, endDate: Date): Promise<{
    totalEvents: number;
    eventBreakdown: Record<string, number>;
    topUsers: Array<{ userId: number; eventCount: number }>;
    securityEvents: number;
    revenueEvents: number;
  }> {
    const events = await this.queryLogs({ startDate, endDate });

    const eventBreakdown: Record<string, number> = {};
    const userEventCount: Map<number, number> = new Map();
    let securityEvents = 0;
    let revenueEvents = 0;

    for (const event of events) {
      // Count by type
      eventBreakdown[event.eventType] = (eventBreakdown[event.eventType] || 0) + 1;

      // Count by user
      if (event.userId) {
        userEventCount.set(event.userId, (userEventCount.get(event.userId) || 0) + 1);
      }

      // Count security events
      if (event.eventType.startsWith('security.')) {
        securityEvents++;
      }

      // Count revenue events
      if (event.eventType.startsWith('payment.') || event.eventType === 'template.purchased') {
        revenueEvents++;
      }
    }

    // Get top users
    const topUsers = Array.from(userEventCount.entries())
      .map(([userId, eventCount]) => ({ userId, eventCount }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);

    return {
      totalEvents: events.length,
      eventBreakdown,
      topUsers,
      securityEvents,
      revenueEvents
    };
  }

  /**
   * Private helper methods
   */
  private async ensureAuditDirectory() {
    try {
      await fs.mkdir(this.auditDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create audit directory:', error);
    }
  }

  private getLogFileName(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return path.join(this.auditDir, `audit-${year}-${month}-${day}.jsonl`);
  }

  private isImportantEvent(eventType: AuditEventType): boolean {
    const importantEvents = [
      'payment.completed',
      'payment.refunded',
      'payment.disputed',
      'security.piracy_detected',
      'security.webhook_failed',
      'user.suspicious_activity'
    ];
    return importantEvents.includes(eventType);
  }

  private async flushQueue() {
    if (this.writeQueue.length === 0) {
      this.writeTimer = null;
      return;
    }

    const events = [...this.writeQueue];
    this.writeQueue = [];
    this.writeTimer = null;

    try {
      // Check if we need to rotate log file
      const currentFile = this.getLogFileName();
      if (currentFile !== this.currentLogFile) {
        this.currentLogFile = currentFile;
      }

      // Write events as JSONL (one JSON object per line)
      const lines = events.map(e => JSON.stringify(e)).join('\n') + '\n';
      await fs.appendFile(this.currentLogFile, lines);
    } catch (error) {
      logger.error('Failed to write audit logs:', error);
      // Re-add events to queue on failure
      this.writeQueue.unshift(...events);
    }
  }

  /**
   * Cleanup old log files
   */
  async cleanupOldLogs(daysToKeep: number = 90) {
    try {
      const files = await fs.readdir(this.auditDir);
      const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

      for (const file of files) {
        if (!file.startsWith('audit-') || !file.endsWith('.jsonl')) continue;

        const filePath = path.join(this.auditDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoff) {
          await fs.unlink(filePath);
          logger.info(`Deleted old audit log: ${file}`);
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup old audit logs:', error);
    }
  }
}

export const auditService = new AuditService();