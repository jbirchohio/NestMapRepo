import express from 'express';
import { eq, desc, count, sql, and, gte, lte } from 'drizzle-orm';
import { db } from '../db';
import { 
  users, 
  organizations, 
  organizationMembers,
} from '@shared/schema';
import {
  superadminAuditLogs,
  activeSessions,
  aiUsageLogs,
  superadminFeatureFlags,
  organizationFeatureFlags,
  superadminBackgroundJobs,
  billingEvents,
  systemActivitySummary,
  insertSuperadminAuditLogSchema,
  insertSuperadminFeatureFlagSchema,
  insertSuperadminBackgroundJobSchema,
} from '@shared/superadmin-schema';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Middleware to check superadmin permissions
const requireSuperadmin = (req: any, res: any, next: any) => {
  if (!req.user || !['superadmin_owner', 'superadmin_staff', 'superadmin_auditor'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Superadmin access required' });
  }
  next();
};

// Audit logging helper
const logSuperadminAction = async (adminUserId: number, action: string, entityType: string, entityId?: number, details?: any, targetUserId?: number, targetOrganizationId?: number) => {
  await db.insert(superadminAuditLogs).values({
    admin_user_id: adminUserId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    target_user_id: targetUserId,
    target_organization_id: targetOrganizationId,
    details,
    severity: 'info',
  });
};

// Organizations endpoints
router.get('/organizations', requireSuperadmin, async (req, res) => {
  try {
    const orgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        domain: organizations.domain,
        plan: organizations.plan,
        white_label_enabled: organizations.white_label_enabled,
        white_label_plan: organizations.white_label_plan,
        employee_count: organizations.employee_count,
        subscription_status: organizations.subscription_status,
        current_period_end: organizations.current_period_end,
        created_at: organizations.created_at,
        updated_at: organizations.updated_at,
        user_count: sql<number>`(SELECT COUNT(*) FROM ${organizationMembers} WHERE ${organizationMembers.organization_id} = ${organizations.id})`,
      })
      .from(organizations)
      .orderBy(desc(organizations.created_at));

    res.json(orgs);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

router.get('/organizations/:id', requireSuperadmin, async (req, res) => {
  try {
    const orgId = parseInt(req.params.id);
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId));

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get organization members
    const members = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        display_name: users.display_name,
        role: users.role,
        org_role: organizationMembers.org_role,
        status: organizationMembers.status,
        joined_at: organizationMembers.joined_at,
        created_at: users.created_at,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.user_id, users.id))
      .where(eq(organizationMembers.organization_id, orgId))
      .orderBy(desc(organizationMembers.joined_at));

    res.json({ ...org, members });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

router.post('/organizations', requireSuperadmin, async (req, res) => {
  try {
    const { name, domain, plan, employee_count } = req.body;

    const [newOrg] = await db
      .insert(organizations)
      .values({
        name,
        domain,
        plan: plan || 'free',
        employee_count: employee_count || 1,
        subscription_status: 'inactive',
      })
      .returning();

    await logSuperadminAction(
      req.user.id,
      'CREATE_ORGANIZATION',
      'organization',
      newOrg.id,
      { name, domain, plan },
      undefined,
      newOrg.id
    );

    res.status(201).json(newOrg);
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

router.put('/organizations/:id', requireSuperadmin, async (req, res) => {
  try {
    const orgId = parseInt(req.params.id);
    const updates = req.body;

    const [updatedOrg] = await db
      .update(organizations)
      .set({
        ...updates,
        updated_at: new Date(),
      })
      .where(eq(organizations.id, orgId))
      .returning();

    if (!updatedOrg) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    await logSuperadminAction(
      req.user.id,
      'UPDATE_ORGANIZATION',
      'organization',
      orgId,
      updates,
      undefined,
      orgId
    );

    res.json(updatedOrg);
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

router.delete('/organizations/:id', requireSuperadmin, async (req, res) => {
  try {
    const orgId = parseInt(req.params.id);

    // First check if organization exists
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId));

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Delete organization members first
    await db
      .delete(organizationMembers)
      .where(eq(organizationMembers.organization_id, orgId));

    // Delete the organization
    await db
      .delete(organizations)
      .where(eq(organizations.id, orgId));

    await logSuperadminAction(
      req.user.id,
      'DELETE_ORGANIZATION',
      'organization',
      orgId,
      { name: org.name },
      undefined,
      orgId
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

// Users endpoints
router.get('/users', requireSuperadmin, async (req, res) => {
  try {
    const usersData = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        display_name: users.display_name,
        role: users.role,
        role_type: users.role_type,
        organization_id: users.organization_id,
        company: users.company,
        job_title: users.job_title,
        created_at: users.created_at,
        organization_name: organizations.name,
      })
      .from(users)
      .leftJoin(organizations, eq(users.organization_id, organizations.id))
      .orderBy(desc(users.created_at));

    res.json(usersData);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/users/:id', requireSuperadmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        display_name: users.display_name,
        role: users.role,
        role_type: users.role_type,
        organization_id: users.organization_id,
        company: users.company,
        job_title: users.job_title,
        team_size: users.team_size,
        use_case: users.use_case,
        created_at: users.created_at,
        organization_name: organizations.name,
      })
      .from(users)
      .leftJoin(organizations, eq(users.organization_id, organizations.id))
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.put('/users/:id', requireSuperadmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const updates = req.body;

    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await logSuperadminAction(
      req.user.id,
      'UPDATE_USER',
      'user',
      userId,
      updates,
      userId
    );

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.post('/users/:id/reset-password', requireSuperadmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    const [updatedUser] = await db
      .update(users)
      .set({ password_hash: hashedPassword })
      .where(eq(users.id, userId))
      .returning({ id: users.id, username: users.username, email: users.email });

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await logSuperadminAction(
      req.user.id,
      'RESET_PASSWORD',
      'user',
      userId,
      { target_username: updatedUser.username },
      userId
    );

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.delete('/users/:id', requireSuperadmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Get user info before deletion
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete organization memberships first
    await db
      .delete(organizationMembers)
      .where(eq(organizationMembers.user_id, userId));

    // Delete the user
    await db
      .delete(users)
      .where(eq(users.id, userId));

    await logSuperadminAction(
      req.user.id,
      'DELETE_USER',
      'user',
      userId,
      { username: user.username, email: user.email },
      userId
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// System activity and monitoring
router.get('/activity', requireSuperadmin, async (req, res) => {
  try {
    const activities = await db
      .select()
      .from(superadminAuditLogs)
      .orderBy(desc(superadminAuditLogs.created_at))
      .limit(100);

    res.json(activities);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

router.get('/sessions', requireSuperadmin, async (req, res) => {
  try {
    const sessions = await db
      .select()
      .from(activeSessions)
      .orderBy(desc(activeSessions.last_activity))
      .limit(50);

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.get('/jobs', requireSuperadmin, async (req, res) => {
  try {
    const jobs = await db
      .select()
      .from(superadminBackgroundJobs)
      .orderBy(desc(superadminBackgroundJobs.created_at))
      .limit(50);

    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

router.get('/billing', requireSuperadmin, async (req, res) => {
  try {
    const billing = await db
      .select({
        organization_id: organizations.id,
        organization_name: organizations.name,
        plan: organizations.plan,
        subscription_status: organizations.subscription_status,
        current_period_end: organizations.current_period_end,
        stripe_customer_id: organizations.stripe_customer_id,
        stripe_subscription_id: organizations.stripe_subscription_id,
        user_count: sql<number>`(SELECT COUNT(*) FROM ${organizationMembers} WHERE ${organizationMembers.organization_id} = ${organizations.id})`,
      })
      .from(organizations)
      .where(sql`${organizations.plan} != 'free'`)
      .orderBy(desc(organizations.created_at));

    res.json(billing);
  } catch (error) {
    console.error('Error fetching billing:', error);
    res.status(500).json({ error: 'Failed to fetch billing' });
  }
});

router.get('/flags', requireSuperadmin, async (req, res) => {
  try {
    const flags = await db
      .select()
      .from(superadminFeatureFlags)
      .orderBy(superadminFeatureFlags.flag_name);

    res.json(flags);
  } catch (error) {
    console.error('Error fetching flags:', error);
    res.status(500).json({ error: 'Failed to fetch flags' });
  }
});

router.post('/flags', requireSuperadmin, async (req, res) => {
  try {
    const flagData = insertSuperadminFeatureFlagSchema.parse(req.body);

    const [newFlag] = await db
      .insert(superadminFeatureFlags)
      .values(flagData)
      .returning();

    await logSuperadminAction(
      req.user.id,
      'CREATE_FEATURE_FLAG',
      'feature_flag',
      newFlag.id,
      flagData
    );

    res.status(201).json(newFlag);
  } catch (error) {
    console.error('Error creating flag:', error);
    res.status(500).json({ error: 'Failed to create flag' });
  }
});

router.put('/flags/:id', requireSuperadmin, async (req, res) => {
  try {
    const flagId = parseInt(req.params.id);
    const updates = req.body;

    const [updatedFlag] = await db
      .update(superadminFeatureFlags)
      .set(updates)
      .where(eq(superadminFeatureFlags.id, flagId))
      .returning();

    if (!updatedFlag) {
      return res.status(404).json({ error: 'Flag not found' });
    }

    await logSuperadminAction(
      req.user.id,
      'UPDATE_FEATURE_FLAG',
      'feature_flag',
      flagId,
      updates
    );

    res.json(updatedFlag);
  } catch (error) {
    console.error('Error updating flag:', error);
    res.status(500).json({ error: 'Failed to update flag' });
  }
});

export default router;