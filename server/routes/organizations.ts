import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate as validateJWT } from '../middleware/secureAuth.js';
import { requireOrgPermission } from '../middleware/organizationRoleMiddleware.js';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext.js';
import { validateAndSanitizeRequest } from '../middleware/inputValidation.js';
import { storage } from '../storage.js';
import { getOrganizationAnalytics } from '../analytics.js';
import prisma from '../prisma';
import { z } from 'zod';

const insertOrganizationSchema = z.object({
    name: z.string().min(1, 'Organization name is required'),
    slug: z.string().min(1, 'Organization slug is required').optional(),
    description: z.string().optional().nullable(),
    logoUrl: z.string().url('Invalid URL format').optional().nullable(),
    website: z.string().url('Invalid URL format').optional().nullable(),
    industry: z.string().optional().nullable(),
    size: z.string().optional().nullable(),
    plan: z.enum(['free', 'basic', 'pro', 'enterprise', 'custom']).optional(),
    billingEmail: z.string().email('Invalid email format').optional().nullable(),
    billingPhone: z.string().optional().nullable(),
    billingAddress: z.any().optional().nullable(), // Consider a more specific schema for address
    shippingAddress: z.any().optional().nullable(), // Consider a more specific schema for address
    metadata: z.any().optional().nullable(), // Consider a more specific schema for metadata
    isActive: z.boolean().optional(),
    trialEndsAt: z.string().datetime().optional().nullable(),
    billingCycleStart: z.number().int().min(1).max(31).optional().nullable(),
    billingCycleEnd: z.number().int().min(1).max(31).optional().nullable(),
});
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
        }
        else if (req.user?.userId) {
            // Fallback: get organization from database
            const userWithOrg = await prisma.user.findUnique({
                where: { id: req.user.userId },
                select: {
                    organizationMemberships: {
                        select: {
                            organizationId: true,
                        },
                        take: 1,
                    },
                },
            });
            if (userWithOrg?.organizationMemberships[0]?.organizationId) {
                targetOrgId = userWithOrg.organizationMemberships[0].organizationId;
            }
        }
        // If no organization found, return error
        if (!targetOrgId) {
            return res.status(400).json({
                error: 'No organization context found',
                message: 'User must be associated with an organization to access this endpoint'
            });
        }
        const organizationUsers = await prisma.user.findMany({
            where: {
                organizationMemberships: {
                    some: {
                        organizationId: targetOrgId,
                    },
                },
            },
            select: {
                id: true,
                firstName: true, // Assuming display_name is firstName in Prisma
                lastName: true, // Assuming display_name is a combination of first and last name
                email: true,
                role: true,
                // organization_id is not directly on User in Prisma, it's via OrganizationMember
                // username is not directly on User in Prisma
            },
            orderBy: {
                firstName: 'asc', // Assuming display_name is firstName in Prisma
            },
        });
        console.log(`Found ${organizationUsers.length} users for organization ${targetOrgId}`);
        res.json(organizationUsers);
    }
    catch (error) {
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
        const organization = await storage.getOrganization(String(orgId));
        if (!organization) {
            return res.status(404).json({ message: "Organization not found" });
        }
        res.json(organization);
    }
    catch (error) {
        console.error("Error fetching organization:", error);
        res.status(500).json({ message: "Could not fetch organization details" });
    }
});
// Update organization (admin only)
router.put("/:id", requireOrgPermission('manage_organization'), validateAndSanitizeRequest({ params: orgIdParamSchema, body: insertOrganizationSchema.partial() }), async (req: Request, res: Response) => {
    try {
        const orgId = String(req.params.id);
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
    }
    catch (error) {
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
        const orgId = String(req.params.id);
        // Verify user can access this organization
        const userOrgId = req.user?.organizationId;
        if (req.user?.role !== 'super_admin' && userOrgId !== orgId) {
            return res.status(403).json({ message: "Access denied: Cannot access this organization's members" });
        }
        const members = await storage.getOrganizationMembers(orgId);
        res.json(members);
    }
    catch (error) {
        console.error("Error fetching organization members:", error);
        res.status(500).json({ message: "Could not fetch organization members" });
    }
});
// Invite member to organization
router.post("/:id/invite", requireOrgPermission('invite_members'), validateAndSanitizeRequest({ params: orgIdParamSchema, body: inviteMemberBodySchema }), async (req: Request, res: Response) => {
    try {
        const orgId = String(req.params.id);
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
    }
    catch (error) {
        console.error("Error creating invitation:", error);
        res.status(500).json({ message: "Could not send invitation" });
    }
});
// Update member role
router.put("/:id/members/:userId", requireOrgPermission('manage_members'), validateAndSanitizeRequest({ params: orgAndUserIdParamsSchema, body: updateMemberBodySchema }), async (req: Request, res: Response) => {
    try {
        const orgId = String(req.params.id);
        const userId = String(req.params.userId);
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
    }
    catch (error) {
        console.error("Error updating organization member:", error);
        res.status(500).json({ message: "Could not update organization member" });
    }
});
// Remove member from organization
router.delete("/:id/members/:userId", requireOrgPermission('manage_members'), validateAndSanitizeRequest({ params: orgAndUserIdParamsSchema }), async (req: Request, res: Response) => {
    try {
        const orgId = String(req.params.id);
        const userId = String(req.params.userId);
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
    }
    catch (error) {
        console.error("Error removing organization member:", error);
        res.status(500).json({ message: "Could not remove organization member" });
    }
});
// Get organization analytics
router.get("/:id/analytics", requireOrgPermission('access_analytics'), validateAndSanitizeRequest({ params: orgIdParamSchema }), async (req: Request, res: Response) => {
    try {
        const orgId = String(req.params.id);
        // Verify user can access this organization's analytics
        const userOrgId = req.user?.organizationId;
        if (req.user?.role !== 'super_admin' && userOrgId !== orgId) {
            return res.status(403).json({ message: "Access denied: Cannot access this organization's analytics" });
        }
        const analytics = await getOrganizationAnalytics(orgId);
        res.json(analytics);
    }
    catch (error) {
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
        const members = await prisma.organizationMember.findMany({
            where: {
                organizationId: userOrgId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                        createdAt: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: {
                user: {
                    firstName: 'asc',
                },
            },
        });
        res.json(
            members.map((member) => ({
                id: member.user.id,
                display_name: `${member.user.firstName} ${member.user.lastName}`.trim(),
                email: member.user.email,
                role: member.user.role,
                organization_id: member.organizationId,
                created_at: member.user.createdAt,
                avatar_url: member.user.avatarUrl,
            }))
        );
    } catch (error) {
        console.error('Error fetching organization members:', error);
        res.status(500).json({ message: 'Could not fetch organization members' });
    }
});

// Export the router
export default router;
