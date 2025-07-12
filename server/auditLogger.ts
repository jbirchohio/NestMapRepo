import { db } from './db.js';
import { auditLogs } from './db/auditLog.js';

interface AuditLogEntry {
  userId: string;
  organizationId: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export const auditLogger = {
  async logAuth(
    userId: string,
    organizationId: string,
    action: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ) {
    return this.log({
      userId,
      organizationId,
      action,
      details,
      ipAddress,
      userAgent,
      logType: 'auth',
    });
  },

  async logAdminAction(
    userId: string,
    organizationId: string,
    action: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ) {
    return this.log({
      userId,
      organizationId,
      action,
      details,
      ipAddress,
      userAgent,
      logType: 'admin',
    });
  },

  async log(entry: AuditLogEntry & { logType: string }) {
    try {
      await db.insert(auditLogs).values({
        organizationId: entry.organizationId,
        userId: entry.userId,
        action: entry.action,
        resource: entry.logType,
        resourceId: undefined,
        metadata: entry.details || {},
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // In production, you might want to queue failed logs for retry
    }
  },
};
