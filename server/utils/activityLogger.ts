import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Logs a user activity to the database using the AuditLog model.
 *
 * @param userId - The ID of the user performing the action.
 * @param organizationId - The ID of the organization the action belongs to.
 * @param action - A string describing the action (e.g., 'create_trip').
 * @param details - A JSON object containing any relevant details about the action.
 * @param ipAddress - The IP address of the user.
 * @param userAgent - The user agent string of the user's browser.
 * @param entityType - The type of entity being acted upon (e.g., 'trip', 'user').
 * @param entityId - The ID of the entity being acted upon.
 */
export const logUserActivity = async (
  userId: string,
  organizationId: string,
  action: string,
  details: Record<string, any> = {},
  ipAddress?: string,
  userAgent?: string,
  entityType?: string,
  entityId?: string
) => {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        entityType: entityType || 'system',
        entityId: entityId || null,
        newData: details,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: {}
      }
    });
  } catch (error) {
    console.error('Failed to log user activity:', error);
    // Consider using a proper logging service in production
  }
};
