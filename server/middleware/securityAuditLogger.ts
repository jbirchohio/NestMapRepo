import type { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';
import { adminAuditLog } from '../db/schema.js';
interface AuditLogEntry {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    organizationId?: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    details?: Record<string, any>;
}
/**
 * Security audit logging for admin actions and sensitive operations
 */
export class SecurityAuditLogger {
    /**
     * Log security-sensitive action
     */
    static async logAction(entry: AuditLogEntry): Promise<void> {
        try {
            await db.insert(adminAuditLog).values({
                action: entry.action,
                entityType: 'security',
                entityId: entry.resourceId,
                userId: entry.userId,
                organizationId: entry.organizationId,
                ipAddress: entry.ipAddress,
                userAgent: entry.userAgent,
                metadata: entry.details ? { details: entry.details } : undefined,
                createdAt: new Date()
            });
        }
        catch (error) {
            // Log audit failure to console but don't throw to avoid breaking the request
            console.error('Failed to write security audit log:', error);
        }
    }
    /**
     * Middleware to automatically log admin actions
     */
    static auditAdminAction(action: string, resource: string) {
        return async (req: Request, res: Response, next: NextFunction) => {
            const originalSend = res.send.bind(res);
            res.send = function (data: any) {
                const success = res.statusCode >= 200 && res.statusCode < 400;
                if (req.user) {
                    SecurityAuditLogger.logAction({
                        userId: req.user.id,
                        action,
                        resource,
                        resourceId: req.params.id || req.params.orgId || req.params.userId,
                        organizationId: req.user.organizationId,
                        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
                        userAgent: req.get('User-Agent') || 'unknown',
                        success,
                        details: {
                            method: req.method,
                            path: req.path,
                            query: req.query,
                            statusCode: res.statusCode
                        }
                    }).catch(err => console.error('Audit logging failed:', err));
                }
                return originalSend(data);
            };
            next();
        };
    }
    /**
     * Log authentication attempts
     */
    static async logAuthAttempt(email: string, success: boolean, ipAddress: string, userAgent: string, userId?: string, organizationId?: string): Promise<void> {
        await this.logAction({
            userId: userId || 'system',
            action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
            resource: 'authentication',
            organizationId,
            ipAddress,
            userAgent,
            success,
            details: {
                email,
                timestamp: new Date().toISOString()
            }
        });
    }
    /**
     * Log white label configuration changes
     */
    static async logWhiteLabelChange(userId: string, organizationId: string, action: string, changes: Record<string, any>, ipAddress: string, userAgent: string): Promise<void> {
        await this.logAction({
            userId,
            action: `WHITELABEL_${action.toUpperCase()}`,
            resource: 'white_label_settings',
            organizationId,
            ipAddress,
            userAgent,
            success: true,
            details: {
                changes,
                timestamp: new Date().toISOString()
            }
        });
    }
    /**
     * Log organization management actions
     */
    static async logOrgManagement(userId: string, organizationId: string, action: string, targetUserId?: string, details?: Record<string, any>, ipAddress: string = 'unknown', userAgent: string = 'unknown'): Promise<void> {
        await this.logAction({
            userId,
            action: `ORG_${action.toUpperCase()}`,
            resource: 'organization',
            resourceId: targetUserId?.toString(),
            organizationId,
            ipAddress,
            userAgent,
            success: true,
            details: {
                targetUserId,
                ...details,
                timestamp: new Date().toISOString()
            }
        });
    }
    /**
     * Log payment and billing actions
     */
    static async logBillingAction(userId: string, organizationId: string, action: string, amount?: number, currency?: string, ipAddress: string = 'unknown', userAgent: string = 'unknown'): Promise<void> {
        await this.logAction({
            userId,
            action: `BILLING_${action.toUpperCase()}`,
            resource: 'billing',
            organizationId,
            ipAddress,
            userAgent,
            success: true,
            details: {
                amount,
                currency,
                timestamp: new Date().toISOString()
            }
        });
    }
}
/**
 * Middleware to audit admin dashboard access
 */
export function auditAdminAccess(req: Request, next: NextFunction) {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
        SecurityAuditLogger.logAction({
            userId: req.user.id,
            action: 'ADMIN_ACCESS',
            resource: 'admin_dashboard',
            organizationId: req.user.organizationId,
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            success: true,
            details: {
                path: req.path,
                method: req.method
            }
        }).catch(err => console.error('Admin access audit failed:', err));
    }
    next();
}
/**
 * Middleware to audit superadmin actions
 */
export function auditSuperadminAction(action: string) {
    return SecurityAuditLogger.auditAdminAction(`SUPERADMIN_${action.toUpperCase()}`, 'superadmin');
}
export default SecurityAuditLogger;
