import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { insertOrganizationSchema } from '@shared/schema';
import { authenticate as validateJWT } from '../middleware/secureAuth.js';
import { requireOrgPermission } from '../middleware/organizationRoleMiddleware';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext';
import { validateAndSanitizeRequest } from '../middleware/inputValidation';
import { storage } from '../storage';
import { getOrganizationAnalytics } from '../analytics';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Apply authentication to all organization routes
router.use(validateJWT);

// Zod Schemas for validation
const orgIdParamSchema = z.object({
  id: z.coerce.number().int().positive("Invalid Organization ID"),
});

const orgAndUserIdParamsSchema = z.object({
  id: z.coerce.number().int().positive("Invalid Organization ID"),
  userId: z.coerce.number().int().positive("Invalid User ID"),
});

const inviteMemberBodySchema = z.object({
  email: z.string().email("Invalid email format"),
  org_role: z.string().optional(), // Consider using an enum if roles are predefined
});

const updateMemberBodySchema = z.object({
  org_role: z.string().optional(), // Consider enum
  permissions: z.array(z.string()).optional(), // Consider more specific permission types
});

// Add users endpoint for card issuance dropdown (matches frontend API call) - MUST be before /:id route
router.get('/users', async (req: Request, res: Response) => {
  try {
    // Dynamically resolve organization ID from authenticated user
    let targetOrgId: number | null = null;
    
    // Use authenticated user's organization ID
    if (req.user?.organizationId) {
      targetOrgId = req.user.organizationId;
    } else if (req.user?.userId) {
      // Fallback: get organization from database
      const [userWithOrg] = await db
        .select({ organization_id: users.organization_id })
        .from(users)
        .where(eq(users.id, req.user.userId))
        .limit(1);
      
      if (userWithOrg?.organization_id) {
        targetOrgId = userWithOrg.organization_id;
      }
    }
    
    // If no organization found, return error
    if (!targetOrgId) {
      return res.status(400).json({ 
        error: 'No organization context found',
        message: 'User must be associated with an organization to access this endpoint'
      });
    }

    const organizationUsers = await db
      .select({
        id: users.id,
        display_name: users.display_name,
        email: users.email,
        role: users.role,
        organization_id: users.organization_id,
        username: users.username
      })
      .from(users)
      .where(eq(users.organization_id, targetOrgId))
      .orderBy(users.display_name);

    console.log(`Found ${organizationUsers.length} users for organization ${targetOrgId}`);
    res.json(organizationUsers);
  } catch (error) {
    console.error('Error fetching organization users:', error);
    res.status(500).json({ message: "Failed to fetch organization users" });
  }
});

// Get organization details
router.get("/:id", validateAndSanitizeRequest({ params: orgIdParamSchema }), async (req: Request, res: Response) => {
  try {
    const orgId = req.params.id;

    // Verify user can access this organization
    const userOrgId = req.user?.organizationId;
    if (req.user?.role !== 'super_admin' && userOrgId !== orgId) {
      return res.status(403).json({ message: "Access denied: Cannot access this organization" });
    }

    const organization = await storage.getOrganization(orgId);
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    res.json(organization);
  } catch (error) {
    console.error("Error fetching organization:", error);
    res.status(500).json({ message: "Could not fetch organization details" });
  }
});

// Update organization (admin only)
router.put("/:id", requireOrgPermission('manage_organization'), validateAndSanitizeRequest({ params: orgIdParamSchema, body: insertOrganizationSchema.partial() }), async (req: Request, res: Response) => {
  try {
    const orgId = req.params.id;
    const updateData = req.body;

    // Verify user can modify this organization
    const userOrgId = req.user?.organizationId;
    if (req.user?.role !== 'super_admin' && userOrgId !== orgId) {
      return res.status(403).json({ message: "Access denied: Cannot modify this organization" });
    }

    const updatedOrganization = await storage.updateOrganization(orgId, updateData);

    if (!updatedOrganization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    res.json(updatedOrganization);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid organization data", errors: error.errors });
    }
    console.error("Error updating organization:", error);
    res.status(500).json({ message: "Could not update organization" });
  }
});

// Get organization members
router.get("/:id/members", requireOrgPermission('view_members'), validateAndSanitizeRequest({ params: orgIdParamSchema }), async (req: Request, res: Response) => {
  try {
    const orgId = req.params.id;

    // Verify user can access this organization
    const userOrgId = req.user?.organizationId;
    if (req.user?.role !== 'super_admin' && userOrgId !== orgId) {
      return res.status(403).json({ message: "Access denied: Cannot access this organization's members" });
    }

    const members = await storage.getOrganizationMembers(orgId);
    res.json(members);
  } catch (error) {
    console.error("Error fetching organization members:", error);
    res.status(500).json({ message: "Could not fetch organization members" });
  }
});

// Invite member to organization
router.post("/:id/invite", requireOrgPermission('invite_members'), validateAndSanitizeRequest({ params: orgIdParamSchema, body: inviteMemberBodySchema }), async (req: Request, res: Response) => {
  try {
    const orgId = req.params.id;
    const { email, org_role = 'member' } = req.body;

    // Verify user can invite to this organization
    const userOrgId = req.user?.organizationId;
    if (req.user?.role !== 'super_admin' && userOrgId !== orgId) {
      return res.status(403).json({ message: "Access denied: Cannot invite members to this organization" });
    }

    // Create invitation
    const invitation = await storage.createInvitation({
      email,
      organizationId: orgId,
      invitedBy: req.user!.userId,
      role: org_role,
      token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    res.status(201).json({ message: "Invitation sent successfully", invitation });
  } catch (error) {
    console.error("Error creating invitation:", error);
    res.status(500).json({ message: "Could not send invitation" });
  }
});

// Update member role
router.put("/:id/members/:userId", requireOrgPermission('manage_members'), validateAndSanitizeRequest({ params: orgAndUserIdParamsSchema, body: updateMemberBodySchema }), async (req: Request, res: Response) => {
  try {
    const orgId = req.params.id;
    const userId = req.params.userId;
    const { org_role, permissions } = req.body;

    // Verify user can manage this organization
    const userOrgId = req.user?.organizationId;
    if (req.user?.role !== 'super_admin' && userOrgId !== orgId) {
      return res.status(403).json({ message: "Access denied: Cannot manage this organization's members" });
    }

    const updatedMember = await storage.updateOrganizationMember(orgId, userId, {
      org_role,
      permissions
    });

    if (!updatedMember) {
      return res.status(404).json({ message: "Organization member not found" });
    }

    res.json(updatedMember);
  } catch (error) {
    console.error("Error updating organization member:", error);
    res.status(500).json({ message: "Could not update organization member" });
  }
});

// Remove member from organization
router.delete("/:id/members/:userId", requireOrgPermission('manage_members'), validateAndSanitizeRequest({ params: orgAndUserIdParamsSchema }), async (req: Request, res: Response) => {
  try {
    const orgId = req.params.id;
    const userId = req.params.userId;

    // Verify user can manage this organization
    const userOrgId = req.user?.organizationId;
    if (req.user?.role !== 'super_admin' && userOrgId !== orgId) {
      return res.status(403).json({ message: "Access denied: Cannot manage this organization's members" });
    }

    // Prevent removing self
    if (userId === req.user?.userId) {
      return res.status(400).json({ message: "Cannot remove yourself from the organization" });
    }

    const success = await storage.removeOrganizationMember(orgId, userId);
    if (!success) {
      return res.status(404).json({ message: "Organization member not found" });
    }

    res.json({ message: "Member removed from organization successfully" });
  } catch (error) {
    console.error("Error removing organization member:", error);
    res.status(500).json({ message: "Could not remove organization member" });
  }
});

// Get organization analytics
router.get("/:id/analytics", requireOrgPermission('access_analytics'), validateAndSanitizeRequest({ params: orgIdParamSchema }), async (req: Request, res: Response) => {
  try {
    const orgId = req.params.id;

    // Verify user can access this organization's analytics
    const userOrgId = req.user?.organizationId;
    if (req.user?.role !== 'super_admin' && userOrgId !== orgId) {
      return res.status(403).json({ message: "Access denied: Cannot access this organization's analytics" });
    }

    const analytics = await getOrganizationAnalytics(orgId);
    res.json(analytics);
  } catch (error) {
    console.error("Error fetching organization analytics:", error);
    res.status(500).json({ message: "Could not fetch organization analytics" });
  }
});

// Add members endpoint for organization management
router.get('/members', async (req: Request, res: Response) => {
  try {
    const userOrgId = req.user?.organizationId;
    if (!userOrgId) {
      return res.status(400).json({ message: "Organization context required" });
    }

    const members = await db
      .select({
        id: users.id,
        display_name: users.display_name,
        email: users.email,
        role: users.role,
        organization_id: users.organization_id,
        created_at: users.created_at,
        avatar_url: users.avatar_url
      })
      .from(users)
      .where(eq(users.organization_id, userOrgId))
      .orderBy(users.display_name);

    res.json(members);
  } catch (error) {
    console.error('Error fetching organization members:', error);
    res.status(500).json({ message: "Failed to fetch organization members" });
  }
});

// Export the router
export default router;