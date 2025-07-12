import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { organizations, users, customDomains, whiteLabelRequests, organizationRoles, insertOrganizationRoleSchema } from '../../shared/src/schema.js';
import { auditLogs } from '../db/auditLog.js';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { z } from 'zod';
import { authenticate as validateJWT } from '../middleware/secureAuth.js';
import { validateAndSanitizeRequest } from '../middleware/validation.js';

// Placeholder for admin role check middleware - this would need to be implemented
const requireRole = (role: string) => (req: Request, res: Response, next: Function) => {
  // Implementation would check user's role
  next();
};

const router = Router();

// Apply authentication and role check to all admin routes
router.use(validateJWT);
router.use(requireRole('admin'));

// Audit logging function
const logAdminAction = async (
  adminUserId: string,
  actionType: string,
  targetOrgId?: string,
  actionData?: any,
  ipAddress?: string
) => {
  try {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: adminUserId,
      action: actionType,
      entityType: 'admin_action',
      entityId: targetOrgId || null,
      metadata: actionData ? JSON.stringify(actionData) : null,
      ipAddress: ipAddress || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};

// Validation schemas
const domainVerificationSchema = z.object({
  domain: z.string().min(1),
  organizationId: z.string().uuid(),
});

const orgIdParamSchema = z.object({
  id: z.string().uuid(),
});

const userIdParamSchema = z.object({
  id: z.string().uuid(),
});

const requestIdParamSchema = z.object({
  id: z.string().uuid(),
});

const domainIdParamSchema = z.object({
  id: z.string().uuid(),
});

const roleIdParamSchema = z.object({
  id: z.string().uuid(),
});

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

const activityLogQuerySchema = paginationQuerySchema.extend({
  action: z.string().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const updateOrgSettingsBodySchema = z.object({
  whiteLabelEnabled: z.boolean().optional(),
  whiteLabelPlan: z.string().optional(),
  subscriptionStatus: z.enum([
    'active', 
    'trialing', 
    'past_due', 
    'canceled', 
    'unpaid', 
    'incomplete', 
    'incomplete_expired',
    null
  ]).optional(),
  plan: z.enum(['free', 'pro', 'enterprise']).optional(),
}).strict();

const requestReviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: z.string().optional(),
});

const createRoleBodySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1),
});

const updateRoleBodySchema = createRoleBodySchema.partial();

// GET /api/admin/organizations - Get all organizations with white label status
router.get('/organizations', async (req: Request, res: Response) => {
  try {
    const orgs = await db.select({
      id: organizations.id,
      name: organizations.name,
      plan: organizations.plan,
      whiteLabelEnabled: organizations.whiteLabelEnabled,
      whiteLabelPlan: organizations.whiteLabelPlan,
      subscriptionStatus: organizations.subscriptionStatus,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt,
    }).from(organizations);

    await logAdminAction(
      req.user!.userId,
      'organizations_viewed',
      undefined,
      { count: orgs.length },
      req.ip
    );

    res.json(orgs);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    res.status(500).json({ error: "Failed to fetch organizations" });
  }
});

// PATCH /api/admin/organizations/:id - Update organization settings
router.patch(
  '/organizations/:id', 
  validateAndSanitizeRequest({ 
    params: orgIdParamSchema, 
    body: updateOrgSettingsBodySchema 
  }), 
  async (req: Request, res: Response) => {
    try {
      const orgId = req.params.id;
      const updateData = req.body;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      const [updatedOrg] = await db
        .update(organizations)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, orgId))
        .returning();

      if (!updatedOrg) {
        return res.status(404).json({ error: "Organization not found" });
      }

      await logAdminAction(
        req.user!.userId,
        'organization_updated',
        orgId,
        updateData,
        req.ip
      );

      res.json(updatedOrg);
    } catch (error) {
      console.error("Error updating organization:", error);
      res.status(500).json({ error: "Failed to update organization" });
    }
  }
);

// GET /api/admin/organizations/:id/activity-logs
router.get(
  '/organizations/:id/activity-logs',
  validateAndSanitizeRequest({
    params: orgIdParamSchema,
    query: activityLogQuerySchema
  }),
  async (req: Request, res: Response) => {
    try {
      const { id: orgId } = req.params;
      const { page = 1, limit = 50, ...filters } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const whereClause = and(
        eq(auditLogs.entityType, 'organization'),
        eq(auditLogs.entityId, orgId),
        filters.action ? sql`${auditLogs.action} = ${filters.action}` : undefined,
        filters.userId ? eq(auditLogs.userId, filters.userId as string) : undefined,
        filters.startDate ? sql`${auditLogs.createdAt} >= ${new Date(filters.startDate as string)}` : undefined,
        filters.endDate ? sql`${auditLogs.createdAt} <= ${new Date(filters.endDate as string)}` : undefined
      );

      const [logs, total] = await Promise.all([
        db
          .select()
          .from(auditLogs)
          .where(whereClause)
          .orderBy(desc(auditLogs.createdAt))
          .limit(Number(limit))
          .offset(offset),
        db
          .select({ count: count() })
          .from(auditLogs)
          .where(whereClause)
          .then(rows => Number(rows[0]?.count || 0))
      ]);

      res.json({
        data: logs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  }
);

// Add other routes with similar corrections...

export { router as adminRouter };
