import { z } from 'zod';
import { router, protectedProcedure } from './_base.router';
import { logger } from '../../utils/logger.js';
import { db } from '../../db/db';
import { eq, and } from 'drizzle-orm/expressions';
import { adminSettings, adminAuditLog } from '../../db/schema';
import { v4 as uuidv4 } from 'uuid';

// Type definitions for system settings
type SystemSettings = {
  general: {
    platformName: string;
    maintenanceMode: boolean;
    registrationEnabled: boolean;
    emailVerificationRequired: boolean;
    maxUsersPerOrganization: number;
    sessionTimeoutMinutes: number;
  };
  security: {
    enforcePasswordComplexity: boolean;
    requireTwoFactor: boolean;
    passwordExpiryDays: number;
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    fromEmail: string;
    fromName: string;
  };
  features: {
    enableAIFeatures: boolean;
    enableAnalytics: boolean;
    enableAuditLog: boolean;
    enableRateLimiting: boolean;
  };
};

// Default system settings
const defaultSettings: SystemSettings = {
  general: {
    platformName: "NestMap",
    maintenanceMode: false,
    registrationEnabled: true,
    emailVerificationRequired: true,
    maxUsersPerOrganization: 100,
    sessionTimeoutMinutes: 60 * 24 * 7, // 1 week
  },
  security: {
    enforcePasswordComplexity: true,
    requireTwoFactor: false,
    passwordExpiryDays: 90,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 30,
  },
  email: {
    smtpHost: "smtp.example.com",
    smtpPort: 587,
    smtpSecure: false,
    fromEmail: "noreply@nestmap.com",
    fromName: "NestMap",
  },
  features: {
    enableAIFeatures: true,
    enableAnalytics: true,
    enableAuditLog: true,
    enableRateLimiting: true,
  },
};

// Validation schemas
const updateSettingsSchema = z.object({
  settings: z.record(z.any()).refine(
    (data) => {
      // Validate the structure matches SystemSettings
      try {
        // This is a simplified validation - adjust based on your needs
        return typeof data === 'object' && data !== null;
      } catch (error) {
        return false;
      }
    },
    { message: "Invalid settings structure" }
  ),
  organizationId: z.string().uuid('Invalid organization ID').optional(),
});

const getSettingsSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID').optional(),
});

const auditLogQuerySchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID').optional(),
  action: z.string().optional(),
  userId: z.string().uuid('Invalid user ID').optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0),
});

// Helper function to log admin actions
async function logAdminAction(
  userId: string,
  action: string,
  details: Record<string, any> = {},
  organizationId?: string
) {
  try {
    await db.insert(adminAuditLog).values({
      id: uuidv4(),
      userId,
      organizationId,
      action,
      details: details || {},
      ipAddress: '0.0.0.0', // Will be set by the request context in a real implementation
      userAgent: 'system',   // Will be set by the request context in a real implementation
      createdAt: new Date(),
    });
  } catch (error) {
    logger.error('Failed to log admin action:', error);
    // Don't throw, as we don't want to fail the main operation
  }
}

export const adminSettingsRouter = router({
  // Get system settings
  getSettings: protectedProcedure
    .meta({ roles: ['admin', 'superadmin_owner', 'superadmin_staff'] })
    .input(getSettingsSchema)
    .query(async ({ input, ctx }) => {
      try {
        const { organizationId } = input;
        
        // If organizationId is provided, get organization-specific settings
        // Otherwise, get global settings (where organizationId is null)
        const [settings] = await db
          .select()
          .from(adminSettings)
          .where(
            organizationId 
              ? eq(adminSettings.organizationId, organizationId)
              : sql`${adminSettings.organizationId} IS NULL`
          )
          .limit(1);

        // If no settings found, return defaults
        if (!settings) {
          return {
            success: true,
            data: {
              ...defaultSettings,
              organizationId: organizationId || null,
              isDefault: true,
            },
          };
        }

        // Merge with defaults to ensure all fields are present
        const mergedSettings = {
          ...defaultSettings,
          ...(settings.settings as SystemSettings),
          id: settings.id,
          organizationId: settings.organizationId,
          updatedAt: settings.updatedAt,
          isDefault: false,
        };

        return {
          success: true,
          data: mergedSettings,
        };
      } catch (error) {
        logger.error('Failed to fetch admin settings:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to fetch settings'
        );
      }
    }),

  // Update system settings
  updateSettings: protectedProcedure
    .meta({ roles: ['admin', 'superadmin_owner'] })
    .input(updateSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { settings, organizationId } = input;
        const userId = ctx.user.id;

        // Validate settings structure (simplified)
        if (typeof settings !== 'object' || settings === null) {
          throw new Error('Invalid settings format');
        }

        // Check if settings already exist for this organization/global
        const [existingSettings] = await db
          .select()
          .from(adminSettings)
          .where(
            organizationId 
              ? eq(adminSettings.organizationId, organizationId)
              : sql`${adminSettings.organizationId} IS NULL`
          )
          .limit(1);

        let result;
        const now = new Date();

        if (existingSettings) {
          // Update existing settings
          [result] = await db
            .update(adminSettings)
            .set({
              settings,
              updatedAt: now,
              updatedBy: userId,
            })
            .where(eq(adminSettings.id, existingSettings.id))
            .returning();
        } else {
          // Insert new settings
          [result] = await db
            .insert(adminSettings)
            .values({
              id: uuidv4(),
              organizationId: organizationId || null,
              settings,
              createdAt: now,
              updatedAt: now,
              createdBy: userId,
              updatedBy: userId,
            })
            .returning();
        }

        // Log the settings update
        await logAdminAction(
          userId,
          'UPDATE_SETTINGS',
          {
            settingsId: result.id,
            organizationId,
            changes: settings,
          },
          organizationId
        );

        // Merge with defaults for the response
        const mergedSettings = {
          ...defaultSettings,
          ...(result.settings as SystemSettings),
          id: result.id,
          organizationId: result.organizationId,
          updatedAt: result.updatedAt,
          isDefault: false,
        };

        return {
          success: true,
          data: mergedSettings,
          message: 'Settings updated successfully',
        };
      } catch (error) {
        logger.error('Failed to update admin settings:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to update settings'
        );
      }
    }),

  // Reset settings to defaults
  resetSettings: protectedProcedure
    .meta({ roles: ['superadmin_owner'] })
    .input(z.object({
      organizationId: z.string().uuid('Invalid organization ID').optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { organizationId } = input;
        const userId = ctx.user.id;

        // Delete existing settings for this organization/global
        await db
          .delete(adminSettings)
          .where(
            organizationId 
              ? eq(adminSettings.organizationId, organizationId)
              : sql`${adminSettings.organizationId} IS NULL`
          );

        // Log the reset action
        await logAdminAction(
          userId,
          'RESET_SETTINGS',
          { organizationId },
          organizationId
        );

        return {
          success: true,
          message: 'Settings reset to defaults successfully',
          data: {
            ...defaultSettings,
            organizationId: organizationId || null,
            isDefault: true,
          },
        };
      } catch (error) {
        logger.error('Failed to reset admin settings:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to reset settings'
        );
      }
    }),

  // Get audit logs
  getAuditLogs: protectedProcedure
    .meta({ roles: ['admin', 'superadmin_owner', 'superadmin_staff'] })
    .input(auditLogQuerySchema)
    .query(async ({ input, ctx }) => {
      try {
        const {
          organizationId,
          action,
          userId,
          startDate,
          endDate,
          limit,
          offset,
        } = input;

        const whereClause = [];

        // Filter by organization if provided
        if (organizationId) {
          whereClause.push(eq(adminAuditLog.organizationId, organizationId));
        } else if (ctx.user.role !== 'superadmin_owner') {
          // Non-superadmins can only see logs for their organization
          whereClause.push(eq(adminAuditLog.organizationId, ctx.user.organizationId));
        }

        // Filter by action if provided
        if (action) {
          whereClause.push(eq(adminAuditLog.action, action));
        }

        // Filter by user if provided
        if (userId) {
          whereClause.push(eq(adminAuditLog.userId, userId));
        }

        // Filter by date range if provided
        if (startDate) {
          whereClause.push(gte(adminAuditLog.createdAt, new Date(startDate)));
        }
        if (endDate) {
          whereClause.push(lte(adminAuditLog.createdAt, new Date(endDate)));
        }

        // Get paginated audit logs
        const [items, total] = await Promise.all([
          db.query.adminAuditLog.findMany({
            where: whereClause.length > 0 ? and(...whereClause) : undefined,
            orderBy: [desc(adminAuditLog.createdAt)],
            limit,
            offset,
            with: {
              user: {
                columns: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
              organization: {
                columns: {
                  id: true,
                  name: true,
                },
              },
            },
          }),
          db.select({ count: sql<number>`count(*)` })
            .from(adminAuditLog)
            .where(whereClause.length > 0 ? and(...whereClause) : undefined)
            .then(res => Number(res[0].count)),
        ]);

        return {
          success: true,
          data: {
            items,
            total,
            hasMore: offset + items.length < total,
          },
        };
      } catch (error) {
        logger.error('Failed to fetch audit logs:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to fetch audit logs'
        );
      }
    }),

  // Get audit log by ID
  getAuditLog: protectedProcedure
    .meta({ roles: ['admin', 'superadmin_owner', 'superadmin_staff'] })
    .input(z.object({
      id: z.string().uuid('Invalid audit log ID'),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const log = await db.query.adminAuditLog.findFirst({
          where: and(
            eq(adminAuditLog.id, input.id),
            // Only show logs for the user's organization unless superadmin
            ctx.user.role !== 'superadmin_owner'
              ? eq(adminAuditLog.organizationId, ctx.user.organizationId)
              : undefined
          ),
          with: {
            user: {
              columns: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            organization: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (!log) {
          throw new Error('Audit log not found');
        }

        return {
          success: true,
          data: log,
        };
      } catch (error) {
        logger.error('Failed to fetch audit log:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to fetch audit log'
        );
      }
    }),
});
