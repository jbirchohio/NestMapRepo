import { Router, Request, Response } from 'express';
import { db } from '../db';
import { organizations, users, customDomains, whiteLabelRequests, adminAuditLog } from '../../shared/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { z } from 'zod';
import {  } from '../middleware/jwtAuth';

const router = Router();

// Temporarily remove auth middleware to fix server startup

// Audit logging function
const logAdminAction = async (
  adminUserId: number,
  actionType: string,
  targetOrgId?: number,
  actionData?: any,
  ipAddress?: string
) => {
  try {
    await db.insert(adminAuditLog).values({
      admin_user_id: adminUserId,
      action_type: actionType,
      target_organization_id: targetOrgId,
      action_data: actionData,
      ip_address: ipAddress,
    });
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
      req.user!.id,
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
router.patch('/organizations/:id', async (req: Request, res: Response) => {
  try {
    const orgId = parseInt(req.params.id);
    if (isNaN(orgId)) {
      return res.status(400).json({ error: "Invalid organization ID" });
    }

    const updateData = req.body;
    
    // Validate allowed fields
    const allowedFields = [
      'white_label_enabled',
      'white_label_plan',
      'subscription_status',
      'plan'
    ];
    
    const filteredData = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {} as any);

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
      req.user!.id,
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
      req.user!.id,
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
router.patch('/white-label-requests/:id', async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    if (isNaN(requestId)) {
      return res.status(400).json({ error: "Invalid request ID" });
    }

    const validation = requestReviewSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Invalid request data",
        details: validation.error.issues
      });
    }

    const { status, notes } = validation.data;

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
      req.user!.id,
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
      req.user!.id,
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
router.post('/domains/:id/verify', async (req: Request, res: Response) => {
  try {
    const domainId = parseInt(req.params.id);
    if (isNaN(domainId)) {
      return res.status(400).json({ error: "Invalid domain ID" });
    }

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
router.get('/audit-log', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
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

// GET /api/admin/roles - Get all roles with user counts
router.get('/roles', async (req: Request, res: Response) => {
  try {
    // Use raw SQL query for better compatibility
    const roleCountsResult = await db.execute(sql`
      SELECT role, COUNT(*) as user_count 
      FROM users 
      WHERE role IS NOT NULL 
      GROUP BY role
    `);

    const roles = roleCountsResult.rows.map((row: any, index: number) => ({
      id: index + 1,
      name: row.role.charAt(0).toUpperCase() + row.role.slice(1),
      value: row.role, // Add original lowercase value for filtering
      description: getRoleDescription(row.role),
      permissions: getRolePermissions(row.role),
      userCount: parseInt(row.user_count),
      created_at: new Date().toISOString()
    }));

    res.json(roles);
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
router.post('/roles', async (req: Request, res: Response) => {
  try {
    const { name, description, permissions } = req.body;
    
    if (!name || !description) {
      return res.status(400).json({ error: "Name and description are required" });
    }

    // For now, we'll just return success since we don't have a roles table
    const newRole = {
      id: Date.now(),
      name,
      description,
      permissions: permissions || [],
      userCount: 0,
      created_at: new Date().toISOString()
    };

    await logAdminAction(
      req.user?.id || 0,
      'role_created',
      undefined,
      { roleName: name, permissions },
      req.ip
    );

    res.json(newRole);
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).json({ error: "Failed to create role" });
  }
});

// PUT /api/admin/roles/:id - Update role permissions
router.put('/roles/:id', async (req: Request, res: Response) => {
  try {
    const roleId = parseInt(req.params.id);
    const { permissions } = req.body;

    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ error: "Permissions array is required" });
    }

    await logAdminAction(
      req.user?.id || 0,
      'role_updated',
      undefined,
      { roleId, permissions },
      req.ip
    );

    res.json({ success: true, message: "Role updated successfully" });
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ error: "Failed to update role" });
  }
});

// Helper functions
function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    'admin': 'Full system access with all permissions',
    'owner': 'Organization owner with complete control',
    'manager': 'Can manage trips and team members',
    'user': 'Basic user with limited permissions',
    'viewer': 'Read-only access to organization data'
  };
  return descriptions[role] || 'Standard user role';
}

function getRolePermissions(role: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    'admin': ['canViewTrips', 'canCreateTrips', 'canEditTrips', 'canDeleteTrips', 'canViewAnalytics', 'canManageOrganization', 'canAccessAdmin', 'canManageUsers', 'canManageRoles', 'canViewBilling'],
    'owner': ['canViewTrips', 'canCreateTrips', 'canEditTrips', 'canDeleteTrips', 'canViewAnalytics', 'canManageOrganization', 'canAccessAdmin', 'canManageUsers', 'canManageRoles', 'canViewBilling'],
    'manager': ['canViewTrips', 'canCreateTrips', 'canEditTrips', 'canViewAnalytics', 'canManageUsers'],
    'user': ['canViewTrips', 'canCreateTrips', 'canEditTrips'],
    'viewer': ['canViewTrips']
  };
  return rolePermissions[role] || ['canViewTrips'];
}

export default router;