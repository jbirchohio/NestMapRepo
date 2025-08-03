import { db } from './db';
import { superadminAuditLogs } from '@shared/schema';

interface AuditLogEntry {
  userId: number;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export const auditLogger = {
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await db.insert(superadminAuditLogs).values({
        superadmin_user_id: entry.userId,
        action: entry.action,
        target_type: entry.targetType || 'system',
        target_id: entry.targetId || '0',
        details: entry.details || {},
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
        created_at: new Date()
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }
};