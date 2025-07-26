import { getDatabase } from '../db-connection';
import { userActivityLogs } from '../db/schema';

// Helper to get database instance
const getDB = () => {
  const db = getDatabase();
  if (!db) {
    throw new Error('Database connection not available');
  }
  return db;
};

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
    await getDB().insert(userActivityLogs).values({
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

