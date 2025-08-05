import express, { Request, Response } from 'express';
import { eq, desc, count, sql, and, gte, lte } from 'drizzle-orm';
import { db } from '../db';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { 
  users, 
  organizations, 
  organizationMembers,
  featureFlags,
  superadminAuditLogs,
  billingEvents,
  USER_ROLES
} from '@shared/schema';
import {
  activeSessions,
  aiUsageLogs,
  superadminFeatureFlags,
  organizationFeatureFlags,
  superadminBackgroundJobs,
  systemActivitySummary,
  insertSuperadminAuditLogSchema,
  insertSuperadminFeatureFlagSchema,
  insertSuperadminBackgroundJobSchema,
} from '@shared/superadmin-schema';
// Simple audit logging function
const auditLogger = {
  logAdminAction: (action: string, adminId: number, data?: any) => {
    console.log(`[AUDIT] Admin ${adminId} performed: ${action}`, data ? JSON.stringify(data) : '');
  }
};
import { hashPassword } from '../auth';
import { stripe, SUBSCRIPTION_PLANS, createStripeCustomer, updateSubscription, createRefund, isStripeConfigured } from '../stripe';

// Define authenticated request interface
interface AuthenticatedUser {
  id: number;
  email: string;
  role: string;
  organization_id?: number;
  displayName?: string;
}

import { requireSuperadminRole } from '../middleware/jwtAuth';
import { StripePricingSync } from '../services/stripePricingSync';

const router = express.Router();

// Apply superadmin role check to all routes (JWT auth already applied at app level)
router.use(requireSuperadminRole);

// Middleware for owner-level permissions
const requireSuperadminRoleOwner = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.user.role !== USER_ROLES.SUPERADMIN_OWNER) {
    return res.status(403).json({ error: 'Superadmin owner access required' });
  }
  
  next();
};

// Audit logging function
const logSuperadminAction = async (
  adminUserId: number,
  action: string,
  targetType: string,
  targetId?: number,
  details?: any
) => {
  try {
    await db.insert(superadminAuditLogs).values({
      superadmin_user_id: adminUserId,
      action,
      target_type: targetType,
      target_id: targetId?.toString() || '',
      details,
      ip_address: null,
      user_agent: null,
    });
  } catch (error) {
    console.error('Failed to log superadmin action:', error);
  }
};

// Organizations endpoints
router.get('/organizations', requireSuperadminRole, async (req: any, res: any) => {
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
        user_count: sql<number>`(SELECT COUNT(*) FROM ${users} WHERE ${users.organization_id} = ${organizations.id})`,
      })
      .from(organizations)
      .orderBy(desc(organizations.created_at));

    res.json(orgs);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

router.get('/organizations/:id', requireSuperadminRole, async (req: any, res: any) => {
  try {
    const orgId = parseInt(req.params.id);
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId));

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get organization members directly from users table (consolidated approach)
    const members = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        display_name: users.display_name,
        last_login: users.last_login,
        created_at: users.created_at,
        avatar_url: users.avatar_url,
        // Consider active if logged in within last 30 days
        status: sql<string>`CASE 
          WHEN ${users.last_login} IS NULL THEN 'inactive' 
          WHEN ${users.last_login} > (CURRENT_TIMESTAMP - INTERVAL '30 days') THEN 'active' 
          ELSE 'inactive' 
        END`,
      })
      .from(users)
      .where(eq(users.organization_id, orgId))
      .orderBy(users.created_at);

    res.json({ ...org, members });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

router.post('/organizations', requireSuperadminRole, async (req, res) => {
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
      req.user!.id,
      'CREATE_ORGANIZATION',
      'organization',
      newOrg.id,
      { name, domain, plan }
    );

    res.status(201).json(newOrg);
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

router.put('/organizations/:id', requireSuperadminRole, async (req, res) => {
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
      req.user!.id,
      'UPDATE_ORGANIZATION',
      'organization',
      orgId,
      updates
    );

    res.json(updatedOrg);
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

router.delete('/organizations/:id', requireSuperadminRole, async (req, res) => {
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
      req.user!.id,
      'DELETE_ORGANIZATION',
      'organization',
      orgId,
      { name: org.name }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

// Users endpoints
router.get('/users', requireSuperadminRole, async (req, res) => {
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
        last_login: users.last_login,
        organization_name: organizations.name,
        // Consider active if logged in within last 30 days
        is_active: sql<boolean>`CASE 
          WHEN ${users.last_login} IS NULL THEN false 
          WHEN ${users.last_login} > (CURRENT_TIMESTAMP - INTERVAL '30 days') THEN true 
          ELSE false 
        END`,
      })
      .from(users)
      .leftJoin(organizations, eq(users.organization_id, organizations.id))
      .orderBy(desc(users.created_at));

    res.json(usersData);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Update user
router.put('/users/:id', requireSuperadminRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    // Since is_active is computed, we update last_login to affect active status
    if (is_active) {
      // Set last_login to current time to make user active
      await db.execute(sql`
        UPDATE users
        SET last_login = NOW()
        WHERE id = ${id}
      `);
    } else {
      // Set last_login to more than 30 days ago to make user inactive
      await db.execute(sql`
        UPDATE users
        SET last_login = NOW() - INTERVAL '31 days'
        WHERE id = ${id}
      `);
    }

    // Log the action
    await logSuperadminAction(
      req.user!.id,
      is_active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      'user',
      parseInt(id),
      { is_active }
    );

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.get('/users/:id', requireSuperadminRole, async (req, res) => {
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

router.put('/users/:id', requireSuperadminRole, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const updates = req.body;

    // Validate role if it's being updated
    if (updates.role) {
      const validRoles = ['admin', 'manager', 'editor', 'member', 'viewer'];
      if (!validRoles.includes(updates.role)) {
        return res.status(400).json({ error: 'Invalid role. Must be one of: admin, manager, editor, member, viewer' });
      }
    }

    console.log('Updating user:', userId, 'with data:', updates);

    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('User updated successfully:', updatedUser);

    try {
      await logSuperadminAction(
        req.user!.id,
        'UPDATE_USER',
        'user',
        userId,
        updates
      );
    } catch (auditError) {
      console.warn('Audit logging failed:', auditError);
      // Continue with response even if audit fails
    }

    res.json(updatedUser);
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user', details: error?.message || 'Unknown error' });
  }
});

router.post('/users/:id/reset-password', requireSuperadminRole, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Use existing password hashing system
    const passwordHash = hashPassword(newPassword);

    const [updatedUser] = await db
      .update(users)
      .set({ password_hash: passwordHash })
      .where(eq(users.id, userId))
      .returning({ id: users.id, username: users.username, email: users.email });

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await logSuperadminAction(
      req.user!.id,
      'RESET_PASSWORD',
      'user',
      userId,
      { target_username: updatedUser.username }
    );

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.delete('/users/:id', requireSuperadminRole, async (req, res) => {
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
      req.user!.id,
      'DELETE_USER',
      'user',
      userId,
      { username: user.username, email: user.email }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// System activity and monitoring
router.get('/activity', requireSuperadminRole, async (req, res) => {
  try {
    // Use direct SQL to get audit logs
    const activities = await db.execute(`
      SELECT id, superadmin_user_id as admin_user_id, action, target_type, 
             target_id, details, created_at
      FROM superadmin_audit_logs 
      ORDER BY created_at DESC 
      LIMIT 100
    `);

    res.json(activities.rows || []);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

router.get('/sessions', requireSuperadminRole, async (req, res) => {
  try {
    // Get active sessions from active_sessions table
    const sessions = await db.execute(`
      SELECT s.id,
             s.user_id,
             s.session_token,
             s.ip_address,
             s.user_agent,
             s.created_at,
             s.last_activity,
             s.expires_at,
             u.username,
             u.email,
             u.role,
             u.display_name,
             o.name as organization_name
      FROM active_sessions s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE s.expires_at > NOW()
      ORDER BY s.last_activity DESC 
      LIMIT 50
    `);

    res.json(sessions.rows || []);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.get('/jobs', requireSuperadminRole, async (req, res) => {
  try {
    // Use backgroundJobs table from schema
    const jobs = await db.execute(`
      SELECT id, job_type, status, data, result, error_message, 
             attempts, max_attempts, scheduled_at, started_at, 
             completed_at, created_at
      FROM background_jobs 
      ORDER BY created_at DESC 
      LIMIT 50
    `);

    res.json(jobs.rows || []);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

router.get('/billing', requireSuperadminRole, async (req, res) => {
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
        user_count: sql<number>`(SELECT COUNT(*) FROM ${users} WHERE ${users.organization_id} = ${organizations.id})`,
        created_at: organizations.created_at,
        monthly_cost: sql<number>`CASE 
          WHEN ${organizations.plan} = 'team' THEN 29.99 
          WHEN ${organizations.plan} = 'enterprise' THEN 99.99 
          ELSE 0 
        END`,
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

// Billing management endpoints

// Get subscription plans
router.get('/billing/plans', requireSuperadminRole, async (req, res) => {
  try {
    res.json({ plans: SUBSCRIPTION_PLANS });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// Test Stripe integration
router.get('/billing/test-stripe', requireSuperadminRole, async (req, res) => {
  try {
    const testResults: any = {
      timestamp: new Date().toISOString(),
      stripe_configured: !!process.env.STRIPE_SECRET_KEY,
      api_key_type: process.env.STRIPE_SECRET_KEY?.substring(0, 8) || 'none',
      price_ids: {
        team: process.env.STRIPE_PRICE_ID_TEAM || 'not_configured',
        enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE || 'not_configured'
      },
      subscription_plans: SUBSCRIPTION_PLANS,
      billing_endpoints: [
        'POST /api/superadmin/billing/:orgId/upgrade',
        'POST /api/superadmin/billing/:orgId/downgrade', 
        'POST /api/superadmin/billing/:orgId/suspend',
        'POST /api/superadmin/billing/:orgId/reactivate',
        'POST /api/superadmin/billing/:orgId/refund'
      ]
    };

    if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_')) {
      try {
        // Test Stripe connection
        const balance = await stripe.balance.retrieve();
        testResults.stripe_connection = 'success';
        testResults.account_balance = balance.available;
        
        // Test price validation
        if (process.env.STRIPE_PRICE_ID_TEAM) {
          const teamPrice = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID_TEAM);
          testResults.team_price_valid = {
            id: teamPrice.id,
            amount: (teamPrice.unit_amount || 0) / 100,
            currency: teamPrice.currency,
            interval: teamPrice.recurring?.interval
          };
        }
        
        if (process.env.STRIPE_PRICE_ID_ENTERPRISE) {
          const enterprisePrice = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID_ENTERPRISE);
          testResults.enterprise_price_valid = {
            id: enterprisePrice.id,
            amount: (enterprisePrice.unit_amount || 0) / 100,
            currency: enterprisePrice.currency,
            interval: enterprisePrice.recurring?.interval
          };
        }
        
      } catch (stripeError: any) {
        testResults.stripe_connection = 'failed';
        testResults.stripe_error = stripeError.message;
      }
    } else {
      testResults.stripe_connection = 'invalid_api_key';
      testResults.error = 'Secret key required (starts with sk_)';
    }

    res.json(testResults);
  } catch (error) {
    console.error('Error testing Stripe:', error);
    res.status(500).json({ error: 'Failed to test Stripe integration' });
  }
});
router.post('/billing/:orgId/upgrade', requireSuperadminRole, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const { newPlan, previousPlan } = req.body;
    
    // Validate plan upgrade path
    const validUpgrades: Record<string, string[]> = {
      'free': ['team', 'enterprise'],
      'team': ['enterprise'],
      'enterprise': []
    };

    if (!validUpgrades[previousPlan]?.includes(newPlan)) {
      return res.status(400).json({ error: 'Invalid plan upgrade path' });
    }

    // Get organization data
    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Handle Stripe subscription creation/update
    let stripeCustomerId = org.stripe_customer_id;
    let stripeSubscriptionId = org.stripe_subscription_id;

    if (newPlan !== 'free') {
      const planConfig = SUBSCRIPTION_PLANS[newPlan as keyof typeof SUBSCRIPTION_PLANS];
      
      if (!stripeCustomerId) {
        // Create Stripe customer
        const customer = await createStripeCustomer(
          'admin@' + org.name.toLowerCase().replace(/\s+/g, '') + '.com',
          org.name
        );
        stripeCustomerId = customer.id;
      }

      if (stripeSubscriptionId && previousPlan !== 'free') {
        // Update existing subscription
        await updateSubscription(stripeSubscriptionId, planConfig.stripePriceId!);
      } else {
        // Create new subscription
        const subscription = await stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [{ price: planConfig.stripePriceId! }],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
        });
        stripeSubscriptionId = subscription.id;
      }
    }

    // Update organization plan
    const [updatedOrg] = await db
      .update(organizations)
      .set({ 
        plan: newPlan,
        subscription_status: 'active',
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        updated_at: new Date()
      })
      .where(eq(organizations.id, orgId))
      .returning();

    // Log audit action
    if (req.user?.id) {
      auditLogger.logAdminAction(
        'UPGRADE_PLAN',
        req.user.id,
        { organization_id: orgId, organization_name: updatedOrg.name, new_plan: newPlan, previous_plan: previousPlan }
      );
    }

    res.json({ success: true, organization: updatedOrg });
  } catch (error) {
    console.error('Error upgrading plan:', error);
    res.status(500).json({ error: 'Failed to upgrade plan' });
  }
});

router.post('/billing/:orgId/downgrade', requireSuperadminRole, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const { newPlan, previousPlan } = req.body;
    
    // Validate plan downgrade path
    const validDowngrades: Record<string, string[]> = {
      'enterprise': ['team', 'free'],
      'team': ['free'],
      'free': []
    };

    if (!validDowngrades[previousPlan]?.includes(newPlan)) {
      return res.status(400).json({ error: 'Invalid plan downgrade path' });
    }

    // Get organization data
    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Handle Stripe subscription update
    let stripeSubscriptionId = org.stripe_subscription_id;

    if (org.stripe_subscription_id) {
      if (newPlan === 'free') {
        // Cancel subscription for free plan
        await stripe.subscriptions.cancel(org.stripe_subscription_id);
        stripeSubscriptionId = null;
      } else {
        // Update subscription to new plan
        const planConfig = SUBSCRIPTION_PLANS[newPlan as keyof typeof SUBSCRIPTION_PLANS];
        await updateSubscription(org.stripe_subscription_id, planConfig.stripePriceId!);
      }
    }

    // Update organization plan
    const [updatedOrg] = await db
      .update(organizations)
      .set({ 
        plan: newPlan,
        subscription_status: newPlan === 'free' ? 'inactive' : 'active',
        stripe_subscription_id: stripeSubscriptionId,
        updated_at: new Date()
      })
      .where(eq(organizations.id, orgId))
      .returning();

    // Log audit action
    if (req.user?.id) {
      auditLogger.logAdminAction(
        'DOWNGRADE_PLAN',
        req.user.id,
        { organization_id: orgId, organization_name: updatedOrg.name, new_plan: newPlan, previous_plan: previousPlan }
      );
    }

    res.json({ success: true, organization: updatedOrg });
  } catch (error) {
    console.error('Error downgrading plan:', error);
    res.status(500).json({ error: 'Failed to downgrade plan' });
  }
});

router.post('/billing/:orgId/refund', requireSuperadminRole, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const { amount, reason, refundType } = req.body;
    
    // Get organization details
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId));

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Process refund (would integrate with Stripe in production)
    const refundData = {
      organization_id: orgId,
      amount: parseFloat(amount),
      reason,
      refund_type: refundType,
      status: 'processed',
      processed_at: new Date(),
      processed_by: req.user?.id || 1
    };

    // Log audit action
    const adminUserId = req.user?.id || 5; // Default to known admin user
    auditLogger.logAdminAction(
      'PROCESS_REFUND',
      adminUserId,
      { organization_id: orgId, organization_name: org.name, amount: parseFloat(amount), reason, refund_type: refundType }
    );

    res.json({ success: true, refund: refundData });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

router.post('/billing/:orgId/suspend', requireSuperadminRole, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const { reason } = req.body;
    
    // Update organization status
    const [updatedOrg] = await db
      .update(organizations)
      .set({ 
        subscription_status: 'suspended',
        updated_at: new Date()
      })
      .where(eq(organizations.id, orgId))
      .returning();

    if (!updatedOrg) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Log audit action with proper user context
    if (req.user?.id) {
      auditLogger.logAdminAction(
        'SUSPEND_BILLING',
        req.user.id,
        { organization_id: orgId, organization_name: updatedOrg.name, reason }
      );
    }

    res.json({ success: true, organization: updatedOrg });
  } catch (error) {
    console.error('Error suspending billing:', error);
    res.status(500).json({ error: 'Failed to suspend billing' });
  }
});

router.post('/billing/:orgId/reactivate', requireSuperadminRole, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    
    // Update organization status
    const [updatedOrg] = await db
      .update(organizations)
      .set({ 
        subscription_status: 'active',
        updated_at: new Date()
      })
      .where(eq(organizations.id, orgId))
      .returning();

    if (!updatedOrg) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Log audit action
    const adminUserId = req.user?.id || 5; // Default to known admin user
    auditLogger.logAdminAction(
      'REACTIVATE_BILLING',
      adminUserId,
      { organization_id: orgId, organization_name: updatedOrg.name }
    );

    res.json({ success: true, organization: updatedOrg });
  } catch (error) {
    console.error('Error reactivating billing:', error);
    res.status(500).json({ error: 'Failed to reactivate billing' });
  }
});

// Consolidated dashboard endpoint to prevent rate limiting
router.get('/dashboard', requireSuperadminRole, async (req, res) => {
  try {
    // Execute all queries in parallel but return as single response
    const [
      organizationsResult,
      usersResult,
      sessionsResult,
      jobsResult,
      activityResult,
      billingResult,
      flagsResult
    ] = await Promise.all([
      // Organizations
      db.execute(`
        SELECT o.*, COUNT(u.id) as user_count
        FROM organizations o
        LEFT JOIN users u ON o.id = u.organization_id
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `),
      
      // Users
      db.execute(`
        SELECT u.*, o.name as organization_name
        FROM users u
        LEFT JOIN organizations o ON u.organization_id = o.id
        ORDER BY u.created_at DESC
      `),
      
      // Active sessions
      db.execute(`
        SELECT id, user_id, session_token, ip_address, expires_at, organization_id
        FROM active_sessions
        WHERE expires_at > NOW()
        ORDER BY expires_at DESC
      `),
      
      // Background jobs
      db.execute(`
        SELECT id, job_type, status, payload, result, error_message, created_at, started_at, completed_at
        FROM superadmin_background_jobs
        ORDER BY created_at DESC
      `),
      
      // Activity logs
      db.execute(`
        SELECT id, superadmin_user_id as admin_user_id, action, target_type as entity_type, target_id as entity_id, details, risk_level, created_at
        FROM superadmin_audit_logs
        ORDER BY created_at DESC
        LIMIT 100
      `),
      
      // Billing data
      db.execute(`
        SELECT 
          o.id as organization_id,
          o.name as organization_name,
          o.plan,
          o.subscription_status,
          o.current_period_end,
          o.stripe_customer_id,
          o.stripe_subscription_id,
          COUNT(u.id) as user_count,
          o.created_at,
          CASE 
            WHEN o.plan = 'enterprise' THEN '99.99'
            WHEN o.plan = 'business' THEN '29.99'
            WHEN o.plan = 'basic' THEN '9.99'
            ELSE '0'
          END as monthly_cost
        FROM organizations o
        LEFT JOIN users u ON o.id = u.organization_id
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `),
      
      // Feature flags
      db.execute(`
        SELECT id, flag_name, default_value as is_enabled, description, created_at
        FROM feature_flags
        ORDER BY flag_name
      `)
    ]);

    // Log the dashboard access
    await logSuperadminAction(
      req.user!.id,
      'SUPERADMIN_ACCESS',
      'superadmin_dashboard',
      1,
      { ip_address: req.ip }
    );

    res.json({
      organizations: organizationsResult.rows,
      users: usersResult.rows,
      sessions: sessionsResult.rows,
      jobs: jobsResult.rows,
      activity: activityResult.rows,
      billing: billingResult.rows,
      flags: flagsResult.rows
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Update feature flag endpoint removed - using the one below

router.get('/flags', requireSuperadminRole, async (req, res) => {
  try {
    const flags = await db
      .select()
      .from(featureFlags)
      .orderBy(featureFlags.flag_name);

    res.json(flags);
  } catch (error) {
    console.error('Error fetching flags:', error);
    res.status(500).json({ error: 'Failed to fetch flags' });
  }
});

router.post('/flags', requireSuperadminRole, async (req, res) => {
  try {
    const flagData = insertSuperadminFeatureFlagSchema.parse(req.body);

    const [newFlag] = await db
      .insert(superadminFeatureFlags)
      .values(flagData)
      .returning();

    await logSuperadminAction(
      req.user!.id,
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

router.put('/flags/:id', requireSuperadminRole, async (req, res) => {
  try {
    const flagId = parseInt(req.params.id);
    const updates = req.body;

    const [updatedFlag] = await db
      .update(featureFlags)
      .set({
        ...updates,
        updated_at: new Date()
      })
      .where(eq(featureFlags.id, flagId))
      .returning();

    if (!updatedFlag) {
      return res.status(404).json({ error: 'Flag not found' });
    }

    await logSuperadminAction(
      req.user!.id,
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

// Organization-specific feature flag overrides
router.get('/organizations/:orgId/flags', requireSuperadminRole, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);

    // Get all global flags and organization-specific overrides
    const globalFlags = await db
      .select()
      .from(superadminFeatureFlags)
      .orderBy(superadminFeatureFlags.flag_name);

    const orgOverrides = await db
      .select()
      .from(organizationFeatureFlags)
      .where(eq(organizationFeatureFlags.organization_id, orgId));

    // Merge global flags with organization overrides
    const overrideMap = new Map(orgOverrides.map(override => [override.flag_name, override.enabled]));
    
    const flagsWithOverrides = globalFlags.map(flag => ({
      ...flag,
      organization_override: overrideMap.has(flag.flag_name),
      organization_enabled: overrideMap.get(flag.flag_name) ?? flag.default_value,
      effective_value: overrideMap.get(flag.flag_name) ?? flag.default_value
    }));

    res.json(flagsWithOverrides);
  } catch (error) {
    console.error('Error fetching organization flags:', error);
    res.status(500).json({ error: 'Failed to fetch organization flags' });
  }
});

router.post('/organizations/:orgId/flags/:flagName', requireSuperadminRole, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const flagName = req.params.flagName;
    const { enabled } = req.body;

    // Check if override already exists
    const [existingOverride] = await db
      .select()
      .from(organizationFeatureFlags)
      .where(
        and(
          eq(organizationFeatureFlags.organization_id, orgId),
          eq(organizationFeatureFlags.flag_name, flagName)
        )
      );

    let result;
    if (existingOverride) {
      // Update existing override
      [result] = await db
        .update(organizationFeatureFlags)
        .set({ enabled })
        .where(eq(organizationFeatureFlags.id, existingOverride.id))
        .returning();
    } else {
      // Create new override
      [result] = await db
        .insert(organizationFeatureFlags)
        .values({
          organization_id: orgId,
          flag_name: flagName,
          enabled
        })
        .returning();
    }

    // Get organization name for audit log
    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, orgId));

    await logSuperadminAction(
      req.user!.id,
      'SET_ORG_FEATURE_FLAG',
      'organization',
      orgId,
      {
        flag_name: flagName,
        enabled,
        organization_name: org?.name,
        action: existingOverride ? 'updated' : 'created'
      }
    );

    res.json(result);
  } catch (error) {
    console.error('Error setting organization flag:', error);
    res.status(500).json({ error: 'Failed to set organization flag' });
  }
});

router.delete('/organizations/:orgId/flags/:flagName', requireSuperadminRole, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const flagName = req.params.flagName;

    // Delete the override (reverts to global default)
    const deleted = await db
      .delete(organizationFeatureFlags)
      .where(
        and(
          eq(organizationFeatureFlags.organization_id, orgId),
          eq(organizationFeatureFlags.flag_name, flagName)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Organization flag override not found' });
    }

    // Get organization name for audit log
    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, orgId));

    await logSuperadminAction(
      req.user!.id,
      'REMOVE_ORG_FEATURE_FLAG',
      'organization',
      orgId,
      {
        flag_name: flagName,
        organization_name: org?.name
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing organization flag:', error);
    res.status(500).json({ error: 'Failed to remove organization flag' });
  }
});

// Bulk feature flag operations
router.post('/flags/bulk-update', requireSuperadminRole, async (req, res) => {
  try {
    const { updates } = req.body; // Array of { flagId, enabled }

    const results = [];
    for (const update of updates) {
      const [updatedFlag] = await db
        .update(superadminFeatureFlags)
        .set({ 
          default_value: update.enabled,
          updated_at: new Date()
        })
        .where(eq(superadminFeatureFlags.id, update.flagId))
        .returning();
      
      if (updatedFlag) {
        results.push(updatedFlag);
      }
    }

    await logSuperadminAction(
      req.user!.id,
      'BULK_UPDATE_FEATURE_FLAGS',
      'feature_flag',
      0,
      { updated_count: results.length, updates }
    );

    res.json({ success: true, updated: results });
  } catch (error) {
    console.error('Error bulk updating flags:', error);
    res.status(500).json({ error: 'Failed to bulk update flags' });
  }
});

// Create new feature flag
router.post('/flags', requireSuperadminRole, async (req, res) => {
  try {
    const { flag_name, description, default_value } = req.body;

    // Check if flag already exists
    const [existingFlag] = await db
      .select()
      .from(superadminFeatureFlags)
      .where(eq(superadminFeatureFlags.flag_name, flag_name));

    if (existingFlag) {
      return res.status(400).json({ error: 'Feature flag with this name already exists' });
    }

    const [newFlag] = await db
      .insert(superadminFeatureFlags)
      .values({
        flag_name,
        description,
        default_value: default_value || false
      })
      .returning();

    await logSuperadminAction(
      req.user!.id,
      'CREATE_FEATURE_FLAG',
      'feature_flag',
      newFlag.id,
      { flag_name, description, default_value }
    );

    res.status(201).json(newFlag);
  } catch (error) {
    console.error('Error creating flag:', error);
    res.status(500).json({ error: 'Failed to create flag' });
  }
});

// Delete feature flag
router.delete('/flags/:id', requireSuperadminRole, async (req, res) => {
  try {
    const flagId = parseInt(req.params.id);

    // Get flag info before deletion
    const [flag] = await db
      .select()
      .from(superadminFeatureFlags)
      .where(eq(superadminFeatureFlags.id, flagId));

    if (!flag) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    // Delete organization overrides first
    await db
      .delete(organizationFeatureFlags)
      .where(eq(organizationFeatureFlags.flag_name, flag.flag_name));

    // Delete the flag
    await db
      .delete(superadminFeatureFlags)
      .where(eq(superadminFeatureFlags.id, flagId));

    await logSuperadminAction(
      req.user!.id,
      'DELETE_FEATURE_FLAG',
      'feature_flag',
      flagId,
      { flag_name: flag.flag_name }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting flag:', error);
    res.status(500).json({ error: 'Failed to delete flag' });
  }
});

// Organization-specific feature flag management
router.get('/organizations/:id/feature-flags', requireSuperadminRole, async (req, res) => {
  try {
    const orgId = parseInt(req.params.id);
    
    const overrides = await db.execute(`
      SELECT off.*, ff.flag_name, ff.description
      FROM organization_feature_flags off
      JOIN feature_flags ff ON off.feature_flag_id = ff.id
      WHERE off.organization_id = ${orgId}
      ORDER BY ff.flag_name
    `);

    res.json(overrides.rows);
  } catch (error) {
    console.error('Error fetching org feature flags:', error);
    res.status(500).json({ error: 'Failed to fetch organization feature flags' });
  }
});

// Set organization feature flag override
router.put('/organizations/:id/feature-flags/:flagId', requireSuperadminRole, async (req, res) => {
  try {
    const orgId = parseInt(req.params.id);
    const flagId = parseInt(req.params.flagId);
    const { enabled } = req.body;

    // Check if override exists
    const existing = await db.execute(`
      SELECT * FROM organization_feature_flags 
      WHERE organization_id = ${orgId} AND feature_flag_id = ${flagId}
    `);

    let result;
    if (existing.rows.length > 0) {
      // Update existing override
      result = await db.execute(`
        UPDATE organization_feature_flags 
        SET enabled = ${enabled}, updated_at = NOW()
        WHERE organization_id = ${orgId} AND feature_flag_id = ${flagId}
        RETURNING *
      `);
    } else {
      // Create new override
      result = await db.execute(`
        INSERT INTO organization_feature_flags (organization_id, feature_flag_id, enabled)
        VALUES (${orgId}, ${flagId}, ${enabled})
        RETURNING *
      `);
    }

    await logSuperadminAction(
      req.user!.id,
      'SET_ORG_FEATURE_FLAG',
      'organization',
      orgId,
      { flag_id: flagId, enabled }
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error setting org feature flag:', error);
    res.status(500).json({ error: 'Failed to set organization feature flag' });
  }
});

// Remove organization feature flag override
router.delete('/organizations/:id/feature-flags/:flagId', requireSuperadminRole, async (req, res) => {
  try {
    const orgId = parseInt(req.params.id);
    const flagId = parseInt(req.params.flagId);

    await db.execute(`
      DELETE FROM organization_feature_flags 
      WHERE organization_id = ${orgId} AND feature_flag_id = ${flagId}
    `);

    await logSuperadminAction(
      req.user!.id,
      'REMOVE_ORG_FEATURE_FLAG',
      'organization',
      orgId,
      { flag_id: flagId }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing org feature flag:', error);
    res.status(500).json({ error: 'Failed to remove organization feature flag' });
  }
});

// Feature Flag A/B Testing endpoints
router.get('/flags/:id/experiments', requireSuperadminRole, async (req, res) => {
  try {
    const flagId = parseInt(req.params.id);
    
    // Get experiment data
    const flag = await db.execute(sql`
      SELECT 
        id, flag_name, description, is_experiment, experiment_config,
        variant_distribution, experiment_start_date, experiment_end_date,
        success_metrics, experiment_status, winner_variant
      FROM feature_flags
      WHERE id = ${flagId}
    `);

    if (flag.rows.length === 0) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    // Get metrics
    const metrics = await db.execute(sql`
      SELECT 
        variant, metric_date, exposures, conversions, errors, performance_impact
      FROM feature_flag_metrics
      WHERE feature_flag_id = ${flagId}
      ORDER BY metric_date DESC, variant
    `);

    // Get recent events
    const events = await db.execute(sql`
      SELECT 
        e.id, e.event_type, e.variant, e.event_data, e.created_at,
        u.email as user_email, o.name as organization_name
      FROM feature_flag_events e
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN organizations o ON e.organization_id = o.id
      WHERE e.feature_flag_id = ${flagId}
      ORDER BY e.created_at DESC
      LIMIT 100
    `);

    res.json({
      flag: flag.rows[0],
      metrics: metrics.rows,
      events: events.rows
    });
  } catch (error) {
    console.error('Error fetching feature flag experiment:', error);
    res.status(500).json({ error: 'Failed to fetch experiment data' });
  }
});

router.put('/flags/:id/experiment', requireSuperadminRole, async (req, res) => {
  try {
    const flagId = parseInt(req.params.id);
    const {
      is_experiment,
      experiment_config,
      variant_distribution,
      experiment_start_date,
      experiment_end_date,
      success_metrics,
      experiment_status
    } = req.body;

    await db.execute(sql`
      UPDATE feature_flags
      SET 
        is_experiment = ${is_experiment},
        experiment_config = ${JSON.stringify(experiment_config || null)},
        variant_distribution = ${JSON.stringify(variant_distribution || null)},
        experiment_start_date = ${experiment_start_date || null},
        experiment_end_date = ${experiment_end_date || null},
        success_metrics = ${JSON.stringify(success_metrics || null)},
        experiment_status = ${experiment_status || 'inactive'},
        updated_at = NOW()
      WHERE id = ${flagId}
    `);

    await logSuperadminAction(
      req.user!.id,
      'UPDATE_FLAG_EXPERIMENT',
      'feature_flag',
      flagId,
      { is_experiment, experiment_status }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating feature flag experiment:', error);
    res.status(500).json({ error: 'Failed to update experiment' });
  }
});

router.post('/flags/:id/experiment/end', requireSuperadminRole, async (req, res) => {
  try {
    const flagId = parseInt(req.params.id);
    const { winner_variant, apply_winner } = req.body;

    // End the experiment
    await db.execute(sql`
      UPDATE feature_flags
      SET 
        experiment_status = 'completed',
        experiment_end_date = NOW(),
        winner_variant = ${winner_variant || null},
        updated_at = NOW()
      WHERE id = ${flagId}
    `);

    // If apply_winner is true, update the default value based on the winner
    if (apply_winner && winner_variant) {
      const shouldEnable = winner_variant !== 'control';
      await db.execute(sql`
        UPDATE feature_flags
        SET default_value = ${shouldEnable}
        WHERE id = ${flagId}
      `);
    }

    await logSuperadminAction(
      req.user!.id,
      'END_FLAG_EXPERIMENT',
      'feature_flag',
      flagId,
      { winner_variant, apply_winner }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error ending feature flag experiment:', error);
    res.status(500).json({ error: 'Failed to end experiment' });
  }
});

router.get('/flags/:id/experiment/analytics', requireSuperadminRole, async (req, res) => {
  try {
    const flagId = parseInt(req.params.id);
    const { period = '7d' } = req.query;

    let interval = '7 days';
    if (period === '1d') interval = '1 day';
    else if (period === '30d') interval = '30 days';

    // Get aggregated metrics by variant
    const variantMetrics = await db.execute(sql`
      SELECT 
        variant,
        SUM(exposures) as total_exposures,
        SUM(errors) as total_errors,
        jsonb_agg(conversions) as all_conversions,
        AVG(exposures) as avg_daily_exposures
      FROM feature_flag_metrics
      WHERE feature_flag_id = ${flagId}
        AND metric_date >= CURRENT_DATE - INTERVAL ${interval}
      GROUP BY variant
    `);

    // Get time series data
    const timeSeries = await db.execute(sql`
      SELECT 
        metric_date,
        variant,
        exposures,
        conversions,
        errors
      FROM feature_flag_metrics
      WHERE feature_flag_id = ${flagId}
        AND metric_date >= CURRENT_DATE - INTERVAL ${interval}
      ORDER BY metric_date, variant
    `);

    // Calculate conversion rates and statistical significance
    const analytics = variantMetrics.rows.map(vm => {
      const conversions = (vm.all_conversions as any[])?.reduce((acc: any, curr: any) => {
        Object.keys(curr || {}).forEach(key => {
          acc[key] = (acc[key] || 0) + (curr[key] || 0);
        });
        return acc;
      }, {}) || {};

      return {
        variant: vm.variant,
        totalExposures: vm.total_exposures as number,
        totalErrors: vm.total_errors as number,
        errorRate: (vm.total_exposures as number) > 0 ? ((vm.total_errors as number) / (vm.total_exposures as number)) * 100 : 0,
        conversions,
        avgDailyExposures: vm.avg_daily_exposures
      };
    });

    res.json({
      analytics,
      timeSeries: timeSeries.rows
    });
  } catch (error) {
    console.error('Error fetching experiment analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// System Settings endpoints
router.get('/settings', requireSuperadminRole, async (req, res) => {
  try {
    // Get category filter from query params
    const { category } = req.query;
    
    let query = `
      SELECT 
        id,
        setting_key,
        setting_value,
        setting_type,
        category,
        description,
        is_sensitive,
        updated_at
      FROM system_settings
    `;
    
    if (category) {
      query += ` WHERE category = '${category}'`;
    }
    
    query += ` ORDER BY category, setting_key`;
    
    const result = await db.execute(sql.raw(query));
    const settings = result.rows || [];
    
    // Mask sensitive values for frontend
    const maskedSettings = settings.map((setting: any) => ({
      ...setting,
      setting_value: setting.is_sensitive && setting.setting_value 
        ? '********' 
        : setting.setting_value
    }));
    
    res.json(maskedSettings);
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

// Get settings categories
router.get('/settings/categories', requireSuperadminRole, async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT DISTINCT category, COUNT(*) as count
      FROM system_settings
      GROUP BY category
      ORDER BY category
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching settings categories:', error);
    res.status(500).json({ error: 'Failed to fetch settings categories' });
  }
});

// Update a system setting
router.put('/settings/:key', requireSuperadminRole, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    // Get the setting to check if it exists and is sensitive
    const existingResult = await db.execute(sql`
      SELECT * FROM system_settings WHERE setting_key = ${key}
    `);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    const setting = existingResult.rows[0];
    
    // Update the setting
    await db.execute(sql`
      UPDATE system_settings 
      SET 
        setting_value = ${value},
        updated_at = NOW(),
        updated_by = ${req.user!.id}
      WHERE setting_key = ${key}
    `);
    
    // Log the action (don't log sensitive values)
    await logSuperadminAction(
      req.user!.id,
      'UPDATE_SYSTEM_SETTING',
      'system_setting',
      setting.id as number,
      { 
        setting_key: key, 
        is_sensitive: setting.is_sensitive,
        old_value: setting.is_sensitive ? '[REDACTED]' : setting.setting_value,
        new_value: setting.is_sensitive ? '[REDACTED]' : value
      }
    );
    
    res.json({ success: true, message: `Setting ${key} updated successfully` });
  } catch (error) {
    console.error('Error updating system setting:', error);
    res.status(500).json({ error: 'Failed to update system setting' });
  }
});

// Bulk update settings
router.put('/settings', requireSuperadminRole, async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!Array.isArray(settings)) {
      return res.status(400).json({ error: 'Settings must be an array' });
    }
    
    // Update each setting
    for (const { key, value } of settings) {
      await db.execute(sql`
        UPDATE system_settings 
        SET 
          setting_value = ${value},
          updated_at = NOW(),
          updated_by = ${req.user!.id}
        WHERE setting_key = ${key}
      `);
    }
    
    await logSuperadminAction(
      req.user!.id,
      'BULK_UPDATE_SYSTEM_SETTINGS',
      'system_settings',
      0,
      { count: settings.length }
    );
    
    res.json({ success: true, message: `Updated ${settings.length} settings` });
  } catch (error) {
    console.error('Error bulk updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Revenue Dashboard endpoints
router.get('/revenue/overview', requireSuperadminRole, async (req, res) => {
  try {
    // Get current MRR and growth
    const currentMetrics = await db.execute(sql`
      SELECT * FROM revenue_metrics 
      ORDER BY date DESC 
      LIMIT 1
    `);
    
    // Get 30-day metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const historicalMetrics = await db.execute(sql`
      SELECT 
        date,
        mrr,
        new_mrr,
        churned_mrr,
        total_customers,
        churn_rate
      FROM revenue_metrics 
      WHERE date >= ${thirtyDaysAgo.toISOString().split('T')[0]}
      ORDER BY date ASC
    `);
    
    // Get recent subscription events
    const recentEvents = await db.execute(sql`
      SELECT 
        se.*,
        o.name as organization_name
      FROM subscription_events se
      LEFT JOIN organizations o ON se.organization_id = o.id
      ORDER BY se.occurred_at DESC
      LIMIT 10
    `);
    
    // Get payment failures
    const paymentFailures = await db.execute(sql`
      SELECT 
        COUNT(*) as total_failures,
        SUM(amount) as failed_amount,
        COUNT(DISTINCT organization_id) as affected_orgs
      FROM payment_failures
      WHERE resolved_at IS NULL
    `);
    
    // Calculate summary stats
    const current = currentMetrics.rows[0] || {};
    const firstDay = historicalMetrics.rows[0] || {};
    const mrrGrowth = current.mrr && firstDay.mrr ? 
      ((Number(current.mrr) - Number(firstDay.mrr)) / Number(firstDay.mrr) * 100).toFixed(2) : '0';
    
    res.json({
      current: {
        mrr: current.mrr || 0,
        arr: current.arr || 0,
        totalCustomers: current.total_customers || 0,
        averageRevenuePerUser: current.average_revenue_per_user || 0,
        churnRate: current.churn_rate || 0,
        growthRate: mrrGrowth
      },
      chart: historicalMetrics.rows,
      recentEvents: recentEvents.rows,
      paymentFailures: paymentFailures.rows[0] || {
        total_failures: 0,
        failed_amount: 0,
        affected_orgs: 0
      }
    });
  } catch (error) {
    console.error('Error fetching revenue overview:', error);
    res.status(500).json({ error: 'Failed to fetch revenue overview' });
  }
});

// Get detailed revenue metrics
router.get('/revenue/metrics', requireSuperadminRole, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    
    const metrics = await db.execute(sql`
      SELECT * FROM revenue_metrics
      WHERE date >= ${startDate.toISOString().split('T')[0]}
      ORDER BY date DESC
    `);
    
    res.json(metrics.rows);
  } catch (error) {
    console.error('Error fetching revenue metrics:', error);
    res.status(500).json({ error: 'Failed to fetch revenue metrics' });
  }
});

// Get customer health scores
router.get('/revenue/health-scores', requireSuperadminRole, async (req, res) => {
  try {
    const healthScores = await db.execute(sql`
      SELECT 
        chs.*,
        o.name as organization_name,
        o.plan,
        o.seats_used,
        o.seats_limit
      FROM customer_health_scores chs
      JOIN organizations o ON chs.organization_id = o.id
      ORDER BY chs.health_score ASC
      LIMIT 20
    `);
    
    res.json(healthScores.rows);
  } catch (error) {
    console.error('Error fetching health scores:', error);
    res.status(500).json({ error: 'Failed to fetch health scores' });
  }
});

// Get revenue forecasts
router.get('/revenue/forecasts', requireSuperadminRole, async (req, res) => {
  try {
    const forecasts = await db.execute(sql`
      SELECT * FROM revenue_forecasts
      WHERE forecast_date >= CURRENT_DATE
      ORDER BY forecast_date ASC
      LIMIT 12
    `);
    
    res.json(forecasts.rows);
  } catch (error) {
    console.error('Error fetching revenue forecasts:', error);
    res.status(500).json({ error: 'Failed to fetch revenue forecasts' });
  }
});

// Update customer health score
router.post('/revenue/health-score/:orgId', requireSuperadminRole, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { healthScore, factors } = req.body;
    
    await db.execute(sql`
      INSERT INTO customer_health_scores (organization_id, health_score, factors, last_calculated_at)
      VALUES (${orgId}, ${healthScore}, ${JSON.stringify(factors)}, NOW())
      ON CONFLICT (organization_id) 
      DO UPDATE SET 
        health_score = ${healthScore},
        factors = ${JSON.stringify(factors)},
        last_calculated_at = NOW()
    `);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating health score:', error);
    res.status(500).json({ error: 'Failed to update health score' });
  }
});

// System Health Monitoring endpoints
router.get('/monitoring/overview', requireSuperadminRole, async (req, res) => {
  try {
    // Get current system metrics
    const systemMetrics = await db.execute(sql`
      SELECT 
        metric_name,
        AVG(metric_value) as avg_value,
        MAX(metric_value) as max_value,
        MIN(metric_value) as min_value
      FROM system_metrics
      WHERE timestamp > NOW() - INTERVAL '1 hour'
      GROUP BY metric_name
    `);

    // Get API performance
    const apiPerformance = await db.execute(sql`
      SELECT 
        endpoint,
        method,
        COUNT(*) as request_count,
        AVG(response_time_ms) as avg_response_time,
        MAX(response_time_ms) as max_response_time,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
        ROUND(100.0 * SUM(CASE WHEN status_code < 400 THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
      FROM api_metrics
      WHERE timestamp > NOW() - INTERVAL '1 hour'
      GROUP BY endpoint, method
      ORDER BY request_count DESC
      LIMIT 10
    `);

    // Get service health
    const serviceHealth = await db.execute(sql`
      SELECT * FROM service_health
      ORDER BY service_name
    `);

    // Get recent errors
    const recentErrors = await db.execute(sql`
      SELECT * FROM error_logs
      WHERE timestamp > NOW() - INTERVAL '24 hours'
      ORDER BY timestamp DESC
      LIMIT 10
    `);

    // Get database metrics
    const dbMetrics = await db.execute(sql`
      SELECT * FROM database_metrics
      WHERE timestamp > NOW() - INTERVAL '1 hour'
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    // Calculate system health score
    const healthScore = calculateHealthScore(systemMetrics.rows, apiPerformance.rows, serviceHealth.rows);

    res.json({
      healthScore,
      systemMetrics: systemMetrics.rows,
      apiPerformance: apiPerformance.rows,
      serviceHealth: serviceHealth.rows,
      recentErrors: recentErrors.rows,
      databaseMetrics: dbMetrics.rows[0] || {}
    });
  } catch (error) {
    console.error('Error fetching monitoring overview:', error);
    res.status(500).json({ error: 'Failed to fetch monitoring overview' });
  }
});

// Get detailed metrics for charts
router.get('/monitoring/metrics', requireSuperadminRole, async (req, res) => {
  try {
    const { period = '24h', type = 'system' } = req.query;
    
    let interval = '24 hours';
    if (period === '1h') interval = '1 hour';
    else if (period === '7d') interval = '7 days';
    
    if (type === 'system') {
      const metrics = await db.execute(sql`
        SELECT 
          DATE_TRUNC('hour', timestamp) as hour,
          metric_name,
          AVG(metric_value) as value
        FROM system_metrics
        WHERE timestamp > NOW() - INTERVAL ${interval}
        GROUP BY hour, metric_name
        ORDER BY hour ASC
      `);
      res.json(metrics.rows);
    } else if (type === 'api') {
      const metrics = await db.execute(sql`
        SELECT 
          DATE_TRUNC('hour', timestamp) as hour,
          COUNT(*) as requests,
          AVG(response_time_ms) as avg_response_time,
          SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors
        FROM api_metrics
        WHERE timestamp > NOW() - INTERVAL ${interval}
        GROUP BY hour
        ORDER BY hour ASC
      `);
      res.json(metrics.rows);
    } else if (type === 'database') {
      const metrics = await db.execute(sql`
        SELECT * FROM database_metrics
        WHERE timestamp > NOW() - INTERVAL ${interval}
        ORDER BY timestamp ASC
      `);
      res.json(metrics.rows);
    }
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Update service health status
router.post('/monitoring/service-health/:service', requireSuperadminRole, async (req, res) => {
  try {
    const { service } = req.params;
    const { status, responseTime, error } = req.body;
    
    await db.execute(sql`
      UPDATE service_health
      SET 
        status = ${status},
        last_check = NOW(),
        response_time_ms = ${responseTime},
        error_count = CASE 
          WHEN ${status} = 'operational' THEN 0 
          ELSE error_count + 1 
        END,
        metadata = ${JSON.stringify({ lastError: error })}
      WHERE service_name = ${service}
    `);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating service health:', error);
    res.status(500).json({ error: 'Failed to update service health' });
  }
});

// Log error
router.post('/monitoring/error', requireSuperadminRole, async (req, res) => {
  try {
    const { errorType, errorMessage, stackTrace, userId, endpoint, severity } = req.body;
    
    await db.execute(sql`
      INSERT INTO error_logs (error_type, error_message, stack_trace, user_id, endpoint, severity)
      VALUES (${errorType}, ${errorMessage}, ${stackTrace}, ${userId}, ${endpoint}, ${severity})
    `);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging error:', error);
    res.status(500).json({ error: 'Failed to log error' });
  }
});

// Helper function to calculate health score
function calculateHealthScore(systemMetrics: any[], apiPerformance: any[], serviceHealth: any[]): number {
  let score = 100;
  
  // Deduct points for high resource usage
  systemMetrics.forEach(metric => {
    if (metric.metric_name === 'cpu_usage_percent' && metric.avg_value > 80) {
      score -= 20;
    }
    if (metric.metric_name === 'memory_usage_percent' && metric.avg_value > 85) {
      score -= 15;
    }
  });
  
  // Deduct points for API errors
  apiPerformance.forEach(api => {
    if (api.success_rate < 99) {
      score -= (100 - api.success_rate) * 2;
    }
  });
  
  // Deduct points for unhealthy services
  serviceHealth.forEach(service => {
    if (service.status !== 'operational') {
      score -= 10;
    }
  });
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ============================================
// AUDIT TRAIL ENDPOINTS
// ============================================

// Get audit logs with filtering
router.get('/audit/logs', requireSuperadminRole, async (req, res) => {
  try {
    const { 
      action_type, 
      action_category, 
      user_id, 
      resource_type,
      start_date,
      end_date,
      limit = 100,
      offset = 0
    } = req.query;

    let query = sql`
      SELECT 
        al.*,
        u.username,
        u.email,
        o.name as organization_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN organizations o ON al.organization_id = o.id
      WHERE 1=1
    `;

    const conditions = [];
    
    if (action_type) {
      conditions.push(sql`AND al.action_type = ${action_type}`);
    }
    
    if (action_category) {
      conditions.push(sql`AND al.action_category = ${action_category}`);
    }
    
    if (user_id) {
      conditions.push(sql`AND al.user_id = ${user_id}`);
    }
    
    if (resource_type) {
      conditions.push(sql`AND al.resource_type = ${resource_type}`);
    }
    
    if (start_date) {
      conditions.push(sql`AND al.timestamp >= ${start_date}`);
    }
    
    if (end_date) {
      conditions.push(sql`AND al.timestamp <= ${end_date}`);
    }

    // Build final query
    const baseQuery = await db.execute(sql`
      SELECT 
        al.*,
        u.username,
        u.email,
        o.name as organization_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN organizations o ON al.organization_id = o.id
      WHERE 1=1
      ${action_type ? sql`AND al.action_type = ${action_type}` : sql``}
      ${action_category ? sql`AND al.action_category = ${action_category}` : sql``}
      ${user_id ? sql`AND al.user_id = ${user_id}` : sql``}
      ${resource_type ? sql`AND al.resource_type = ${resource_type}` : sql``}
      ${start_date ? sql`AND al.timestamp >= ${start_date}` : sql``}
      ${end_date ? sql`AND al.timestamp <= ${end_date}` : sql``}
      ORDER BY al.timestamp DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    // Get total count
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM audit_logs al
      WHERE 1=1
      ${action_type ? sql`AND al.action_type = ${action_type}` : sql``}
      ${action_category ? sql`AND al.action_category = ${action_category}` : sql``}
      ${user_id ? sql`AND al.user_id = ${user_id}` : sql``}
      ${resource_type ? sql`AND al.resource_type = ${resource_type}` : sql``}
      ${start_date ? sql`AND al.timestamp >= ${start_date}` : sql``}
      ${end_date ? sql`AND al.timestamp <= ${end_date}` : sql``}
    `);

    res.json({
      logs: baseQuery.rows,
      total: countResult.rows[0].count,
      limit,
      offset
    });
  } catch (error) {
    logger.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get admin actions
router.get('/audit/admin-actions', requireSuperadminRole, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const actions = await db.execute(sql`
      SELECT 
        aa.*,
        u.username as admin_username,
        u.email as admin_email
      FROM admin_actions aa
      LEFT JOIN users u ON aa.admin_id = u.id
      ORDER BY aa.timestamp DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM admin_actions
    `);

    res.json({
      actions: actions.rows,
      total: countResult.rows[0].count,
      limit,
      offset
    });
  } catch (error) {
    logger.error('Error fetching admin actions:', error);
    res.status(500).json({ error: 'Failed to fetch admin actions' });
  }
});

// Get security events
router.get('/audit/security-events', requireSuperadminRole, async (req, res) => {
  try {
    const { severity, resolved, limit = 50, offset = 0 } = req.query;

    let query = sql`
      SELECT 
        se.*,
        u.username,
        u.email,
        resolver.username as resolved_by_username
      FROM security_events se
      LEFT JOIN users u ON se.user_id = u.id
      LEFT JOIN users resolver ON se.resolved_by = resolver.id
      WHERE 1=1
    `;

    const events = await db.execute(sql`
      SELECT 
        se.*,
        u.username,
        u.email,
        resolver.username as resolved_by_username
      FROM security_events se
      LEFT JOIN users u ON se.user_id = u.id
      LEFT JOIN users resolver ON se.resolved_by = resolver.id
      WHERE 1=1
      ${severity ? sql`AND se.severity = ${severity}` : sql``}
      ${resolved !== undefined ? sql`AND se.resolved = ${resolved === 'true'}` : sql``}
      ORDER BY se.timestamp DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM security_events se
      WHERE 1=1
      ${severity ? sql`AND se.severity = ${severity}` : sql``}
      ${resolved !== undefined ? sql`AND se.resolved = ${resolved === 'true'}` : sql``}
    `);

    res.json({
      events: events.rows,
      total: countResult.rows[0].count,
      limit,
      offset
    });
  } catch (error) {
    logger.error('Error fetching security events:', error);
    res.status(500).json({ error: 'Failed to fetch security events' });
  }
});

// Get audit statistics
router.get('/audit/stats', requireSuperadminRole, async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Action categories breakdown
    const categoriesResult = await db.execute(sql`
      SELECT 
        action_category,
        COUNT(*) as count
      FROM audit_logs
      WHERE timestamp >= ${oneWeekAgo}
      GROUP BY action_category
      ORDER BY count DESC
    `);

    // Top active users
    const activeUsersResult = await db.execute(sql`
      SELECT 
        u.id,
        u.username,
        u.email,
        COUNT(al.id) as action_count
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      WHERE al.timestamp >= ${oneWeekAgo}
      GROUP BY u.id, u.username, u.email
      ORDER BY action_count DESC
      LIMIT 10
    `);

    // Security events by severity
    const securityStatsResult = await db.execute(sql`
      SELECT 
        severity,
        COUNT(*) as count,
        SUM(CASE WHEN resolved = false THEN 1 ELSE 0 END) as unresolved_count
      FROM security_events
      WHERE timestamp >= ${oneWeekAgo}
      GROUP BY severity
    `);

    // Recent activity trend (last 7 days)
    const trendResult = await db.execute(sql`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as action_count
      FROM audit_logs
      WHERE timestamp >= ${oneWeekAgo}
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `);

    // Admin actions summary
    const adminActionsResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total_actions,
        COUNT(DISTINCT admin_id) as active_admins,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_actions
      FROM admin_actions
      WHERE timestamp >= ${oneDayAgo}
    `);

    res.json({
      categories: categoriesResult.rows,
      activeUsers: activeUsersResult.rows,
      securityStats: securityStatsResult.rows,
      trend: trendResult.rows,
      adminActions: adminActionsResult.rows[0] || {
        total_actions: 0,
        active_admins: 0,
        critical_actions: 0
      }
    });
  } catch (error) {
    logger.error('Error fetching audit statistics:', error);
    res.status(500).json({ error: 'Failed to fetch audit statistics' });
  }
});

// Export audit logs as CSV
router.get('/audit/export', requireSuperadminRole, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const logs = await db.execute(sql`
      SELECT 
        al.timestamp,
        al.action_type,
        al.action_category,
        u.username,
        u.email,
        o.name as organization_name,
        al.resource_type,
        al.resource_name,
        al.ip_address
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN organizations o ON al.organization_id = o.id
      WHERE 1=1
      ${start_date ? sql`AND al.timestamp >= ${start_date}` : sql``}
      ${end_date ? sql`AND al.timestamp <= ${end_date}` : sql``}
      ORDER BY al.timestamp DESC
    `);

    // Convert to CSV
    const headers = [
      'Timestamp',
      'Action Type',
      'Category',
      'Username',
      'Email',
      'Organization',
      'Resource Type',
      'Resource Name',
      'IP Address'
    ];

    const csvRows = [headers.join(',')];
    
    logs.rows.forEach(log => {
      const row = [
        log.timestamp,
        log.action_type,
        log.action_category,
        log.username || '',
        log.email || '',
        log.organization_name || '',
        log.resource_type || '',
        log.resource_name || '',
        log.ip_address || ''
      ];
      csvRows.push(row.map(val => `"${val}"`).join(','));
    });

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    logger.error('Error exporting audit logs:', error);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

// Mark security event as resolved
router.put('/audit/security-events/:id/resolve', requireSuperadminRole, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    await db.execute(sql`
      UPDATE security_events
      SET 
        resolved = true,
        resolved_by = ${userId},
        resolved_at = NOW()
      WHERE id = ${id}
    `);

    res.json({ message: 'Security event resolved' });
  } catch (error) {
    logger.error('Error resolving security event:', error);
    res.status(500).json({ error: 'Failed to resolve security event' });
  }
});

// ============================================
// CUSTOMER SUPPORT ENDPOINTS
// ============================================

// Start user impersonation session
router.post('/support/impersonate', requireSuperadminRole, async (req, res) => {
  try {
    const { target_user_id, reason } = req.body;
    const adminId = req.user?.id;

    if (!target_user_id || !reason) {
      return res.status(400).json({ error: 'Target user ID and reason are required' });
    }

    // Check if target user exists
    const targetUser = await db.execute(sql`
      SELECT id, email, role FROM users WHERE id = ${target_user_id}
    `);

    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    // Prevent impersonating other superadmins
    if (targetUser.rows[0].role === 'superadmin') {
      return res.status(403).json({ error: 'Cannot impersonate other superadmins' });
    }

    // End any active impersonation sessions for this admin
    await db.execute(sql`
      UPDATE impersonation_sessions
      SET is_active = false, ended_at = NOW()
      WHERE admin_id = ${adminId} AND is_active = true
    `);

    // Create new impersonation session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    await db.execute(sql`
      INSERT INTO impersonation_sessions (
        admin_id, target_user_id, reason, ip_address, session_token
      ) VALUES (
        ${adminId},
        ${target_user_id},
        ${reason},
        ${req.ip},
        ${sessionToken}
      )
    `);

    // Log the impersonation in audit trail
    await db.execute(sql`
      INSERT INTO admin_actions (
        admin_id, action, target_type, target_id, severity, ip_address
      ) VALUES (
        ${adminId},
        'user.impersonate',
        'user',
        ${target_user_id},
        'warning',
        ${req.ip}
      )
    `);

    res.json({
      sessionToken,
      targetUser: {
        id: targetUser.rows[0].id,
        email: targetUser.rows[0].email,
        role: targetUser.rows[0].role
      }
    });
  } catch (error) {
    logger.error('Error starting impersonation:', error);
    res.status(500).json({ error: 'Failed to start impersonation session' });
  }
});

// End impersonation session
router.post('/support/end-impersonation', requireSuperadminRole, async (req, res) => {
  try {
    const adminId = req.user?.id;

    await db.execute(sql`
      UPDATE impersonation_sessions
      SET is_active = false, ended_at = NOW()
      WHERE admin_id = ${adminId} AND is_active = true
    `);

    res.json({ message: 'Impersonation session ended' });
  } catch (error) {
    logger.error('Error ending impersonation:', error);
    res.status(500).json({ error: 'Failed to end impersonation session' });
  }
});

// Get support tickets
router.get('/support/tickets', requireSuperadminRole, async (req, res) => {
  try {
    const { status, priority, limit = 50, offset = 0 } = req.query;

    const tickets = await db.execute(sql`
      SELECT 
        t.*,
        u.email as user_email,
        u.username,
        o.name as organization_name,
        assignee.email as assigned_to_email,
        (SELECT COUNT(*) FROM support_messages WHERE ticket_id = t.id) as message_count
      FROM support_tickets t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN organizations o ON t.organization_id = o.id
      LEFT JOIN users assignee ON t.assigned_to = assignee.id
      WHERE 1=1
      ${status ? sql`AND t.status = ${status}` : sql``}
      ${priority ? sql`AND t.priority = ${priority}` : sql``}
      ORDER BY 
        CASE t.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        t.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM support_tickets t
      WHERE 1=1
      ${status ? sql`AND t.status = ${status}` : sql``}
      ${priority ? sql`AND t.priority = ${priority}` : sql``}
    `);

    res.json({
      tickets: tickets.rows,
      total: countResult.rows[0].count,
      limit,
      offset
    });
  } catch (error) {
    logger.error('Error fetching support tickets:', error);
    res.status(500).json({ error: 'Failed to fetch support tickets' });
  }
});

// Get ticket messages
router.get('/support/tickets/:ticketId/messages', requireSuperadminRole, async (req, res) => {
  try {
    const { ticketId } = req.params;

    const messages = await db.execute(sql`
      SELECT 
        m.*,
        u.email as sender_email,
        u.username as sender_username,
        u.role as sender_role
      FROM support_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.ticket_id = ${ticketId}
      ORDER BY m.created_at ASC
    `);

    res.json({ messages: messages.rows });
  } catch (error) {
    logger.error('Error fetching ticket messages:', error);
    res.status(500).json({ error: 'Failed to fetch ticket messages' });
  }
});

// Send support message
router.post('/support/tickets/:ticketId/messages', requireSuperadminRole, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message, is_internal_note = false } = req.body;
    const senderId = req.user?.id;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const newMessage = await db.execute(sql`
      INSERT INTO support_messages (
        ticket_id, sender_id, message, is_internal_note
      ) VALUES (
        ${ticketId},
        ${senderId},
        ${message},
        ${is_internal_note}
      ) RETURNING *
    `);

    // Update ticket updated_at
    await db.execute(sql`
      UPDATE support_tickets
      SET updated_at = NOW()
      WHERE id = ${ticketId}
    `);

    res.json({ message: newMessage.rows[0] });
  } catch (error) {
    logger.error('Error sending support message:', error);
    res.status(500).json({ error: 'Failed to send support message' });
  }
});

// Update ticket status
router.put('/support/tickets/:ticketId', requireSuperadminRole, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, priority, assigned_to } = req.body;

    // Build update object
    const updateFields: Record<string, any> = {};
    if (status) {
      updateFields.status = status;
      if (status === 'resolved' || status === 'closed') {
        updateFields.resolved_at = sql`NOW()`;
      }
    }
    if (priority) updateFields.priority = priority;
    if (assigned_to !== undefined) updateFields.assigned_to = assigned_to;
    
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    // Always update updated_at
    updateFields.updated_at = sql`NOW()`;

    // Build dynamic update query
    const setClause = Object.entries(updateFields)
      .map(([key, value]) => {
        if (typeof value === 'object' && value.sql) {
          return `${key} = ${value.sql[0]}`;
        }
        return `${key} = '${value}'`;
      })
      .join(', ');

    await db.execute(sql.raw(`
      UPDATE support_tickets
      SET ${setClause}
      WHERE id = ${ticketId}
    `));

    res.json({ message: 'Ticket updated successfully' });
  } catch (error) {
    logger.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// Get canned responses
router.get('/support/canned-responses', requireSuperadminRole, async (req, res) => {
  try {
    const responses = await db.execute(sql`
      SELECT * FROM canned_responses
      ORDER BY usage_count DESC, title ASC
    `);

    res.json({ responses: responses.rows });
  } catch (error) {
    logger.error('Error fetching canned responses:', error);
    res.status(500).json({ error: 'Failed to fetch canned responses' });
  }
});

// Get support metrics
router.get('/support/metrics', requireSuperadminRole, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get metrics over time
    const metricsOverTime = await db.execute(sql`
      SELECT * FROM support_metrics
      WHERE date >= ${thirtyDaysAgo.toISOString().split('T')[0]}
      ORDER BY date ASC
    `);

    // Get current stats
    const currentStats = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'open') as open_tickets,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tickets,
        COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_tickets,
        COUNT(*) FILTER (WHERE priority = 'high') as high_priority_tickets,
        AVG(CASE 
          WHEN resolved_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600 
        END) as avg_resolution_hours
      FROM support_tickets
      WHERE created_at >= ${thirtyDaysAgo}
    `);

    // Get top categories
    const topCategories = await db.execute(sql`
      SELECT 
        category,
        COUNT(*) as count
      FROM support_tickets
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY category
      ORDER BY count DESC
      LIMIT 5
    `);

    // Get agent performance
    const agentPerformance = await db.execute(sql`
      SELECT 
        u.id,
        u.email,
        u.username,
        COUNT(DISTINCT t.id) as tickets_handled,
        COUNT(m.id) as messages_sent,
        AVG(t.satisfaction_rating) as avg_satisfaction
      FROM users u
      JOIN support_tickets t ON t.assigned_to = u.id
      LEFT JOIN support_messages m ON m.sender_id = u.id
      WHERE t.created_at >= ${thirtyDaysAgo}
      GROUP BY u.id, u.email, u.username
      ORDER BY tickets_handled DESC
      LIMIT 10
    `);

    res.json({
      metricsOverTime: metricsOverTime.rows,
      currentStats: currentStats.rows[0],
      topCategories: topCategories.rows,
      agentPerformance: agentPerformance.rows
    });
  } catch (error) {
    logger.error('Error fetching support metrics:', error);
    res.status(500).json({ error: 'Failed to fetch support metrics' });
  }
});

// Get customer notes
router.get('/support/customers/:userId/notes', requireSuperadminRole, async (req, res) => {
  try {
    const { userId } = req.params;

    const notes = await db.execute(sql`
      SELECT 
        n.*,
        creator.email as created_by_email,
        creator.username as created_by_username
      FROM customer_notes n
      JOIN users creator ON n.created_by = creator.id
      WHERE n.user_id = ${userId}
      ORDER BY n.is_pinned DESC, n.created_at DESC
    `);

    res.json({ notes: notes.rows });
  } catch (error) {
    logger.error('Error fetching customer notes:', error);
    res.status(500).json({ error: 'Failed to fetch customer notes' });
  }
});

// Add customer note
router.post('/support/customers/:userId/notes', requireSuperadminRole, async (req, res) => {
  try {
    const { userId } = req.params;
    const { note, organization_id } = req.body;
    const createdBy = req.user?.id;

    if (!note) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const newNote = await db.execute(sql`
      INSERT INTO customer_notes (
        user_id, organization_id, note, created_by
      ) VALUES (
        ${userId},
        ${organization_id || null},
        ${note},
        ${createdBy}
      ) RETURNING *
    `);

    res.json({ note: newNote.rows[0] });
  } catch (error) {
    logger.error('Error adding customer note:', error);
    res.status(500).json({ error: 'Failed to add customer note' });
  }
});

// ============================================
// ANALYTICS ENDPOINTS
// ============================================

// Get analytics overview
router.get('/analytics/overview', requireSuperadminRole, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
    }

    // Get key metrics
    const keyMetrics = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT user_id) as total_users,
        COUNT(DISTINCT session_id) as total_sessions,
        COUNT(*) as total_events,
        COUNT(DISTINCT DATE(timestamp)) as active_days
      FROM user_analytics
      WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
    `);

    // Get user growth
    const userGrowth = await db.execute(sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_users
      FROM users
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Get top events
    const topEvents = await db.execute(sql`
      SELECT 
        event_type,
        event_name,
        COUNT(*) as event_count,
        COUNT(DISTINCT user_id) as unique_users
      FROM user_analytics
      WHERE timestamp >= ${startDate}
      GROUP BY event_type, event_name
      ORDER BY event_count DESC
      LIMIT 10
    `);

    // Get feature usage
    const featureUsage = await db.execute(sql`
      SELECT 
        feature_name,
        SUM(usage_count) as total_usage,
        COUNT(DISTINCT user_id) as unique_users,
        MAX(last_used) as last_used
      FROM feature_usage
      WHERE date >= ${startDate.toISOString().split('T')[0]}
      GROUP BY feature_name
      ORDER BY total_usage DESC
    `);

    res.json({
      keyMetrics: keyMetrics.rows[0],
      userGrowth: userGrowth.rows,
      topEvents: topEvents.rows,
      featureUsage: featureUsage.rows
    });
  } catch (error) {
    logger.error('Error fetching analytics overview:', error);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

// Get user behavior analytics
router.get('/analytics/user-behavior', requireSuperadminRole, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
    }

    // Get user activity patterns
    const activityPatterns = await db.execute(sql`
      SELECT 
        EXTRACT(HOUR FROM timestamp) as hour,
        EXTRACT(DOW FROM timestamp) as day_of_week,
        COUNT(*) as event_count
      FROM user_analytics
      WHERE timestamp >= ${startDate}
      GROUP BY hour, day_of_week
      ORDER BY day_of_week, hour
    `);

    // Get user flow
    const userFlow = await db.execute(sql`
      WITH user_sessions AS (
        SELECT 
          user_id,
          session_id,
          event_name,
          timestamp,
          LAG(event_name) OVER (PARTITION BY user_id, session_id ORDER BY timestamp) as previous_event
        FROM user_analytics
        WHERE timestamp >= ${startDate} AND event_type = 'page_view'
      )
      SELECT 
        previous_event,
        event_name as next_event,
        COUNT(*) as transition_count
      FROM user_sessions
      WHERE previous_event IS NOT NULL
      GROUP BY previous_event, event_name
      ORDER BY transition_count DESC
      LIMIT 20
    `);

    // Get session duration stats
    const sessionStats = await db.execute(sql`
      WITH session_durations AS (
        SELECT 
          session_id,
          user_id,
          MIN(timestamp) as session_start,
          MAX(timestamp) as session_end,
          COUNT(*) as event_count
        FROM user_analytics
        WHERE timestamp >= ${startDate}
        GROUP BY session_id, user_id
      )
      SELECT 
        AVG(EXTRACT(EPOCH FROM (session_end - session_start)) / 60) as avg_session_duration_minutes,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (session_end - session_start)) / 60) as median_session_duration_minutes,
        AVG(event_count) as avg_events_per_session,
        COUNT(*) as total_sessions
      FROM session_durations
    `);

    res.json({
      activityPatterns: activityPatterns.rows,
      userFlow: userFlow.rows,
      sessionStats: sessionStats.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching user behavior analytics:', error);
    res.status(500).json({ error: 'Failed to fetch user behavior analytics' });
  }
});

// Get conversion funnel analytics
router.get('/analytics/funnels', requireSuperadminRole, async (req, res) => {
  try {
    const { funnel_name } = req.query;

    // Get all funnels or specific funnel
    const funnelQuery = funnel_name
      ? sql`WHERE funnel_name = ${funnel_name}`
      : sql``;

    const funnelData = await db.execute(sql`
      WITH funnel_steps AS (
        SELECT 
          funnel_name,
          step_name,
          step_order,
          COUNT(DISTINCT user_id) as users_reached,
          COUNT(DISTINCT CASE WHEN completed THEN user_id END) as users_completed,
          AVG(time_spent_seconds) as avg_time_spent
        FROM conversion_funnels
        ${funnelQuery}
        GROUP BY funnel_name, step_name, step_order
      )
      SELECT 
        *,
        ROUND(100.0 * users_completed / NULLIF(users_reached, 0), 2) as completion_rate
      FROM funnel_steps
      ORDER BY funnel_name, step_order
    `);

    // Get funnel conversion rates
    const conversionRates = await db.execute(sql`
      WITH funnel_completions AS (
        SELECT 
          funnel_name,
          user_id,
          MAX(step_order) as max_step_reached,
          COUNT(DISTINCT step_order) as steps_completed,
          MAX(CASE WHEN completed THEN step_order ELSE 0 END) as completed_until_step
        FROM conversion_funnels
        ${funnelQuery}
        GROUP BY funnel_name, user_id
      )
      SELECT 
        funnel_name,
        COUNT(DISTINCT user_id) as total_users,
        COUNT(DISTINCT CASE WHEN completed_until_step = max_step_reached THEN user_id END) as completed_users,
        ROUND(100.0 * COUNT(DISTINCT CASE WHEN completed_until_step = max_step_reached THEN user_id END) / NULLIF(COUNT(DISTINCT user_id), 0), 2) as overall_conversion_rate,
        AVG(steps_completed) as avg_steps_completed
      FROM funnel_completions
      GROUP BY funnel_name
    `);

    res.json({
      funnelSteps: funnelData.rows,
      conversionRates: conversionRates.rows
    });
  } catch (error) {
    logger.error('Error fetching funnel analytics:', error);
    res.status(500).json({ error: 'Failed to fetch funnel analytics' });
  }
});

// Get performance analytics
router.get('/analytics/performance', requireSuperadminRole, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case '24h':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
    }

    // Get performance metrics over time
    const performanceOverTime = await db.execute(sql`
      SELECT 
        DATE_TRUNC('hour', timestamp) as hour,
        AVG(load_time_ms) as avg_load_time,
        AVG(time_to_first_byte_ms) as avg_ttfb,
        AVG(first_contentful_paint_ms) as avg_fcp,
        AVG(largest_contentful_paint_ms) as avg_lcp,
        COUNT(*) as sample_count
      FROM performance_analytics
      WHERE timestamp >= ${startDate}
      GROUP BY hour
      ORDER BY hour ASC
    `);

    // Get performance by page
    const performanceByPage = await db.execute(sql`
      SELECT 
        page_url,
        AVG(load_time_ms) as avg_load_time,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY load_time_ms) as median_load_time,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY load_time_ms) as p95_load_time,
        COUNT(*) as sample_count
      FROM performance_analytics
      WHERE timestamp >= ${startDate}
      GROUP BY page_url
      ORDER BY sample_count DESC
      LIMIT 20
    `);

    // Get performance distribution
    const performanceDistribution = await db.execute(sql`
      SELECT 
        CASE 
          WHEN load_time_ms < 1000 THEN 'Fast (<1s)'
          WHEN load_time_ms < 3000 THEN 'Moderate (1-3s)'
          WHEN load_time_ms < 5000 THEN 'Slow (3-5s)'
          ELSE 'Very Slow (>5s)'
        END as performance_category,
        COUNT(*) as count,
        ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
      FROM performance_analytics
      WHERE timestamp >= ${startDate}
      GROUP BY performance_category
      ORDER BY 
        CASE performance_category
          WHEN 'Fast (<1s)' THEN 1
          WHEN 'Moderate (1-3s)' THEN 2
          WHEN 'Slow (3-5s)' THEN 3
          ELSE 4
        END
    `);

    res.json({
      performanceOverTime: performanceOverTime.rows,
      performanceByPage: performanceByPage.rows,
      performanceDistribution: performanceDistribution.rows
    });
  } catch (error) {
    logger.error('Error fetching performance analytics:', error);
    res.status(500).json({ error: 'Failed to fetch performance analytics' });
  }
});

// Get user segments
router.get('/analytics/segments', requireSuperadminRole, async (req, res) => {
  try {
    // Get all segments with member counts
    const segments = await db.execute(sql`
      SELECT 
        s.*,
        COUNT(m.user_id) as member_count,
        MAX(m.joined_at) as last_member_joined
      FROM user_segments s
      LEFT JOIN user_segment_membership m ON s.id = m.segment_id
      GROUP BY s.id
      ORDER BY member_count DESC
    `);

    // Get segment growth over time
    const segmentGrowth = await db.execute(sql`
      SELECT 
        s.segment_name,
        DATE(m.joined_at) as date,
        COUNT(*) as new_members
      FROM user_segment_membership m
      JOIN user_segments s ON m.segment_id = s.id
      WHERE m.joined_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY s.segment_name, DATE(m.joined_at)
      ORDER BY date ASC
    `);

    res.json({
      segments: segments.rows,
      segmentGrowth: segmentGrowth.rows
    });
  } catch (error) {
    logger.error('Error fetching user segments:', error);
    res.status(500).json({ error: 'Failed to fetch user segments' });
  }
});

// Get business metrics
router.get('/analytics/business-metrics', requireSuperadminRole, async (req, res) => {
  try {
    const { period = '30d', metric_names } = req.query as { period?: string; metric_names?: string | string[] };
    
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
    }

    // Get metrics over time
    let metricsQuery = sql`
      SELECT * FROM business_metrics
      WHERE date >= ${startDate.toISOString().split('T')[0]}
        AND date <= ${endDate.toISOString().split('T')[0]}
    `;

    if (metric_names) {
      const names = Array.isArray(metric_names) ? metric_names : metric_names.split(',');
      metricsQuery = sql`
        SELECT * FROM business_metrics
        WHERE date >= ${startDate.toISOString().split('T')[0]}
          AND date <= ${endDate.toISOString().split('T')[0]}
          AND metric_name = ANY(${names})
      `;
    }

    const metrics = await db.execute(sql`
      ${metricsQuery}
      ORDER BY date ASC, metric_name
    `);

    // Get metric summaries
    const summaries = await db.execute(sql`
      SELECT 
        metric_name,
        AVG(metric_value) as avg_value,
        MIN(metric_value) as min_value,
        MAX(metric_value) as max_value,
        STDDEV(metric_value) as std_dev
      FROM business_metrics
      WHERE date >= ${startDate.toISOString().split('T')[0]}
        AND date <= ${endDate.toISOString().split('T')[0]}
      GROUP BY metric_name
    `);

    res.json({
      metrics: metrics.rows,
      summaries: summaries.rows
    });
  } catch (error) {
    logger.error('Error fetching business metrics:', error);
    res.status(500).json({ error: 'Failed to fetch business metrics' });
  }
});

// Get A/B test results
router.get('/analytics/ab-tests', requireSuperadminRole, async (req, res) => {
  try {
    // Get all A/B tests
    const tests = await db.execute(sql`
      SELECT 
        t.*,
        COUNT(DISTINCT a.user_id) as total_participants,
        COUNT(DISTINCT r.id) as total_results
      FROM ab_tests t
      LEFT JOIN ab_test_assignments a ON t.id = a.test_id
      LEFT JOIN ab_test_results r ON t.id = r.test_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);

    // Get results for active tests
    const activeTestResults = await db.execute(sql`
      SELECT 
        t.test_name,
        r.*
      FROM ab_test_results r
      JOIN ab_tests t ON r.test_id = t.id
      WHERE t.status = 'active'
      ORDER BY t.test_name, r.variant_name, r.metric_name
    `);

    res.json({
      tests: tests.rows,
      activeTestResults: activeTestResults.rows
    });
  } catch (error) {
    logger.error('Error fetching A/B test results:', error);
    res.status(500).json({ error: 'Failed to fetch A/B test results' });
  }
});

// ============================================
// DEVOPS ENDPOINTS
// ============================================

// Get deployments overview
router.get('/devops/deployments', requireSuperadminRole, async (req, res) => {
  try {
    const { environment, status, limit = 50, offset = 0 } = req.query;

    // Build query conditions
    let whereConditions = sql`WHERE 1=1`;
    if (environment) {
      whereConditions = sql`${whereConditions} AND environment = ${environment}`;
    }
    if (status) {
      whereConditions = sql`${whereConditions} AND status = ${status}`;
    }

    // Get deployments
    const deployments = await db.execute(sql`
      SELECT 
        d.*,
        u.email as deployed_by_email,
        u.username as deployed_by_username
      FROM deployments d
      LEFT JOIN users u ON d.deployed_by = u.id
      ${whereConditions}
      ORDER BY d.started_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    // Get deployment stats
    const stats = await db.execute(sql`
      SELECT 
        environment,
        COUNT(*) as total_deployments,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_deployments,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_deployments,
        AVG(CASE 
          WHEN completed_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (completed_at - started_at))
        END) as avg_duration_seconds
      FROM deployments
      WHERE started_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY environment
    `);

    res.json({
      deployments: deployments.rows,
      stats: stats.rows
    });
  } catch (error) {
    logger.error('Error fetching deployments:', error);
    res.status(500).json({ error: 'Failed to fetch deployments' });
  }
});

// Create new deployment
router.post('/devops/deployments', requireSuperadminRole, async (req, res) => {
  try {
    const { version, environment, deployment_type, git_commit, git_branch } = req.body;
    const deployedBy = req.user?.id;

    const deployment = await db.execute(sql`
      INSERT INTO deployments (
        deployment_id,
        version,
        environment,
        deployment_type,
        deployed_by,
        git_commit,
        git_branch,
        status
      ) VALUES (
        ${`deploy-${Date.now()}`},
        ${version},
        ${environment},
        ${deployment_type || 'manual'},
        ${deployedBy},
        ${git_commit},
        ${git_branch},
        'pending'
      ) RETURNING *
    `);

    // Log deployment in audit trail
    await db.execute(sql`
      INSERT INTO admin_actions (
        admin_id, action, target_type, target_id, severity, ip_address
      ) VALUES (
        ${deployedBy},
        'deployment.create',
        'deployment',
        ${deployment.rows[0].id},
        'warning',
        ${req.ip}
      )
    `);

    res.json({ deployment: deployment.rows[0] });
  } catch (error) {
    logger.error('Error creating deployment:', error);
    res.status(500).json({ error: 'Failed to create deployment' });
  }
});

// Update deployment status
router.put('/devops/deployments/:deploymentId', requireSuperadminRole, async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const { status, error_message } = req.body;

    const updates: Record<string, any> = { status };
    if (status === 'success' || status === 'failed') {
      updates.completed_at = sql`NOW()`;
    }
    if (error_message) {
      updates.error_message = error_message;
    }

    // Build UPDATE statement dynamically
    const updateFields = Object.entries(updates)
      .map(([key, value]) => sql`${sql.identifier(key)} = ${value}`)
      .reduce((acc, curr, idx) => idx === 0 ? curr : sql`${acc}, ${curr}`);

    await db.execute(sql`
      UPDATE deployments
      SET ${updateFields}
      WHERE id = ${deploymentId}
    `);

    res.json({ message: 'Deployment updated successfully' });
  } catch (error) {
    logger.error('Error updating deployment:', error);
    res.status(500).json({ error: 'Failed to update deployment' });
  }
});

// Get environment configurations
router.get('/devops/environments', requireSuperadminRole, async (req, res) => {
  try {
    const environments = await db.execute(sql`
      SELECT * FROM environment_configs
      ORDER BY environment
    `);

    res.json({ environments: environments.rows });
  } catch (error) {
    logger.error('Error fetching environments:', error);
    res.status(500).json({ error: 'Failed to fetch environments' });
  }
});

// Update environment configuration
router.put('/devops/environments/:environment', requireSuperadminRole, async (req, res) => {
  try {
    const { environment } = req.params;
    const { config_data, secrets_data } = req.body;

    await db.execute(sql`
      UPDATE environment_configs
      SET 
        config_data = ${JSON.stringify(config_data)},
        secrets_data = ${secrets_data ? JSON.stringify(secrets_data) : null},
        updated_at = NOW()
      WHERE environment = ${environment}
    `);

    res.json({ message: 'Environment configuration updated' });
  } catch (error) {
    logger.error('Error updating environment:', error);
    res.status(500).json({ error: 'Failed to update environment' });
  }
});

// Get infrastructure resources
router.get('/devops/infrastructure', requireSuperadminRole, async (req, res) => {
  try {
    const resources = await db.execute(sql`
      SELECT 
        *,
        SUM(cost_per_month) OVER () as total_monthly_cost
      FROM infrastructure_resources
      WHERE status = 'active'
      ORDER BY resource_type, resource_name
    `);

    // Get cost breakdown by type
    const costBreakdown = await db.execute(sql`
      SELECT 
        resource_type,
        COUNT(*) as resource_count,
        SUM(cost_per_month) as total_cost
      FROM infrastructure_resources
      WHERE status = 'active'
      GROUP BY resource_type
      ORDER BY total_cost DESC
    `);

    res.json({
      resources: resources.rows,
      costBreakdown: costBreakdown.rows,
      totalMonthlyCost: resources.rows[0]?.total_monthly_cost || 0
    });
  } catch (error) {
    logger.error('Error fetching infrastructure:', error);
    res.status(500).json({ error: 'Failed to fetch infrastructure' });
  }
});

// Get service health status
router.get('/devops/health', requireSuperadminRole, async (req, res) => {
  try {
    const healthChecks = await db.execute(sql`
      SELECT 
        *,
        CASE 
          WHEN checked_at < NOW() - INTERVAL '5 minutes' THEN 'stale'
          ELSE status
        END as current_status
      FROM service_health_checks
      ORDER BY service_name
    `);

    // Calculate overall health score
    const healthyCount = healthChecks.rows.filter(s => s.current_status === 'healthy').length;
    const totalCount = healthChecks.rows.length;
    const healthScore = totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 0;

    res.json({
      services: healthChecks.rows,
      healthScore,
      summary: {
        healthy: healthyCount,
        unhealthy: healthChecks.rows.filter(s => s.current_status === 'unhealthy').length,
        stale: healthChecks.rows.filter(s => s.current_status === 'stale').length
      }
    });
  } catch (error) {
    logger.error('Error fetching service health:', error);
    res.status(500).json({ error: 'Failed to fetch service health' });
  }
});

// Get pipeline runs
router.get('/devops/pipelines', requireSuperadminRole, async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;

    let whereClause = sql`WHERE 1=1`;
    if (status) {
      whereClause = sql`${whereClause} AND status = ${status}`;
    }

    const pipelines = await db.execute(sql`
      SELECT 
        p.*,
        u.email as triggered_by_email
      FROM pipeline_runs p
      LEFT JOIN users u ON p.triggered_by = u.id
      ${whereClause}
      ORDER BY p.started_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    // Get pipeline statistics
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_runs,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_runs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_runs,
        AVG(duration_seconds) as avg_duration_seconds
      FROM pipeline_runs
      WHERE started_at >= CURRENT_DATE - INTERVAL '7 days'
    `);

    res.json({
      pipelines: pipelines.rows,
      stats: stats.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching pipelines:', error);
    res.status(500).json({ error: 'Failed to fetch pipelines' });
  }
});

// Get SSL certificates
router.get('/devops/certificates', requireSuperadminRole, async (req, res) => {
  try {
    const certificates = await db.execute(sql`
      SELECT 
        *,
        CASE 
          WHEN valid_until < NOW() THEN 'expired'
          WHEN valid_until < NOW() + INTERVAL '30 days' THEN 'expiring_soon'
          ELSE 'valid'
        END as status,
        EXTRACT(DAY FROM (valid_until - NOW())) as days_until_expiry
      FROM ssl_certificates
      ORDER BY valid_until ASC
    `);

    res.json({ certificates: certificates.rows });
  } catch (error) {
    logger.error('Error fetching certificates:', error);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
});

// Get backup records
router.get('/devops/backups', requireSuperadminRole, async (req, res) => {
  try {
    const { backup_type, status, limit = 50, offset = 0 } = req.query;

    let whereConditions = sql`WHERE 1=1`;
    if (backup_type) {
      whereConditions = sql`${whereConditions} AND backup_type = ${backup_type}`;
    }
    if (status) {
      whereConditions = sql`${whereConditions} AND status = ${status}`;
    }

    const backups = await db.execute(sql`
      SELECT * FROM backup_records
      ${whereConditions}
      ORDER BY started_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    // Get backup statistics
    const stats = await db.execute(sql`
      SELECT 
        backup_type,
        COUNT(*) as total_backups,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_backups,
        SUM(size_bytes) as total_size_bytes,
        MAX(completed_at) as last_backup_at
      FROM backup_records
      WHERE started_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY backup_type
    `);

    res.json({
      backups: backups.rows,
      stats: stats.rows
    });
  } catch (error) {
    logger.error('Error fetching backups:', error);
    res.status(500).json({ error: 'Failed to fetch backups' });
  }
});

// Create backup
router.post('/devops/backups', requireSuperadminRole, async (req, res) => {
  try {
    const { backup_type, source, destination, retention_days } = req.body;

    const backup = await db.execute(sql`
      INSERT INTO backup_records (
        backup_id,
        backup_type,
        source,
        destination,
        retention_days,
        status
      ) VALUES (
        ${`backup-${Date.now()}`},
        ${backup_type},
        ${source},
        ${destination},
        ${retention_days || 30},
        'in_progress'
      ) RETURNING *
    `);

    res.json({ backup: backup.rows[0] });
  } catch (error) {
    logger.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Get database migrations
router.get('/devops/migrations', requireSuperadminRole, async (req, res) => {
  try {
    const migrations = await db.execute(sql`
      SELECT * FROM database_migrations
      ORDER BY executed_at DESC
    `);

    const pendingMigrations: any[] = []; // In real app, compare with migration files

    res.json({
      executed: migrations.rows,
      pending: pendingMigrations
    });
  } catch (error) {
    logger.error('Error fetching migrations:', error);
    res.status(500).json({ error: 'Failed to fetch migrations' });
  }
});

// White Label Management endpoints
// Get all white label configs
router.get('/whitelabel/configs', requireSuperadminRole, async (req, res) => {
  try {
    const configs = await db.execute(sql`
      SELECT 
        w.*,
        o.name as organization_name,
        COUNT(DISTINCT cp.id) as custom_pages_count,
        COUNT(DISTINCT et.id) as email_templates_count
      FROM white_label_configs w
      LEFT JOIN organizations o ON w.organization_id = o.id
      LEFT JOIN custom_pages cp ON cp.organization_id = w.organization_id
      LEFT JOIN email_templates et ON et.organization_id = w.organization_id
      GROUP BY w.id, o.name
      ORDER BY w.created_at DESC
    `);

    res.json(configs.rows);
  } catch (error) {
    logger.error('Error fetching white label configs:', error);
    res.status(500).json({ error: 'Failed to fetch white label configs' });
  }
});

// Get theme presets
router.get('/whitelabel/themes', requireSuperadminRole, async (req, res) => {
  try {
    const themes = await db.execute(sql`
      SELECT * FROM theme_presets
      ORDER BY is_default DESC, name
    `);

    res.json(themes.rows);
  } catch (error) {
    logger.error('Error fetching theme presets:', error);
    res.status(500).json({ error: 'Failed to fetch theme presets' });
  }
});

// Update white label config
router.put('/whitelabel/configs/:id', requireSuperadminRole, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.organization_id;
    delete updates.created_at;

    updates.updated_at = new Date();

    // Build UPDATE statement dynamically
    const updateFields = Object.entries(updates)
      .map(([key, value]) => sql`${sql.identifier(key)} = ${value}`)
      .reduce((acc, curr, idx) => idx === 0 ? curr : sql`${acc}, ${curr}`);

    await db.execute(sql`
      UPDATE white_label_configs
      SET ${updateFields}
      WHERE id = ${id}
    `);

    res.json({ message: 'White label config updated successfully' });
  } catch (error) {
    logger.error('Error updating white label config:', error);
    res.status(500).json({ error: 'Failed to update white label config' });
  }
});

// Create custom page
router.post('/whitelabel/pages', requireSuperadminRole, async (req, res) => {
  try {
    const { organization_id, slug, title, content, meta_description, is_public } = req.body;

    const page = await db.execute(sql`
      INSERT INTO custom_pages (
        organization_id, slug, title, content, meta_description, is_public
      ) VALUES (
        ${organization_id}, ${slug}, ${title}, ${content}, ${meta_description}, ${is_public}
      )
      RETURNING *
    `);

    res.json(page.rows[0]);
  } catch (error) {
    logger.error('Error creating custom page:', error);
    res.status(500).json({ error: 'Failed to create custom page' });
  }
});

// Update custom page
router.put('/whitelabel/pages/:id', requireSuperadminRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, meta_description, is_public } = req.body;

    await db.execute(sql`
      UPDATE custom_pages
      SET 
        title = ${title},
        content = ${content},
        meta_description = ${meta_description},
        is_public = ${is_public},
        updated_at = NOW()
      WHERE id = ${id}
    `);

    res.json({ message: 'Page updated successfully' });
  } catch (error) {
    logger.error('Error updating custom page:', error);
    res.status(500).json({ error: 'Failed to update page' });
  }
});

// Get custom pages
router.get('/whitelabel/pages/:orgId', requireSuperadminRole, async (req, res) => {
  try {
    const { orgId } = req.params;

    const pages = await db.execute(sql`
      SELECT * FROM custom_pages
      WHERE organization_id = ${orgId}
      ORDER BY created_at DESC
    `);

    res.json(pages.rows);
  } catch (error) {
    logger.error('Error fetching custom pages:', error);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

// Get email templates
router.get('/whitelabel/templates/:orgId', requireSuperadminRole, async (req, res) => {
  try {
    const { orgId } = req.params;

    const templates = await db.execute(sql`
      SELECT * FROM email_templates
      WHERE organization_id = ${orgId}
      ORDER BY template_type
    `);

    res.json(templates.rows);
  } catch (error) {
    logger.error('Error fetching email templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Update email template
router.put('/whitelabel/templates/:id', requireSuperadminRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, html_content, text_content, is_active } = req.body;

    await db.execute(sql`
      UPDATE email_templates
      SET 
        subject = ${subject},
        html_content = ${html_content},
        text_content = ${text_content},
        is_active = ${is_active},
        updated_at = NOW()
      WHERE id = ${id}
    `);

    res.json({ message: 'Template updated successfully' });
  } catch (error) {
    logger.error('Error updating email template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Verify domain
router.post('/whitelabel/verify-domain', requireSuperadminRole, async (req, res) => {
  try {
    const { organization_id, domain } = req.body;

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    await db.execute(sql`
      INSERT INTO domain_verifications (
        organization_id, domain, verification_method, 
        verification_token, expires_at
      ) VALUES (
        ${organization_id}, ${domain}, 'DNS_TXT', 
        ${verificationToken}, NOW() + INTERVAL '7 days'
      )
      ON CONFLICT (organization_id, domain) 
      DO UPDATE SET 
        verification_token = ${verificationToken},
        expires_at = NOW() + INTERVAL '7 days'
    `);

    res.json({
      domain,
      verificationMethod: 'DNS_TXT',
      dnsRecord: {
        type: 'TXT',
        name: '_remvana-verify',
        value: verificationToken
      }
    });
  } catch (error) {
    logger.error('Error initiating domain verification:', error);
    res.status(500).json({ error: 'Failed to initiate domain verification' });
  }
});

// Communication Hub endpoints
// Get announcements
router.get('/communications/announcements', requireSuperadminRole, async (req, res) => {
  try {
    const announcements = await db.execute(sql`
      SELECT 
        a.*,
        u.email as created_by_email,
        COUNT(DISTINCT ar.user_id) as read_count
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id
      GROUP BY a.id, u.email
      ORDER BY a.is_pinned DESC, a.created_at DESC
    `);

    res.json(announcements.rows);
  } catch (error) {
    logger.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Create announcement
router.post('/communications/announcements', requireSuperadminRole, async (req, res) => {
  try {
    const { title, content, type, severity, target_audience, is_pinned } = req.body;

    const announcement = await db.execute(sql`
      INSERT INTO announcements (
        title, content, type, severity, 
        target_audience, is_pinned, created_by
      ) VALUES (
        ${title}, ${content}, ${type}, ${severity},
        ${target_audience}, ${is_pinned}, ${req.user!.id}
      )
      RETURNING *
    `);

    res.json(announcement.rows[0]);
  } catch (error) {
    logger.error('Error creating announcement:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// Update announcement
router.put('/communications/announcements/:id', requireSuperadminRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, type, severity, is_active, is_pinned } = req.body;

    await db.execute(sql`
      UPDATE announcements
      SET 
        title = ${title},
        content = ${content},
        type = ${type},
        severity = ${severity},
        is_active = ${is_active},
        is_pinned = ${is_pinned},
        updated_at = NOW()
      WHERE id = ${id}
    `);

    res.json({ message: 'Announcement updated successfully' });
  } catch (error) {
    logger.error('Error updating announcement:', error);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// Get broadcast messages
router.get('/communications/broadcasts', requireSuperadminRole, async (req, res) => {
  try {
    const broadcasts = await db.execute(sql`
      SELECT 
        b.*,
        u.email as created_by_email
      FROM broadcast_messages b
      LEFT JOIN users u ON b.created_by = u.id
      ORDER BY b.created_at DESC
    `);

    res.json(broadcasts.rows);
  } catch (error) {
    logger.error('Error fetching broadcasts:', error);
    res.status(500).json({ error: 'Failed to fetch broadcasts' });
  }
});

// Create broadcast message
router.post('/communications/broadcasts', requireSuperadminRole, async (req, res) => {
  try {
    const { subject, content, html_content, recipient_type, scheduled_at } = req.body;

    // Get recipient count based on type
    let recipientCount = 0;
    if (recipient_type === 'all_users') {
      const count = await db.execute(sql`SELECT COUNT(*) as count FROM users WHERE is_active = true`);
      recipientCount = count.rows[0].count as number;
    }

    const broadcast = await db.execute(sql`
      INSERT INTO broadcast_messages (
        subject, content, html_content, recipient_type,
        scheduled_at, total_recipients, created_by, status
      ) VALUES (
        ${subject}, ${content}, ${html_content}, ${recipient_type},
        ${scheduled_at}, ${recipientCount}, ${req.user!.id},
        ${scheduled_at ? 'scheduled' : 'draft'}
      )
      RETURNING *
    `);

    res.json(broadcast.rows[0]);
  } catch (error) {
    logger.error('Error creating broadcast:', error);
    res.status(500).json({ error: 'Failed to create broadcast' });
  }
});

// Send broadcast message
router.post('/communications/broadcasts/:id/send', requireSuperadminRole, async (req, res) => {
  try {
    const { id } = req.params;

    // Update status to sending
    await db.execute(sql`
      UPDATE broadcast_messages
      SET status = 'sending', sent_at = NOW()
      WHERE id = ${id}
    `);

    // In a real app, this would queue emails for sending
    // For now, just mark as sent
    setTimeout(async () => {
      await db.execute(sql`
        UPDATE broadcast_messages
        SET status = 'sent', successful_sends = total_recipients
        WHERE id = ${id}
      `);
    }, 2000);

    res.json({ message: 'Broadcast sending initiated' });
  } catch (error) {
    logger.error('Error sending broadcast:', error);
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

// Get changelog entries
router.get('/communications/changelog', requireSuperadminRole, async (req, res) => {
  try {
    const entries = await db.execute(sql`
      SELECT * FROM changelog_entries
      ORDER BY release_date DESC, version DESC
    `);

    res.json(entries.rows);
  } catch (error) {
    logger.error('Error fetching changelog:', error);
    res.status(500).json({ error: 'Failed to fetch changelog' });
  }
});

// Create changelog entry
router.post('/communications/changelog', requireSuperadminRole, async (req, res) => {
  try {
    const { version, release_date, type, title, description, features, fixes, breaking_changes } = req.body;

    const entry = await db.execute(sql`
      INSERT INTO changelog_entries (
        version, release_date, type, title, description,
        features, fixes, breaking_changes, created_by
      ) VALUES (
        ${version}, ${release_date}, ${type}, ${title}, ${description},
        ${JSON.stringify(features || [])}, ${JSON.stringify(fixes || [])},
        ${JSON.stringify(breaking_changes || [])}, ${req.user!.id}
      )
      RETURNING *
    `);

    res.json(entry.rows[0]);
  } catch (error) {
    logger.error('Error creating changelog entry:', error);
    res.status(500).json({ error: 'Failed to create changelog entry' });
  }
});

// Update changelog entry
router.put('/communications/changelog/:id', requireSuperadminRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, features, fixes, breaking_changes, is_published } = req.body;

    await db.execute(sql`
      UPDATE changelog_entries
      SET 
        title = ${title},
        description = ${description},
        features = ${JSON.stringify(features || [])},
        fixes = ${JSON.stringify(fixes || [])},
        breaking_changes = ${JSON.stringify(breaking_changes || [])},
        is_published = ${is_published},
        updated_at = NOW()
      WHERE id = ${id}
    `);

    res.json({ message: 'Changelog entry updated successfully' });
  } catch (error) {
    logger.error('Error updating changelog entry:', error);
    res.status(500).json({ error: 'Failed to update changelog entry' });
  }
});

// Get communication stats
router.get('/communications/stats', requireSuperadminRole, async (req, res) => {
  try {
    const [announcements, broadcasts, unreadNotifications] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM announcements WHERE is_active = true`),
      db.execute(sql`SELECT COUNT(*) as count, SUM(successful_sends) as total_sent FROM broadcast_messages WHERE status = 'sent'`),
      db.execute(sql`SELECT COUNT(*) as count FROM notifications WHERE is_read = false`)
    ]);

    res.json({
      activeAnnouncements: announcements.rows[0].count || 0,
      totalBroadcasts: broadcasts.rows[0].count || 0,
      totalMessagesSent: broadcasts.rows[0].total_sent || 0,
      unreadNotifications: unreadNotifications.rows[0].count || 0
    });
  } catch (error) {
    logger.error('Error fetching communication stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Pricing Experiments endpoints
// Get pricing plans
router.get('/pricing/plans', requireSuperadminRole, async (req, res) => {
  try {
    const plans = await db.execute(sql`
      SELECT * FROM pricing_plans
      ORDER BY sort_order, price_monthly
    `);

    res.json(plans.rows);
  } catch (error) {
    logger.error('Error fetching pricing plans:', error);
    res.status(500).json({ error: 'Failed to fetch pricing plans' });
  }
});

// Create/Update pricing plan
router.post('/pricing/plans', requireSuperadminRole, async (req, res) => {
  try {
    const { name, display_name, description, price_monthly, price_yearly, features, limits, sync_to_stripe } = req.body;

    const plan = await db.execute(sql`
      INSERT INTO pricing_plans (
        name, display_name, description, price_monthly, 
        price_yearly, features, limits
      ) VALUES (
        ${name}, ${display_name}, ${description}, ${price_monthly},
        ${price_yearly}, ${JSON.stringify(features)}, ${JSON.stringify(limits)}
      )
      ON CONFLICT (name) DO UPDATE SET
        display_name = ${display_name},
        description = ${description},
        price_monthly = ${price_monthly},
        price_yearly = ${price_yearly},
        features = ${JSON.stringify(features)},
        limits = ${JSON.stringify(limits)},
        updated_at = NOW()
      RETURNING *
    `);

    const savedPlan = plan.rows[0];

    // Sync to Stripe if requested and Stripe is configured
    if (sync_to_stripe && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripeIds = await StripePricingSync.syncPlanToStripe(savedPlan as any);
        logger.info('Successfully synced pricing plan to Stripe', { 
          planId: savedPlan.id, 
          stripeIds 
        });
        
        // Update the plan with Stripe IDs
        savedPlan.stripe_product_id = stripeIds.productId;
        savedPlan.stripe_price_id_monthly = stripeIds.monthlyPriceId;
        savedPlan.stripe_price_id_yearly = stripeIds.yearlyPriceId;
      } catch (stripeError) {
        logger.error('Error syncing to Stripe (plan saved locally):', stripeError);
        // Return success with a warning about Stripe sync
        return res.json({
          ...savedPlan,
          warning: 'Plan saved locally but failed to sync to Stripe'
        });
      }
    }

    res.json(savedPlan);
  } catch (error) {
    logger.error('Error creating pricing plan:', error);
    res.status(500).json({ error: 'Failed to create pricing plan' });
  }
});

// Sync all pricing plans to Stripe
router.post('/pricing/sync-to-stripe', requireSuperadminRole, async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(400).json({ error: 'Stripe is not configured' });
    }

    await StripePricingSync.syncAllPlans();
    
    // Fetch updated plans with Stripe IDs
    const plans = await db.execute(sql`
      SELECT * FROM pricing_plans 
      WHERE is_active = true 
      ORDER BY sort_order
    `);
    
    res.json({ 
      success: true, 
      message: 'All pricing plans synced to Stripe',
      plans: plans.rows 
    });
  } catch (error) {
    logger.error('Error syncing all plans to Stripe:', error);
    res.status(500).json({ error: 'Failed to sync plans to Stripe' });
  }
});

// Get pricing experiments
router.get('/pricing/experiments', requireSuperadminRole, async (req, res) => {
  try {
    const experiments = await db.execute(sql`
      SELECT 
        pe.*,
        COUNT(DISTINCT ea.id) as participant_count,
        COUNT(DISTINCT CASE WHEN ea.converted THEN ea.id END) as conversion_count
      FROM pricing_experiments pe
      LEFT JOIN experiment_assignments ea ON ea.experiment_id = pe.id
      GROUP BY pe.id
      ORDER BY pe.created_at DESC
    `);

    res.json(experiments.rows);
  } catch (error) {
    logger.error('Error fetching pricing experiments:', error);
    res.status(500).json({ error: 'Failed to fetch experiments' });
  }
});

// Create pricing experiment
router.post('/pricing/experiments', requireSuperadminRole, async (req, res) => {
  try {
    const { name, description, type, variant_configs, targeting_rules, success_metrics, traffic_allocation } = req.body;

    const experiment = await db.execute(sql`
      INSERT INTO pricing_experiments (
        name, description, type, variant_configs,
        targeting_rules, success_metrics, traffic_allocation,
        status, created_by
      ) VALUES (
        ${name}, ${description}, ${type}, ${JSON.stringify(variant_configs)},
        ${JSON.stringify(targeting_rules || {})}, ${JSON.stringify(success_metrics)},
        ${traffic_allocation || 50}, 'draft', ${req.user!.id}
      )
      RETURNING *
    `);

    res.json(experiment.rows[0]);
  } catch (error) {
    logger.error('Error creating pricing experiment:', error);
    res.status(500).json({ error: 'Failed to create experiment' });
  }
});

// Update experiment status
router.put('/pricing/experiments/:id/status', requireSuperadminRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await db.execute(sql`
      UPDATE pricing_experiments
      SET 
        status = ${status},
        start_date = CASE WHEN ${status} = 'active' THEN NOW() ELSE start_date END,
        end_date = CASE WHEN ${status} = 'completed' THEN NOW() ELSE end_date END,
        updated_at = NOW()
      WHERE id = ${id}
    `);

    res.json({ message: 'Experiment status updated' });
  } catch (error) {
    logger.error('Error updating experiment status:', error);
    res.status(500).json({ error: 'Failed to update experiment' });
  }
});

// Get experiment metrics
router.get('/pricing/experiments/:id/metrics', requireSuperadminRole, async (req, res) => {
  try {
    const { id } = req.params;

    const metrics = await db.execute(sql`
      SELECT * FROM pricing_metrics
      WHERE experiment_id = ${id}
      ORDER BY metric_date DESC, variant_name
    `);

    res.json(metrics.rows);
  } catch (error) {
    logger.error('Error fetching experiment metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get discount codes
router.get('/pricing/discounts', requireSuperadminRole, async (req, res) => {
  try {
    const discounts = await db.execute(sql`
      SELECT * FROM discount_codes
      ORDER BY created_at DESC
    `);

    res.json(discounts.rows);
  } catch (error) {
    logger.error('Error fetching discount codes:', error);
    res.status(500).json({ error: 'Failed to fetch discount codes' });
  }
});

// Create discount code
router.post('/pricing/discounts', requireSuperadminRole, async (req, res) => {
  try {
    const { code, description, discount_type, discount_value, max_uses, valid_until } = req.body;

    const discount = await db.execute(sql`
      INSERT INTO discount_codes (
        code, description, discount_type, discount_value,
        max_uses, valid_until, created_by
      ) VALUES (
        ${code}, ${description}, ${discount_type}, ${discount_value},
        ${max_uses}, ${valid_until}, ${req.user!.id}
      )
      RETURNING *
    `);

    res.json(discount.rows[0]);
  } catch (error) {
    logger.error('Error creating discount code:', error);
    res.status(500).json({ error: 'Failed to create discount code' });
  }
});

// Get customer success scores
router.get('/pricing/customer-success', requireSuperadminRole, async (req, res) => {
  try {
    const scores = await db.execute(sql`
      SELECT 
        css.*,
        o.name as organization_name,
        o.subscription_status,
        o.mrr
      FROM customer_success_scores css
      JOIN organizations o ON o.id = css.organization_id
      ORDER BY css.overall_score ASC
      LIMIT 50
    `);

    res.json(scores.rows);
  } catch (error) {
    logger.error('Error fetching customer success scores:', error);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

// Stripe Webhook Monitoring endpoints
router.get('/stripe/webhooks/overview', requireSuperadminRole, async (req, res) => {
  try {
    // Get recent webhook events
    const recentEvents = await db.execute(sql`
      SELECT 
        type, status, created, processing_time_ms
      FROM stripe_webhook_events
      ORDER BY created DESC
      LIMIT 10
    `);

    // Get webhook metrics
    const todayMetrics = await db.execute(sql`
      SELECT 
        SUM(total_events) as total_events,
        SUM(successful_events) as successful_events,
        SUM(failed_events) as failed_events,
        AVG(avg_processing_time_ms) as avg_processing_time
      FROM stripe_webhook_metrics
      WHERE metric_date = CURRENT_DATE
    `);

    // Get active alerts
    const activeAlerts = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM stripe_webhook_alerts
      WHERE acknowledged = false
    `);

    // Get webhook endpoints status
    const endpoints = await db.execute(sql`
      SELECT * FROM stripe_webhook_endpoints
      ORDER BY created_at DESC
    `);

    // Get event type distribution
    const eventDistribution = await db.execute(sql`
      SELECT 
        type, 
        COUNT(*) as count
      FROM stripe_webhook_events
      WHERE created >= NOW() - INTERVAL '24 hours'
      GROUP BY type
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json({
      recentEvents: recentEvents.rows,
      metrics: todayMetrics.rows[0] || {},
      activeAlerts: activeAlerts.rows[0].count || 0,
      endpoints: endpoints.rows,
      eventDistribution: eventDistribution.rows
    });
  } catch (error) {
    logger.error('Error fetching webhook overview:', error);
    res.status(500).json({ error: 'Failed to fetch webhook overview' });
  }
});

// Get webhook events
router.get('/stripe/webhooks/events', requireSuperadminRole, async (req, res) => {
  try {
    const { status, type, limit = 100 } = req.query;
    
    let query = sql`
      SELECT 
        id, stripe_event_id, type, status, created, received_at,
        processed_at, retries, error_message, processing_time_ms
      FROM stripe_webhook_events
    `;
    
    const conditions = [];
    if (status) conditions.push(sql`status = ${status}`);
    if (type) conditions.push(sql`type = ${type}`);
    
    if (conditions.length > 0) {
      query = sql`${query} WHERE ${conditions.reduce((acc, cond, i) => 
        i === 0 ? cond : sql`${acc} AND ${cond}`
      )}`;
    }
    
    query = sql`${query} ORDER BY created DESC LIMIT ${parseInt(limit as string)}`;
    
    const events = await db.execute(query);
    res.json(events.rows);
  } catch (error) {
    logger.error('Error fetching webhook events:', error);
    res.status(500).json({ error: 'Failed to fetch webhook events' });
  }
});

// Get webhook event details
router.get('/stripe/webhooks/events/:id', requireSuperadminRole, async (req, res) => {
  try {
    const eventId = req.params.id;
    
    const event = await db.execute(sql`
      SELECT * FROM stripe_webhook_events
      WHERE id = ${eventId} OR stripe_event_id = ${eventId}
    `);
    
    if (event.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json(event.rows[0]);
  } catch (error) {
    logger.error('Error fetching webhook event:', error);
    res.status(500).json({ error: 'Failed to fetch webhook event' });
  }
});

// Get webhook metrics
router.get('/stripe/webhooks/metrics', requireSuperadminRole, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let interval = '7 days';
    if (period === '1d') interval = '1 day';
    else if (period === '30d') interval = '30 days';
    
    const metrics = await db.execute(sql`
      SELECT 
        metric_date,
        event_type,
        total_events,
        successful_events,
        failed_events,
        avg_processing_time_ms,
        retried_events
      FROM stripe_webhook_metrics
      WHERE metric_date >= CURRENT_DATE - INTERVAL ${interval}
      ORDER BY metric_date DESC, event_type
    `);
    
    res.json(metrics.rows);
  } catch (error) {
    logger.error('Error fetching webhook metrics:', error);
    res.status(500).json({ error: 'Failed to fetch webhook metrics' });
  }
});

// Get webhook alerts
router.get('/stripe/webhooks/alerts', requireSuperadminRole, async (req, res) => {
  try {
    const { acknowledged = false } = req.query;
    
    const alerts = await db.execute(sql`
      SELECT 
        a.*,
        u.email as acknowledged_by_email
      FROM stripe_webhook_alerts a
      LEFT JOIN users u ON a.acknowledged_by = u.id
      WHERE acknowledged = ${acknowledged === 'true'}
      ORDER BY created_at DESC
      LIMIT 100
    `);
    
    res.json(alerts.rows);
  } catch (error) {
    logger.error('Error fetching webhook alerts:', error);
    res.status(500).json({ error: 'Failed to fetch webhook alerts' });
  }
});

// Acknowledge alert
router.put('/stripe/webhooks/alerts/:id/acknowledge', requireSuperadminRole, async (req, res) => {
  try {
    const alertId = parseInt(req.params.id);
    
    await db.execute(sql`
      UPDATE stripe_webhook_alerts
      SET 
        acknowledged = true,
        acknowledged_by = ${req.user!.id},
        acknowledged_at = NOW()
      WHERE id = ${alertId}
    `);
    
    await logSuperadminAction(
      req.user!.id,
      'ACKNOWLEDGE_WEBHOOK_ALERT',
      'webhook_alert',
      alertId,
      {}
    );
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error acknowledging alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// Get webhook endpoints
router.get('/stripe/webhooks/endpoints', requireSuperadminRole, async (req, res) => {
  try {
    const endpoints = await db.execute(sql`
      SELECT * FROM stripe_webhook_endpoints
      ORDER BY created_at DESC
    `);
    
    res.json(endpoints.rows);
  } catch (error) {
    logger.error('Error fetching webhook endpoints:', error);
    res.status(500).json({ error: 'Failed to fetch webhook endpoints' });
  }
});

// Update webhook endpoint
router.put('/stripe/webhooks/endpoints/:id', requireSuperadminRole, async (req, res) => {
  try {
    const endpointId = parseInt(req.params.id);
    const { status, enabled_events } = req.body;
    
    await db.execute(sql`
      UPDATE stripe_webhook_endpoints
      SET 
        status = ${status},
        enabled_events = ${enabled_events},
        updated_at = NOW()
      WHERE id = ${endpointId}
    `);
    
    await logSuperadminAction(
      req.user!.id,
      'UPDATE_WEBHOOK_ENDPOINT',
      'webhook_endpoint',
      endpointId,
      { status, enabled_events }
    );
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating webhook endpoint:', error);
    res.status(500).json({ error: 'Failed to update webhook endpoint' });
  }
});

// Get payment tracking
router.get('/stripe/payments', requireSuperadminRole, async (req, res) => {
  try {
    const { organization_id, object_type, limit = 50 } = req.query;
    
    let query = sql`
      SELECT 
        pt.*,
        o.name as organization_name
      FROM stripe_payment_tracking pt
      LEFT JOIN organizations o ON pt.organization_id = o.id
    `;
    
    const conditions = [];
    if (organization_id) conditions.push(sql`pt.organization_id = ${organization_id}`);
    if (object_type) conditions.push(sql`pt.object_type = ${object_type}`);
    
    if (conditions.length > 0) {
      query = sql`${query} WHERE ${conditions.reduce((acc, cond, i) => 
        i === 0 ? cond : sql`${acc} AND ${cond}`
      )}`;
    }
    
    query = sql`${query} ORDER BY pt.created DESC LIMIT ${parseInt(limit as string)}`;
    
    const payments = await db.execute(query);
    res.json(payments.rows);
  } catch (error) {
    logger.error('Error fetching payment tracking:', error);
    res.status(500).json({ error: 'Failed to fetch payment tracking' });
  }
});

export default router;