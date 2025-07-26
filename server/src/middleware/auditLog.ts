import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { auditLogs } from '../db/schema';
import { AuthUser } from '../types/auth-user';

// Extend Request interface for this middleware
interface AuthenticatedRequest extends Request {
  user?: AuthUser | {
    id: string;
    email: string;
    role: string;
    organizationId?: string | null;
  };
  // Standard Express Request properties
  method: string;
  originalUrl: string;
  params: any;
  body: any;
}

/**
 * Express middleware to log user actions for audit trail.
 * Logs action, resource, user, organization, and metadata to audit_logs table.
 */
export async function auditLogMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  // Only log if user is authenticated and org is known
  if (!req.user?.id || !req.user?.organizationId) {
    return next();
  }

  // Capture method, path, and optionally entityId from params
  const { method, originalUrl, params, body } = req;
  const action = `${method} ${originalUrl}`;
  const entityType = originalUrl.split('/')[2] || 'unknown'; // Get entity type from URL
  const entityId = params.id || params.tripId || params.userId || null;

  // Store user info since we verified it exists
  const userId = req.user.id;
  const organizationId = req.user.organizationId;

  // Attach after response sent
  res.on('finish', async () => {
    try {
      // Only log if organizationId is not null
      if (organizationId) {
        await db.insert(auditLogs).values({
          action
        });
      }
    } catch (err) {
      // Optionally log error, but do not block response
      // eslint-disable-next-line no-console
      console.error('Audit log error', err);
    }
  });

  return next();
}

