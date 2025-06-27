import { db } from '../../../db.ts';
import { superadminAuditLogs } from '../../../db/schema.js';
/**
 * Logs an admin action to the audit log
 * @param adminUserId The ID of the admin performing the action
 * @param action The action being performed (e.g., 'CREATE_ORGANIZATION')
 * @param targetType The type of resource being acted upon (e.g., 'organization')
 * @param targetId The ID of the resource being acted upon
 * @param details Additional details about the action
 */
export const logSuperadminAction = async (adminUserId: number, action: string, targetType: string, targetId?: string | number, details?: any /** FIXANYERROR: Replace 'any' */) => {
    try {
        await db.insert(superadminAuditLogs).values({
            admin_user_id: adminUserId,
            action,
            target_type: targetType,
            target_id: targetId?.toString(),
            details: details ? JSON.stringify(details) : null,
            ip_address: null, // Can be added from request if needed
            user_agent: null, // Can be added from request if needed
        });
    }
    catch (error) {
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
    targetType?: string;
    adminUserId?: number;
    targetId?: string | number;
}) => {
    const { page = 1, limit = 50, action, targetType, adminUserId, targetId } = options;
    const offset = (page - 1) * limit;
    const whereClause = [];
    if (action)
        whereClause.push(sql `action = ${action}`);
    if (targetType)
        whereClause.push(sql `target_type = ${targetType}`);
    if (adminUserId)
        whereClause.push(sql `admin_user_id = ${adminUserId}`);
    if (targetId)
        whereClause.push(sql `target_id = ${targetId.toString()}`);
    const [logs, [{ count }]] = await Promise.all([
        db
            .select()
            .from(superadminAuditLogs)
            .where(whereClause.length > 0 ? and(...whereClause) : undefined)
            .orderBy(desc(superadminAuditLogs.created_at))
            .limit(limit)
            .offset(offset),
        db
            .select({ count: sql<number> `count(*)` })
            .from(superadminAuditLogs)
            .where(whereClause.length > 0 ? and(...whereClause) : undefined)
            .then(rows => rows[0])
    ]);
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
