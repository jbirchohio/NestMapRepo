/**
 * Organization Members API Routes
 * Consolidated approach using users.organization_id directly
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users, organizationMembers } from '@shared/schema';
import { eq, sql, and } from 'drizzle-orm';
import { requireOrgPermission } from '../middleware/organizationRoleMiddleware';
import { OrganizationRole, getRoleDescription, canAssignRole } from '../rbac/organizationRoles';
import { unifiedAuthMiddleware } from '../middleware/unifiedAuth';
import { z } from 'zod';

const router = Router();

// Apply unified auth middleware
router.use(unifiedAuthMiddleware);

/**
 * Get organization members with their roles
 */
router.get('/members', async (req: Request, res: Response) => {
  try {
    // Use authenticated user's organization ID
    const organizationId = req.user?.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'No organization context found',
        message: 'User must be associated with an organization to access members'
      });
    }

    const members = await db
      .select({
        id: users.id,
        userId: users.id,
        orgRole: users.role,
        permissions: sql<any>`NULL`, // No separate permissions in consolidated approach
        status: sql<string>`'active'`, // Default active status
        joinedAt: users.created_at,
        invitedAt: users.created_at,
        invitedBy: sql<number>`NULL`, // No separate invitation tracking
        // User details
        userName: users.display_name,
        userEmail: users.email,
        userAvatar: users.avatar_url,
      })
      .from(users)
      .where(eq(users.organization_id, organizationId));

    // Add role descriptions
    const membersWithDescriptions = members.map(member => ({
      ...member,
      roleDescription: getRoleDescription(member.orgRole as OrganizationRole),
    }));

    res.json({
      members: membersWithDescriptions,
      totalMembers: members.length,
      activeMembers: members.filter(m => m.status === 'active').length,
    });
  } catch (error) {
    console.error('Error fetching organization members:', error);
    res.status(500).json({ error: 'Failed to fetch organization members' });
  }
});

/**
 * Invite a new member to the organization
 */
const inviteMemberSchema = z.object({
  email: z.string().email(),
  orgRole: z.enum(['admin', 'manager', 'editor', 'member', 'viewer']),
  customPermissions: z.object({}).optional(),
});

router.post('/members/invite', requireOrgPermission('inviteMembers'), async (req: Request, res: Response) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const validatedData = inviteMemberSchema.parse(req.body);
    const { email, orgRole, customPermissions } = validatedData;

    // Check if the current user can assign this role
    if (!canAssignRole(req.userOrgRole!, orgRole as OrganizationRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions to assign this role',
        message: `Cannot assign role '${orgRole}' with your current role '${req.userOrgRole}'`
      });
    }

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!existingUser) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User must have an account before being invited to an organization'
      });
    }

    // Check if user is already a member
    const [existingMember] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.user_id, existingUser.id),
          eq(organizationMembers.organization_id, req.user.organization_id)
        )
      );

    if (existingMember) {
      return res.status(409).json({ 
        error: 'User already a member',
        message: 'This user is already a member of your organization'
      });
    }

    // Create organization membership
    const [newMember] = await db
      .insert(organizationMembers)
      .values({
        organization_id: req.user.organization_id,
        user_id: existingUser.id,
        org_role: orgRole,
        permissions: customPermissions ? JSON.stringify(customPermissions) : null,
        invited_by: req.user.id,
        status: 'invited',
        invited_at: new Date(),
      })
      .returning();

    res.status(201).json({
      message: 'Member invited successfully',
      member: {
        ...newMember,
        userName: existingUser.display_name,
        userEmail: existingUser.email,
        roleDescription: getRoleDescription(orgRole as OrganizationRole),
      }
    });

    // Note: Email invitation functionality requires SMTP configuration
    console.log(`Member invitation created for ${email} with role ${orgRole}`);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid invitation data', 
        details: error.errors 
      });
    }
    console.error('Error inviting member:', error);
    res.status(500).json({ error: 'Failed to invite member' });
  }
});

/**
 * Update a member's role or permissions
 */
const updateMemberSchema = z.object({
  orgRole: z.enum(['admin', 'manager', 'editor', 'member', 'viewer']).optional(),
  customPermissions: z.object({}).optional(),
  status: z.enum(['active', 'suspended', 'inactive']).optional(),
});

router.patch('/members/:memberId', requireOrgPermission('assignRoles'), async (req: Request, res: Response) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const memberId = parseInt(req.params.memberId);
    const validatedData = updateMemberSchema.parse(req.body);

    // Get existing member
    const [existingMember] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.id, memberId),
          eq(organizationMembers.organization_id, req.user.organization_id)
        )
      );

    if (!existingMember) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Check role assignment permissions
    if (validatedData.orgRole) {
      if (!canAssignRole(req.userOrgRole!, validatedData.orgRole as OrganizationRole)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions to assign this role',
          message: `Cannot assign role '${validatedData.orgRole}' with your current role '${req.userOrgRole}'`
        });
      }
    }

    // Prevent users from modifying their own role (except super_admin)
    if (existingMember.user_id === req.user.id && req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        error: 'Cannot modify your own role',
        message: 'Users cannot change their own organization role'
      });
    }

    // Update member
    const updateData: any = {
      updated_at: new Date(),
    };

    if (validatedData.orgRole) {
      updateData.org_role = validatedData.orgRole;
    }

    if (validatedData.customPermissions) {
      updateData.permissions = JSON.stringify(validatedData.customPermissions);
    }

    if (validatedData.status) {
      updateData.status = validatedData.status;
    }

    const [updatedMember] = await db
      .update(organizationMembers)
      .set(updateData)
      .where(eq(organizationMembers.id, memberId))
      .returning();

    res.json({
      message: 'Member updated successfully',
      member: {
        ...updatedMember,
        roleDescription: getRoleDescription(updatedMember.org_role as OrganizationRole),
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid update data', 
        details: error.errors 
      });
    }
    console.error('Error updating member:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

/**
 * Remove a member from the organization
 */
router.delete('/members/:memberId', requireOrgPermission('manageMembers'), async (req: Request, res: Response) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const memberId = parseInt(req.params.memberId);

    // Get existing member
    const [existingMember] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.id, memberId),
          eq(organizationMembers.organization_id, req.user.organization_id)
        )
      );

    if (!existingMember) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Prevent users from removing themselves (except super_admin)
    if (existingMember.user_id === req.user.id && req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        error: 'Cannot remove yourself from the organization',
        message: 'Contact another admin to remove your membership'
      });
    }

    // Remove the member
    await db
      .delete(organizationMembers)
      .where(eq(organizationMembers.id, memberId));

    res.json({
      message: 'Member removed successfully',
      memberId
    });

  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

/**
 * Get available roles and their descriptions
 */
router.get('/roles', async (req: Request, res: Response) => {
  const roles = [
    { value: 'admin', label: 'Administrator', description: getRoleDescription('admin') },
    { value: 'manager', label: 'Manager', description: getRoleDescription('manager') },
    { value: 'editor', label: 'Editor', description: getRoleDescription('editor') },
    { value: 'member', label: 'Member', description: getRoleDescription('member') },
    { value: 'viewer', label: 'Viewer', description: getRoleDescription('viewer') },
  ];

  // Filter roles based on current user's ability to assign them
  const assignableRoles = roles.filter(role => 
    !req.userOrgRole || canAssignRole(req.userOrgRole, role.value as OrganizationRole)
  );

  res.json({
    roles: assignableRoles,
    currentUserRole: req.userOrgRole,
  });
});

export default router;