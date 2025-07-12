import { Router, Request, Response, NextFunction, RequestHandler, RequestHandler as ExpressRequestHandler } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid.js';
import { pgTable, pgSchema, uuid, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core.js';
import { sql, eq, and, or, desc, gte, lte } from 'drizzle-orm';
import { db } from '../db/db.js';
import { users, organizations, customDomains, userActivityLogs, OrganizationRole } from '../db/schema.js';
import { authenticate as validateJWT, requireRole } from '../middleware/secureAuth.js';
import { validateAndSanitizeRequest } from '../middleware/validation.js';
import { auditLogger } from '../auditLogger.js';
import { AuthenticatedRequest, AuthenticatedUser } from '../types/auth.js';

// Type guard for authenticated requests
function isAuthenticatedRequest(req: Request): req is AuthenticatedRequest {
  return !!(req as AuthenticatedRequest).user;
}

// Define USER_ROLES constant if not already defined
const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  ORG_ADMIN: 'org_admin'
} as const;

// Schema for request validation
const whiteLabelRequestIdParam = z.object({
  requestId: z.string().uuid('Invalid request ID format')
});

// Alias for backward compatibility
const whiteLabelRequestIdParamSchema = whiteLabelRequestIdParam;

// Helper type for route handlers that require authentication
type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

// Helper function to ensure user is authenticated and has required role
function requireAuth(handler: AuthenticatedHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!isAuthenticatedRequest(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    return handler(req as AuthenticatedRequest, res, next);
  };
}

// White label request status type
type WhiteLabelRequestStatus = 'pending' | 'approved' | 'rejected.js';

// Custom domain status type
type DomainStatus = 'pending_verification' | 'verified' | 'failed.js';

// Extend the customDomains table type to include domain alias
interface CustomDomainWithAlias {
  id: string;
  organizationId: string;
  domain: string;
  domainName: string;
  status: DomainStatus;
  verificationRecordName?: string;
  verificationRecordValue?: string;
  sslEnabled: boolean;
  sslCertificateArn?: string;
  dnsRecords?: Array<{ type: string; name: string; value: string; ttl?: number }>;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Define white label requests table with proper types
export const whiteLabelRequests = pgTable('white_label_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  requestedBy: uuid('requested_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').$type<WhiteLabelRequestStatus>().notNull().default('pending'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  notes: text('notes'),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// Type for white label request with relations
export type WhiteLabelRequest = typeof whiteLabelRequests.$inferSelect;
export type NewWhiteLabelRequest = typeof whiteLabelRequests.$inferInsert;

// Type for custom role
type CustomRole = OrganizationRole;

// White label request validation schemas
const updateWhiteLabelRequestSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected'] as const),
  notes: z.string().optional()
});

// Validation schemas
const createRoleBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(z.string())
});

const updateRoleBodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional()
});

const domainVerificationSchema = z.object({
  domain: z.string().min(1),
  organizationId: z.string().uuid(),
});

const requestReviewSchema = z.object({
  status: z.enum(['approved', 'rejected'] as const),
  notes: z.string().optional(),
});

// Parameter schemas using UUID
const orgIdParamSchema = z.object({
  orgId: z.string().uuid("Invalid Organization ID")
});

const roleIdParamSchema = z.object({
  roleId: z.string().uuid("Invalid Role ID")
});

const domainIdParamSchema = z.object({
  domainId: z.string().uuid("Invalid Domain ID")
});



// Query schemas
const auditLogQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  organizationId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50)
});

const activityLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

const updateOrgSettingsBodySchema = z.object({
  whiteLabelEnabled: z.boolean().optional(),
  whiteLabelPlan: z.string().optional(),
  subscriptionStatus: z.string().optional(),
  plan: z.string().optional(),
});

const router = Router();

// Apply authentication and role check to all admin routes
router.use(validateJWT);
router.use(requireRole('super_admin'));

// Audit logging function
const logAdminAction = async (
  adminUserId: string, 
  actionType: string,
  targetOrgId?: string, 
  actionData: Record<string, any> = {},
  ipAddress?: string
): Promise<void> => {
  try {
    await auditLogger.logAdminAction(
      adminUserId,
      targetOrgId || '',
      actionType,
      actionData,
      ipAddress
    );
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};

// GET /api/admin/organizations - Get all organizations with white label status
router.get('/organizations', validateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  if (!isAuthenticatedRequest(req)) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user;
  
  try {
    
    const orgs = await db.select({
      id: organizations.id,
      name: organizations.name,
      plan: organizations.plan,
      whiteLabelEnabled: sql<boolean>`${organizations.settings}->'whiteLabel'->>'enabled'`,
      whiteLabelPlan: organizations.plan, 
      subscriptionStatus: organizations.subscriptionStatus,
      created_at: organizations.createdAt,
      updated_at: organizations.updatedAt,
    }).from(organizations);

    await auditLogger.logAdminAction(
      user.id,
      user.organizationId || '',
      'organizations_viewed',
      { count: orgs.length },
      req.ip
    );

    return res.status(200).json({
      success: true,
      data: orgs
    });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return res.status(500).json({ error: "Failed to fetch organizations" });
  }
});

// GET /api/admin/organizations/:id - Get organization details
router.get('/organizations/:orgId', 
  validateJWT, 
  requireRole('admin'),
  validateAndSanitizeRequest({ params: orgIdParamSchema }), 
  async (req: Request, res: Response) => {
    if (!isAuthenticatedRequest(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    
    try {
      const orgId = req.params.orgId; 

      const org = await db.query.organizations.findFirst({
        where: (org, { eq }) => eq(org.id, orgId),
        with: {
          users: true,
          whiteLabelRequest: true,
          customDomain: true
        }
      });

      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      await auditLogger.logAdminAction(
        user.id,
        user.organizationId || orgId,
        'organization_viewed',
        { organizationId: orgId },
        authReq.ip
      );

      return res.status(200).json({
        success: true,
        data: org
      });
    } catch (error) {
      console.error('Error fetching organization:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch organization',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// PUT /api/admin/organizations/:id - Update organization settings
router.put('/organizations/:orgId', 
  validateJWT,
  requireRole('admin'),
  validateAndSanitizeRequest({ 
    params: orgIdParamSchema, 
    body: updateOrgSettingsBodySchema 
  }), 
  async (req: Request, res: Response) => {
    if (!isAuthenticatedRequest(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    
    try {
      const orgId = req.params.orgId; 
      const filteredData = req.body;

      if (Object.keys(filteredData).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      const updateData: Record<string, any> = {
        updatedAt: new Date()
      };
      
      if (filteredData.whiteLabelEnabled !== undefined) {
        updateData.settings = sql`jsonb_set(COALESCE(settings, '{}'::jsonb), '{whiteLabel,enabled}', '${filteredData.whiteLabelEnabled}')`;
      }
      
      if (filteredData.name) updateData.name = filteredData.name;
      if (filteredData.plan) updateData.plan = filteredData.plan;
      if (filteredData.subscriptionStatus) updateData.subscriptionStatus = filteredData.subscriptionStatus;
      
      const [updatedOrg] = await db.update(organizations)
        .set(updateData)
        .where(eq(organizations.id, orgId))
        .returning();

      if (!updatedOrg) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Log the admin action
      try {
        await logAdminAction(
          user.id,
          'organization_updated',
          orgId,
          { 
            updates: Object.keys(filteredData),
            updatedBy: user.id 
          },
          authReq.ip
        );

        return res.status(200).json({
          success: true,
          organization: updatedOrg,
          message: "Organization updated successfully"
        });
      } catch (error) {
        console.error("Error logging organization update:", error);
        // Return the updated org even if logging fails
        return res.status(200).json({
          success: true,
          organization: updatedOrg,
          message: "Organization updated, but failed to log the action"
        });
      }
  } catch (error) {
    console.error("Error updating organization:", error);
    return res.status(500).json({ error: "Failed to update organization" });
  }
});
// PATCH /api/admin/white-label/requests/:requestId - Update white label request status
router.patch(
  '/white-label/requests/:requestId',
  validateJWT,
  requireRole('admin'),
  validateAndSanitizeRequest({
    params: z.object({
      requestId: z.string().uuid('Invalid request ID format')
    }),
    body: updateWhiteLabelRequestSchema
  }),
  async (req: Request, res: Response) => {
    if (!isAuthenticatedRequest(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const authReq = req as AuthenticatedRequest;
    try {
      const user = authReq.user;
      
      const { requestId } = req.params;
      const { status, notes } = req.body as {
        status: WhiteLabelRequestStatus;
        notes?: string;
      };

      // Find the existing request
      const [existingRequest] = await db
        .select()
        .from(whiteLabelRequests)
        .where(eq(whiteLabelRequests.id, requestId));

      if (!existingRequest) {
        return res.status(404).json({ 
          success: false, 
          error: 'White label request not found' 
        });
      }

      // Update the request
      const [updatedRequest] = await db
        .update(whiteLabelRequests)
        .set({
          status,
          notes: notes || null,
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(whiteLabelRequests.id, requestId))
        .returning();

      // Log the admin action
      await logAdminAction(
        req.user.id,
        'update_white_label_request',
        updatedRequest.organizationId,
        {
          requestId: updatedRequest.id,
          status: updatedRequest.status,
          previousStatus: existingRequest.status
        },
        req.ip
      );

      return res.json({
        success: true,
        data: {
          ...updatedRequest,
          organization_id: updatedRequest.organizationId,
          requested_by: updatedRequest.requestedBy,
          reviewed_by: updatedRequest.reviewedBy,
          created_at: updatedRequest.createdAt,
          updated_at: updatedRequest.updatedAt
        }
      });
    } catch (error) {
      console.error('Error updating white label request:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update white label request',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// GET /api/admin/activity-logs - Get activity logs with filtering and pagination
router.get('/activity-logs', validateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  if (!isAuthenticatedRequest(req)) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user;
  
  try {
    const { 
      userId, 
      action, 
      organizationId, 
      startDate, 
      endDate, 
      page = '1', 
      limit = '50' 
    } = req.query as {
      userId?: string;
      action?: string;
      organizationId?: string;
      startDate?: string;
      endDate?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    // Build the base query
    let query = db
      .select({
        id: userActivityLogs.id,
        userId: userActivityLogs.userId,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          organizationId: users.organizationId
        },
        action: userActivityLogs.action,
        details: userActivityLogs.details,
        ip: userActivityLogs.ip,
        userAgent: userActivityLogs.userAgent,
        createdAt: userActivityLogs.createdAt
      })
      .from(userActivityLogs)
      .leftJoin(users, eq(userActivityLogs.userId, users.id))
      .$dynamic();

    // Apply filters
    const conditions = [];
    
    if (userId) {
      conditions.push(eq(userActivityLogs.userId, userId));
    }
    
    if (action) {
      conditions.push(eq(userActivityLogs.action, action));
    }
    
    if (organizationId) {
      conditions.push(eq(users.organizationId, organizationId));
    }
    
    if (startDate) {
      conditions.push(gte(userActivityLogs.createdAt, new Date(startDate)));
    }
    
    if (endDate) {
      // Set end of day for end date
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(lte(userActivityLogs.createdAt, endOfDay));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    // Get total count for pagination
    const total = await db
      .select({ count: sql<number>`count(*)` })
      .from(userActivityLogs)
      .where(and(
        userId ? eq(userActivityLogs.userId, userId) : undefined,
        action ? eq(userActivityLogs.action, action) : undefined,
        startDate ? gte(userActivityLogs.createdAt, new Date(startDate)) : undefined,
        endDate ? lte(userActivityLogs.createdAt, new Date(endDate)) : undefined,
      ))
      .then(rows => rows[0]?.count || 0);

    const logs = await db.query.userActivityLogs.findMany({
      where: (log, { and, eq, gte, lte }) => {
        const conditions = [];
        if (userId) conditions.push(eq(log.userId, userId));
        if (action) conditions.push(eq(log.action, action));
        if (startDate) conditions.push(gte(log.createdAt, new Date(startDate)));
        if (endDate) conditions.push(lte(log.createdAt, new Date(endDate)));
        return and(...conditions);
      },
      orderBy: (log, { desc }) => [desc(log.createdAt)],
      offset: (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10),
      limit: parseInt(limit as string, 10),
    });

    // Log the admin action
    await logAdminAction(
      user.id,
      'VIEW_ACTIVITY_LOGS',
      user.organizationId || user.organization_id,
      { 
        filters: { userId, action, organizationId, startDate, endDate },
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        totalResults: total
      },
      authReq.ip
    );

    return res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string, 10)),
        hasNextPage: parseInt(page as string, 10) < Math.ceil(total / parseInt(limit as string, 10)),
        hasPreviousPage: parseInt(page as string, 10) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch activity logs',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
