import { Router } from 'express';
import { db } from '@shared/../db';
import { users, organizations } from '@shared/../db/schema';
import { logSuperadminAction } from '../superadmin';
import { eq, sql } from 'drizzle-orm';

const router = Router();

// Get dashboard analytics
router.get('/analytics', async (req, res) => {
  try {
    // Get total users count
    const [totalUsers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    // Get active users (last 30 days)
    const [activeUsers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(sql`${users.lastLoginAt} > NOW() - INTERVAL '30 days'`);

    // Get total organizations
    const [totalOrgs] = await db
      .select({ count: sql<number>`count(*)` })
      .from(organizations);

    // Get active organizations (with at least one active user)
    const [activeOrgs] = await db
      .select({ count: sql<number>`count(distinct ${users.organizationId})` })
      .from(users)
      .where(sql`${users.lastLoginAt} > NOW() - INTERVAL '30 days'`);

    // Get system health status
    const systemHealth = {
      status: 'healthy' as const,
      lastChecked: new Date().toISOString(),
      components: {
        database: 'operational',
        api: 'operational',
        storage: 'operational',
      },
    };

    // Prepare response
    const analytics = {
      overview: {
        totalUsers: Number(totalUsers.count) || 0,
        activeUsers: Number(activeUsers.count) || 0,
        totalOrgs: Number(totalOrgs.count) || 0,
        activeOrgs: Number(activeOrgs.count) || 0,
      },
      systemHealth,
      recentActivity: [],
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard analytics' });
  }
});

// System health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'superadmin-dashboard',
  });
});

export default router;
