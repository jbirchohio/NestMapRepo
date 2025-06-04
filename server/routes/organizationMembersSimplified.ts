/**
 * Simplified Organization Members API
 * Uses direct users.organization_id relationship only
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { unifiedAuthMiddleware } from '../middleware/unifiedAuth';
import { getRoleDescription } from '../rbac/organizationRoles';

const router = Router();

// Apply unified auth middleware
router.use(unifiedAuthMiddleware);

/**
 * Get organization members directly from users table
 */
router.get('/members', async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organization_id || 1;

    const members = await db
      .select({
        id: users.id,
        userId: users.id,
        orgRole: users.role,
        userName: users.display_name,
        userEmail: users.email,
        userAvatar: users.avatar_url,
        status: users.role, // Use role as status indicator
        joinedAt: users.created_at,
      })
      .from(users)
      .where(eq(users.organization_id, organizationId))
      .orderBy(users.created_at);

    // Add role descriptions
    const membersWithDescriptions = members.map(member => ({
      ...member,
      roleDescription: getRoleDescription(member.orgRole as any),
    }));

    res.json({
      members: membersWithDescriptions,
      totalMembers: members.length,
      activeMembers: members.length,
    });
  } catch (error) {
    console.error('Error fetching organization members:', error);
    res.status(500).json({ error: 'Failed to fetch organization members' });
  }
});

export default router;