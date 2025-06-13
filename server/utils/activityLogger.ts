import { db } from '../db';
import { userActivityLogs } from '../../shared/schema';

/**
 * Logs a user activity to the database.
 *
 * @param userId - The ID of the user performing the action.
 * @param action - A string describing the action (e.g., 'create_trip').
 * @param organizationId - The ID of the organization, if applicable.
 * @param details - A JSON object containing any relevant details about the action.
 * @param ipAddress - The IP address of the user.
 * @param userAgent - The user agent string of the user's browser.
 */
export const logUserActivity = async (
  userId: string, // Changed to string for UUID
  action: string,
  organizationId?: string, // Changed to string for UUID
  details?: any,
  ipAddress?: string,
  userAgent?: string
) => {
  try {
    await db.insert(userActivityLogs).values({
      user_id: userId,
      action,
      organization_id: organizationId,
      details,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (error) {
    console.error('Failed to log user activity:', error);
  }
};
