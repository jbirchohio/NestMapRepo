import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { auditLogs } from '../db/auditLog';

/**
 * Express middleware to log user actions for audit trail.
 * Logs action, resource, user, organization, and metadata to audit_logs table.
 */
export async function auditLogMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only log if user is authenticated and org is known
  if (!req.user || !req.user.id || !req.user.organizationId) {
    return next();
  }

  // Capture method, path, and optionally resourceId from params
  const { method, originalUrl, params, body } = req;
  const action = `${method} ${originalUrl}`;
  const resource = originalUrl.split('/')[1] || 'unknown';
  const resourceId = params.id || params.tripId || params.userId || null;

  // Attach after response sent
  res.on('finish', async () => {
    try {
      await db.insert(auditLogs).values([{
        organizationId: req.user.organizationId,
        userId: req.user.id,
        action,
        resource,
        resourceId,
        metadata: { body, statusCode: res.statusCode }
      }]);
    } catch (err) {
      // Optionally log error, but do not block response
      // eslint-disable-next-line no-console
      console.error('Audit log error', err);
    }
  });

  next();
}
