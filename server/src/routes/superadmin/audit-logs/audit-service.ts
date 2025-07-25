import { db } from '../../../db';
import { superadminAuditLogs } from '../../../src/db/superadminSchema';
import { sql, eq, and, desc } from 'drizzle-orm';

export interface LogActionOptions {
  ipAddress?: string;
  userAgent?: string;
  targetUserId?: string;
  targetOrganizationId?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

/**
 * Logs an admin action to the audit log
 * @param adminUserId The ID of the admin performing the action (string UUID)
 * @param action The action being performed (e.g., 'CREATE_ORGANIZATION')
 * @param entityType The type of resource being acted upon (e.g., 'organization')
 * @param entityId The ID of the resource being acted upon
 * @param details Additional details about the action
 * @param options Additional options for logging
 */
export const logSuperadminAction = async (
  adminUserId: string | number,
  action: string,
  entityType: string,
  entityId?: string | number,
  details?: any,
  options?: LogActionOptions
) => {
  try {
    // Convert adminUserId to UUID string if it's a number
    const adminUserIdString = typeof adminUserId === 'number' ? 
      String(adminUserId) : // Convert number to string - the schema expects UUID
      adminUserId;
      
    await db.insert(superadminAuditLogs).values({
      adminUserId: adminUserIdString,
      action,
      entityType,
      entityId: entityId?.toString(),
      targetUserId: options?.targetUserId,
      targetOrganizationId: options?.targetOrganizationId,
      details: details || null,
      ipAddress: options?.ipAddress || null,
      userAgent: options?.userAgent || null,
      severity: options?.severity || 'info',
    });
  } catch (error) {
    console.error('Failed to log superadmin action:', error);
    // Don't throw to avoid breaking the main operation
  }
};

/**
 * Retrieves audit logs with filtering and pagination
 */
export const getAuditLogs = async (options: {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  adminUserId?: string;
  entityId?: string | number;
}) => {
  const { page = 1, limit = 50, action, entityType, adminUserId, entityId } = options;
  const offset = (page - 1) * limit;

  // Build where conditions using proper Drizzle syntax
  const whereConditions: any[] = [];
  
  if (action) whereConditions.push(eq(superadminAuditLogs.action, action));
  if (entityType) whereConditions.push(eq(superadminAuditLogs.entityType, entityType));
  if (adminUserId) whereConditions.push(eq(superadminAuditLogs.adminUserId, adminUserId));
  if (entityId) whereConditions.push(eq(superadminAuditLogs.entityId, entityId.toString()));

  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

  const [logs, countResult] = await Promise.all([
    db
      .select()
      .from(superadminAuditLogs)
      .where(whereClause)
      .orderBy(desc(superadminAuditLogs.createdAt))
      .limit(limit)
      .offset(offset),
    
    db
      .select({ count: sql<number>`count(*)` })
      .from(superadminAuditLogs)
      .where(whereClause)
  ]);

  const count = countResult[0]?.count || 0;

  return {
    data: logs,
    pagination: {
      total: Number(count),
      page,
      limit,
      totalPages: Math.ceil(Number(count) / limit)
    }
  };
};
