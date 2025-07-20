import { db } from '../db/db';
import { userActivityLogs } from '../db/schema';

/**
 * Logs a user activity to the database.
 *
 * @param userId - The ID of the user performing the action.
 * @param organizationId - The ID of the organization the action belongs to.
 * @param action - A string describing the action (e.g., 'create_trip').
 * @param details - A JSON object containing any relevant details about the action.
 * @param ipAddress - The IP address of the user.
 * @param userAgent - The user agent string of the user's browser.
 */
export const logUserActivity = async (
  userId: string,
  organizationId: string,
  action: string,
  details: Record<string, any> = {},
  ipAddress?: string,
  userAgent?: string
) => {
  try {
    await db.insert(userActivityLogs).values({
      userId,
      organizationId,
      action,
      details,
      ip: ipAddress || null,
      userAgent: userAgent || null,
    });
  } catch (error) {
    console.error('Failed to log user activity:', error);
  }
};
