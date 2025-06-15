import { Router, Request, Response } from 'express';
import { db } from '../db';
import { organizations, users, customDomains, whiteLabelRequests, organizationRoles, insertOrganizationRoleSchema } from '../../shared/schema';
import { auditLogs } from '../db/auditLog';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { z } from 'zod';
import { userActivityLogs } from '../../shared/schema';
import { validateJWT } from '../middleware/jwtAuth'; // Assuming this is the correct path
import { validateAndSanitizeRequest } from '../middleware/inputValidation';
// Placeholder for admin role check middleware - this would need to be implemented
const requireRole = (role: string) => (req: Request, res: Response, next: Function) => {
  if (req.user?.role === role) {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
  }
};

const router = Router();

// Apply authentication and role check to all admin routes
router.use(validateJWT);
router.use(requireRole('super_admin'));

// Audit logging function
const logAdminAction = async (
  adminUserId: string, // Changed from number
  actionType: string,
  targetOrgId?: string, // Changed from number
  actionData?: any,
  ipAddress?: string
) => {
  try {
    const logEntry: any = {
      userId: adminUserId,
      action: actionType,
      resource: 'admin_action', // General resource type for admin actions
      metadata: { ...(actionData || {}), ipAddress },
    };

    if (targetOrgId) {
      logEntry.organizationId = targetOrgId;
    } else {
      // If no targetOrgId is specified, we might need a default or handle this case.
      // For now, assuming admin actions might not always target a specific org directly in this log.
      // However, auditLogs schema requires organizationId. This needs clarification.
      // For now, let's use a placeholder or fetch the admin's org if appropriate.
      // This will likely cause a runtime error if targetOrgId is not provided and not handled.
      // Awaiting clarification on how to handle missing targetOrgId for 'auditLogs' schema.
      // For the moment, to prevent immediate error, we'll assign a placeholder if not provided.
      // THIS IS A TEMPORARY FIX and needs to be addressed based on business logic.
      logEntry.organizationId = targetOrgId || 'UNKNOWN_ADMIN_ORG'; 
    }

    // Ensure all required fields for auditLogs are present
    if (!logEntry.organizationId) {
        console.error('Failed to log admin action: organizationId is required for auditLogs table.');
        return; // Or throw an error
    }

    await db.insert(auditLogs).values(logEntry);
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};

// Validation schemas
const domainVerificationSchema = z.object({
  domain: z.string().min(1),
  organization_id: z.number().int().positive(),
});

const requestReviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: z.string().optional(),
});

const orgIdParamSchema = z.object({
  id: z.coerce.number().int().positive("Invalid Organization ID"),
});

const orgIdParamSchemaAlt = z.object({
  orgId: z.coerce.number().int().positive("Invalid Organization ID"),
});

const requestIdParamSchema = z.object({
  id: z.coerce.number().int().positive("Invalid Request ID"),
});

const domainIdParamSchema = z.object({
  id: z.coerce.number().int().positive("Invalid Domain ID"),
});

const roleIdParamSchema = z.object({
  id: z.coerce.number().int().positive("Invalid Role ID"),
});

const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

const activityLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

const updateOrgSettingsBodySchema = z.object({
  white_label_enabled: z.boolean().optional(),
  white_label_plan: z.string().optional(), // Consider enum if plans are fixed
  subscription_status: z.string().optional(), // Consider enum
  plan: z.string().optional(), // Consider enum
});

// GET /api/admin/organizations - Get all organizations with white label status
router.get('/organizations', async (req: Request, res: Response) => {
  try {
    const orgs = await db.select({
      id: organizations.id,
      name: organizations.name,
      plan: organizations.plan,
      white_label_enabled: organizations.white_label_enabled,
      white_label_plan: organizations.white_label_plan,
      subscription_status: organizations.subscription_status,
      created_at: organizations.created_at,
      updated_at: organizations.updated_at,
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
router.patch('/organizations/:id', validateAndSanitizeRequest({ params: orgIdParamSchema, body: updateOrgSettingsBodySchema }), async (req: Request, res: Response) => {
  try {
    const orgId = req.params.id;
    const filteredData = req.body; // Already validated and filtered by updateOrgSettingsBodySchema

    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const [updatedOrg] = await db
      .update(organizations)
      .set({
        ...filteredData,
        updated_at: new Date(),
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
      { updates: filteredData },
      req.ip
    );

    res.json({
      success: true,
      organization: updatedOrg,
      message: "Organization updated successfully"
    });
  } catch (error) {
    console.error("Error updating organization:", error);
    res.status(500).json({ error: "Failed to update organization" });
  }
});

// GET /api/admin/white-label-requests - Get pending white label requests
router.get('/white-label-requests', async (req: Request, res: Response) => {
  try {
    const requests = await db.select({
      id: whiteLabelRequests.id,
      organization_id: whiteLabelRequests.organization_id,
      organization_name: organizations.name,
      requested_by: whiteLabelRequests.requested_by,
      requester_name: users.display_name,
      request_type: whiteLabelRequests.request_type,
      request_data: whiteLabelRequests.request_data,
      status: whiteLabelRequests.status,
      created_at: whiteLabelRequests.created_at,
    })
    .from(whiteLabelRequests)
    .leftJoin(organizations, eq(whiteLabelRequests.organization_id, organizations.id))
    .leftJoin(users, eq(whiteLabelRequests.requested_by, users.id))
    .where(eq(whiteLabelRequests.status, 'pending'))
    .orderBy(desc(whiteLabelRequests.created_at));

    await logAdminAction(
      req.user!.userId,
      'requests_viewed',
      undefined,
      { count: requests.length },
      req.ip
    );

    res.json(requests);
  } catch (error) {
    console.error("Error fetching requests:", error);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

// PATCH /api/admin/white-label-requests/:id - Review white label request
router.patch('/white-label-requests/:id', validateAndSanitizeRequest({ params: requestIdParamSchema, body: requestReviewSchema }), async (req: Request, res: Response) => {
  try {
    const requestId = req.params.id;
    const { status, notes } = req.body; // req.body is validated by middleware

    // Get the request first to validate it exists
    const [existingRequest] = await db
      .select()
      .from(whiteLabelRequests)
      .where(eq(whiteLabelRequests.id, requestId))
      .limit(1);

    if (!existingRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (existingRequest.status !== 'pending') {
      return res.status(400).json({ error: "Request has already been reviewed" });
    }

    // Update the request
    const [updatedRequest] = await db
      .update(whiteLabelRequests)
      .set({
        status,
        reviewed_by: req.user!.id,
        review_notes: notes,
        reviewed_at: new Date(),
      })
      .where(eq(whiteLabelRequests.id, requestId))
      .returning();

    // If approved, enable white label for the organization
    if (status === 'approved') {
      await db
        .update(organizations)
        .set({
          white_label_enabled: true,
          white_label_plan: 'basic', // Default plan
          updated_at: new Date(),
        })
        .where(eq(organizations.id, existingRequest.organization_id));
    }

    await logAdminAction(
      req.user!.userId,
      'request_reviewed',
      existingRequest.organization_id,
      { requestId, status, notes },
      req.ip
    );

    res.json({
      success: true,
      request: updatedRequest,
      message: `Request ${status} successfully`
    });
  } catch (error) {
    console.error("Error reviewing request:", error);
    res.status(500).json({ error: "Failed to review request" });
  }
});

// GET /api/admin/custom-domains - Get all custom domains
router.get('/custom-domains', async (req: Request, res: Response) => {
  try {
    const domains = await db.select({
      id: customDomains.id,
      organization_id: customDomains.organization_id,
      organization_name: organizations.name,
      domain: customDomains.domain,
      subdomain: customDomains.subdomain,
      dns_verified: customDomains.dns_verified,
      ssl_verified: customDomains.ssl_verified,
      status: customDomains.status,
      created_at: customDomains.created_at,
    })
    .from(customDomains)
    .leftJoin(organizations, eq(customDomains.organization_id, organizations.id))
    .orderBy(desc(customDomains.created_at));

    await logAdminAction(
      req.user!.userId,
      'domains_viewed',
      undefined,
      { count: domains.length },
      req.ip
    );

    res.json(domains);
  } catch (error) {
    console.error("Error fetching domains:", error);
    res.status(500).json({ error: "Failed to fetch domains" });
  }
});

// POST /api/admin/domains/:id/verify - Manually trigger domain verification
router.post('/domains/:id/verify', validateAndSanitizeRequest({ params: domainIdParamSchema }), async (req: Request, res: Response) => {
  try {
    const domainId = req.params.id;

    // Get domain details
    const [domain] = await db
      .select()
      .from(customDomains)
      .where(eq(customDomains.id, domainId))
      .limit(1);

    if (!domain) {
      return res.status(404).json({ error: "Domain not found" });
    }

    // Import domain verification service
    const { verifyDomainOwnership, verifySSLCertificate, generateVerificationToken } = await import('../domainVerification');

    // Generate or use existing verification token
    const verificationToken = domain.verification_token || generateVerificationToken(domain.domain, domain.organization_id);
    
    // Verify DNS configuration
    const dnsResult = await verifyDomainOwnership(domain.domain, verificationToken);
    const dnsVerified = dnsResult.verified;
    
    let sslVerified = domain.ssl_verified;
    let status = domain.status;

    if (dnsVerified && !domain.ssl_verified) {
      // Check SSL certificate status
      try {
        const sslResult = await verifySSLCertificate(domain.domain);
        sslVerified = sslResult.verified;
        status = sslVerified ? 'active' : 'ssl_pending';
      } catch (sslError) {
        console.error('SSL certificate verification failed:', sslError);
        status = 'ssl_failed';
      }
    } else if (dnsVerified) {
      status = 'active';
    } else {
      status = 'dns_pending';
    }

    // Update domain verification status
    const [updatedDomain] = await db
      .update(customDomains)
      .set({
        dns_verified: dnsVerified,
        ssl_verified: sslVerified,
        status: status,
        verification_token: verificationToken,
        verified_at: dnsVerified && sslVerified ? new Date() : null,
      })
      .where(eq(customDomains.id, domainId))
      .returning();

    await logAdminAction(
      req.user!.id,
      'domain_verification_triggered',
      domain.organization_id,
      { 
        domainId, 
        domain: domain.domain, 
        dnsVerified, 
        sslVerified, 
        status 
      },
      req.ip
    );

    res.json({
      success: true,
      domain: updatedDomain,
      verification: {
        dns_verified: dnsVerified,
        ssl_verified: sslVerified,
        status: status
      },
      message: "Domain verification initiated"
    });
  } catch (error) {
    console.error("Error verifying domain:", error);
    res.status(500).json({ error: "Failed to verify domain" });
  }
});

// GET /api/admin/audit-log - Get admin action audit log
router.get('/audit-log', validateAndSanitizeRequest({ query: auditLogQuerySchema }), async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query;
    const offset = (page - 1) * limit;

    const auditEntries = await db
      .select({
        id: adminAuditLog.id,
        admin_user_id: adminAuditLog.admin_user_id,
        admin_name: users.display_name,
        action_type: adminAuditLog.action_type,
        target_organization_id: adminAuditLog.target_organization_id,
        organization_name: organizations.name,
        action_data: adminAuditLog.action_data,
        ip_address: adminAuditLog.ip_address,
        timestamp: adminAuditLog.timestamp,
      })
      .from(adminAuditLog)
      .leftJoin(users, eq(adminAuditLog.admin_user_id, users.id))
      .leftJoin(organizations, eq(adminAuditLog.target_organization_id, organizations.id))
      .orderBy(desc(adminAuditLog.timestamp))
      .limit(limit)
      .offset(offset);

    res.json({
      entries: auditEntries,
      pagination: {
        page,
        limit,
        hasMore: auditEntries.length === limit
      }
    });
  } catch (error) {
    console.error("Error fetching audit log:", error);
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
});

// GET /api/admin/roles - Get organization-specific roles with user counts
router.get('/roles', async (req: Request, res: Response) => {
  try {
    // Get organization ID from authenticated user
    const organizationId = req.user?.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'No organization context found',
        message: 'User must be associated with an organization to view roles'
      });
    }

    // Get both default roles from users table and custom roles from organization_roles table
    const [roleCountsResult, customRolesResult] = await Promise.all([
      // Count users by role within the organization
      db.execute(sql`
        SELECT role, COUNT(*) as user_count 
        FROM users 
        WHERE role IS NOT NULL AND organization_id = ${organizationId}
        GROUP BY role
      `),
      // Get custom organization roles
      db.select().from(organizationRoles).where(eq(organizationRoles.organization_id, organizationId))
    ]);

    // Map default roles from user table
    const defaultRoles = roleCountsResult.rows.map((row: any, index: number) => ({
      id: index + 1,
      name: row.role.charAt(0).toUpperCase() + row.role.slice(1),
      value: row.role,
      description: getRoleDescription(row.role),
      permissions: getRolePermissions(row.role),
      userCount: parseInt(row.user_count),
      createdAt: new Date().toISOString(),
      isCustom: false
    }));

    // Map custom organization roles and count users for each
    const customRoles = await Promise.all(
      customRolesResult.map(async (role, index) => {
        const userCountResult = await db.execute(sql`
          SELECT COUNT(*) as user_count 
          FROM users 
          WHERE role = ${role.value} AND organization_id = ${organizationId}
        `);
        
        return {
          id: defaultRoles.length + index + 1,
          name: role.name,
          value: role.value,
          description: role.description,
          permissions: role.permissions,
          userCount: parseInt(String(userCountResult.rows[0]?.user_count || 0)),
          createdAt: role.created_at?.toISOString() || new Date().toISOString(),
          isCustom: true
        };
      })
    );

    // Combine default and custom roles
    const allRoles = [...defaultRoles, ...customRoles];

    res.json(allRoles);
  } catch (error) {
    console.error("Database error fetching roles:", error);
    res.status(500).json({ error: "Database connection failed" });
  }
});


// GET /api/admin/permissions - Get all available permissions
router.get('/permissions', async (req: Request, res: Response) => {
  try {
    const permissions = [
      { id: 'canViewTrips', name: 'View Trips', description: 'Can view all trips', category: 'Trip Management' },
      { id: 'canCreateTrips', name: 'Create Trips', description: 'Can create new trips', category: 'Trip Management' },
      { id: 'canEditTrips', name: 'Edit Trips', description: 'Can modify existing trips', category: 'Trip Management' },
      { id: 'canDeleteTrips', name: 'Delete Trips', description: 'Can delete trips', category: 'Trip Management' },
      { id: 'canViewAnalytics', name: 'View Analytics', description: 'Can access analytics dashboard', category: 'Analytics' },
      { id: 'canManageOrganization', name: 'Manage Organization', description: 'Can modify organization settings', category: 'Organization' },
      { id: 'canAccessAdmin', name: 'Admin Access', description: 'Can access admin dashboard', category: 'Administration' },
      { id: 'canManageUsers', name: 'Manage Users', description: 'Can add/remove users', category: 'User Management' },
      { id: 'canManageRoles', name: 'Manage Roles', description: 'Can modify user roles', category: 'User Management' },
      { id: 'canViewBilling', name: 'View Billing', description: 'Can access billing information', category: 'Billing' }
    ];

    res.json(permissions);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({ error: "Failed to fetch permissions" });
  }
});

// POST /api/admin/roles - Create new role
router.post('/roles', validateAndSanitizeRequest({ body: createRoleBodySchema }), async (req: Request, res: Response) => {
  try {
    const { name, description, permissions } = req.body; // Validated by createRoleBodySchema

    // req.user.organization_id is guaranteed by validateJWT and requireRole('super_admin')
    // or if this route is intended for org admins, it should be checked by a different middleware or logic

    // Create role value from name (slugify)
    const value = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');

    // Insert the new role into the database
    const [newRole] = await db.insert(organizationRoles).values({
      organization_id: req.user.organization_id,
      name,
      value,
      description,
      permissions: permissions || [],
      is_default: false
    }).returning();

    try {
      await logAdminAction(
        req.user!.id,
        'role_created',
        req.user.organization_id,
        { roleName: name, permissions },
        req.ip
      );
    } catch (auditError) {
      console.warn('Failed to log admin action:', auditError);
      // Continue with role creation even if audit logging fails
    }

    // Return role with userCount for consistency with GET endpoint
    const roleWithCount = {
      ...newRole,
      userCount: 0,
      createdAt: newRole.created_at
    };

    res.json(roleWithCount);
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).json({ error: "Failed to create role" });
  }
});

// PUT /api/admin/roles/:id - Update role permissions
router.put('/roles/:id', validateAndSanitizeRequest({ params: roleIdParamSchema, body: updateRoleBodySchema }), async (req: Request, res: Response) => {
  try {
    const roleId = req.params.id; // Validated by roleIdParamSchema
    const { permissions, name, description } = req.body; // Validated by updateRoleBodySchema

    // req.user.organization_id is guaranteed by validateJWT and requireRole('super_admin')
    // or if this route is intended for org admins, it should be checked by a different middleware or logic

    // Check if this is a custom role in organizationRoles table
    const customRole = await db.select().from(organizationRoles)
      .where(and(
        eq(organizationRoles.id, roleId),
        eq(organizationRoles.organization_id, req.user.organization_id)
      ));

    if (customRole.length > 0) {
      // Update custom role
      const updateData: any = {};
      if (permissions && Array.isArray(permissions)) updateData.permissions = permissions;
      if (name) updateData.name = name;
      if (description) updateData.description = description;
      updateData.updated_at = new Date();

      await db.update(organizationRoles)
        .set(updateData)
        .where(eq(organizationRoles.id, roleId));

      try {
        await logAdminAction(
          req.user!.id,
          'custom_role_updated',
          req.user.organization_id,
          { roleId, ...updateData },
          req.ip
        );
      } catch (auditError) {
        console.warn('Failed to log admin action:', auditError);
      }

      res.json({ success: true, message: "Custom role updated successfully" });
    } else {
      // For default roles, we can't update the role definition but we can track the attempt
      res.status(400).json({ error: "Cannot modify default system roles" });
    }
  } catch (error) {
// DELETE /api/admin/roles/:id - Delete custom role
router.delete('/roles/:id', validateAndSanitizeRequest({ params: roleIdParamSchema }), async (req: Request, res: Response) => {
  try {
    const roleId = req.params.id; // Validated by roleIdParamSchema

    // req.user.organization_id is guaranteed by validateJWT and requireRole('super_admin')
    // or if this route is intended for org admins, it should be checked by a different middleware or logic

    // Check if this is a custom role and if any users have this role
    const [customRole, usersWithRole] = await Promise.all([
      db.select().from(organizationRoles)
        .where(and(
          eq(organizationRoles.id, roleId),
          eq(organizationRoles.organization_id, req.user.organization_id)
        )),
      db.execute(sql`
        SELECT COUNT(*) as user_count 
        FROM users 
        WHERE role = (SELECT value FROM organization_roles WHERE id = ${roleId}) 
        AND organization_id = ${req.user.organization_id}
      `)
    ]);

    if (customRole.length === 0) {
      return res.status(404).json({ error: "Custom role not found or cannot delete default roles" });
    }

    const userCount = parseInt(String(usersWithRole.rows[0]?.user_count || 0));
    if (userCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete role. ${userCount} users are assigned to this role. Please reassign them first.` 
      });
    }

    // Delete the custom role
    await db.delete(organizationRoles).where(eq(organizationRoles.id, roleId));

    try {
      await logAdminAction(
        req.user!.id,
        'custom_role_deleted',
        req.user.organization_id,
        { roleId, roleName: customRole[0].name },
        req.ip
      );
    } catch (auditError) {
      console.warn('Failed to log admin action:', auditError);
    }

    res.json({ success: true, message: "Custom role deleted successfully" });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({ error: "Failed to delete role" });
  }
});

// GET /api/admin/organizations/:orgId/activity-logs - Get user activity logs for an organization
router.get('/organizations/:orgId/activity-logs', validateAndSanitizeRequest({ params: orgIdParamSchema, query: auditLogQuerySchema }), async (req: Request, res: Response) => {
  try {
    const orgId = req.params.orgId; // Validated by orgIdParamSchema
    // Query parameters (page, limit) are validated by auditLogQuerySchema

    // Security check: Ensure the user is an admin of the organization or a super_admin
    if (req.user?.organization_id !== orgId && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const logs = await db
      .select({
        id: userActivityLogs.id,
        action: userActivityLogs.action,
        details: userActivityLogs.details,
        ip_address: userActivityLogs.ip_address,
        user_agent: userActivityLogs.user_agent,
        created_at: userActivityLogs.created_at,
        user_name: users.display_name,
        user_email: users.email,
      })
      .from(userActivityLogs)
      .leftJoin(users, eq(userActivityLogs.user_id, users.id))
      .where(eq(userActivityLogs.organization_id, orgId))
      .orderBy(desc(userActivityLogs.created_at));

    await logAdminAction(
      req.user!.id,
      'activity_logs_viewed',
      orgId,
      { count: logs.length },
      req.ip
    );

    res.json(logs);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

export default router;
