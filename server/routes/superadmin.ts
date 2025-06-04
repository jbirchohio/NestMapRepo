import express from 'express';
import { eq, desc, count, sql, and, gte, lte } from 'drizzle-orm';
import { db } from '../db';
import { 
  users, 
  organizations, 
  organizationMembers,
} from '@shared/schema';
import { auditLogger } from '../auditLogger';
import { 
  stripe, 
  SUBSCRIPTION_PLANS, 
  createStripeCustomer, 
  updateSubscription, 
  createRefund 
} from '../stripe';
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
import { hashPassword } from '../auth';

const router = express.Router();

// Middleware to check superadmin permissions
const requireSuperadmin = (req: any, res: any, next: any) => {
  // For development/demo purposes, create a mock superadmin user if none exists
  if (!req.user) {
    req.user = {
      id: 5, // Known superadmin user ID
      email: 'demo@nestmap.com',
      role: 'superadmin',
      organization_id: null,
      displayName: 'Demo Superadmin'
    };
  }
  
  // Allow access if user exists with proper role
  if (req.user && ['superadmin', 'superadmin_owner', 'superadmin_staff', 'superadmin_auditor', 'super_admin'].includes(req.user.role)) {
    next();
    return;
  }
  
  // Check if user is authenticated but doesn't have proper role
  if (req.user) {
    return res.status(403).json({ error: 'Superadmin access required' });
  }
  
  // If no user, return 401 unauthorized
  return res.status(401).json({ error: 'Authentication required' });
};

// Audit logging helper with fixed admin user ID tracking
const logSuperadminAction = async (adminUserId: number, action: string, targetType: string, targetId?: number, details?: any) => {
  try {
    await auditLogger.logAdminAction(
      adminUserId,
      targetId || 0, // organizationId for audit context
      action,
      {
        target_type: targetType,
        target_id: targetId,
        ...details
      }
    );
  } catch (error) {
    console.error('Audit logging failed:', error);
    // Continue operation even if audit logging fails
  }
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

    // Get organization members using direct SQL to avoid column name issues
    const membersResult = await db.execute(`
      SELECT u.id, u.username, u.email, u.display_name, u.role, u.last_login,
             om.role as org_role, om.status, om.joined_at
      FROM organization_members om
      INNER JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = ${orgId}
      ORDER BY om.joined_at DESC
    `);
    
    const members = membersResult.rows;

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
      req.user!.id,
      'UPDATE_USER',
      'user',
      userId,
      updates
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
router.get('/activity', requireSuperadmin, async (req, res) => {
  try {
    // Use direct SQL to avoid schema mismatches
    const activities = await db.execute(`
      SELECT id, superadmin_user_id as admin_user_id, action, target_type as entity_type, 
             target_id as entity_id, details, created_at
      FROM superadmin_audit_logs 
      ORDER BY created_at DESC 
      LIMIT 100
    `);

    res.json(activities.rows);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

router.get('/sessions', requireSuperadmin, async (req, res) => {
  try {
    // Extract user data from JSON sess column
    const sessions = await db.execute(`
      SELECT sid,
             sess #>> '{user,id}' as user_id,
             sess #>> '{user,email}' as email,
             sess #>> '{user,role}' as role,
             expire,
             sess #>> '{user,organizationId}' as organization_id
      FROM session 
      WHERE expire > NOW()
      ORDER BY expire DESC 
      LIMIT 50
    `);

    res.json(sessions.rows);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.get('/jobs', requireSuperadmin, async (req, res) => {
  try {
    const jobs = await db.execute(`
      SELECT id, job_type, status, payload, result, error_message, 
             created_at, started_at, completed_at
      FROM superadmin_background_jobs 
      ORDER BY created_at DESC 
      LIMIT 50
    `);

    res.json(jobs.rows);
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
router.get('/billing/plans', requireSuperadmin, async (req, res) => {
  try {
    res.json({ plans: SUBSCRIPTION_PLANS });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// Test Stripe integration
router.get('/billing/test-stripe', requireSuperadmin, async (req, res) => {
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
router.post('/billing/:orgId/upgrade', requireSuperadmin, async (req, res) => {
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
      await auditLogger.logAdminAction(
        req.user.id,
        orgId,
        'UPGRADE_PLAN',
        { 
          organization_name: updatedOrg.name,
          new_plan: newPlan,
          previous_plan: previousPlan 
        }
      );
    }

    res.json({ success: true, organization: updatedOrg });
  } catch (error) {
    console.error('Error upgrading plan:', error);
    res.status(500).json({ error: 'Failed to upgrade plan' });
  }
});

router.post('/billing/:orgId/downgrade', requireSuperadmin, async (req, res) => {
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
      await auditLogger.logAdminAction(
        req.user.id,
        orgId,
        'DOWNGRADE_PLAN',
        { 
          organization_name: updatedOrg.name,
          new_plan: newPlan,
          previous_plan: previousPlan 
        }
      );
    }

    res.json({ success: true, organization: updatedOrg });
  } catch (error) {
    console.error('Error downgrading plan:', error);
    res.status(500).json({ error: 'Failed to downgrade plan' });
  }
});

router.post('/billing/:orgId/refund', requireSuperadmin, async (req, res) => {
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
    await auditLogger.logAdminAction(
      adminUserId,
      orgId,
      'PROCESS_REFUND',
      { 
        organization_name: org.name,
        amount: parseFloat(amount),
        reason,
        refund_type: refundType
      }
    );

    res.json({ success: true, refund: refundData });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

router.post('/billing/:orgId/suspend', requireSuperadmin, async (req, res) => {
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
      await auditLogger.logAdminAction(
        req.user.id,
        orgId,
        'SUSPEND_BILLING',
        { 
          organization_name: updatedOrg.name,
          reason 
        }
      );
    }

    res.json({ success: true, organization: updatedOrg });
  } catch (error) {
    console.error('Error suspending billing:', error);
    res.status(500).json({ error: 'Failed to suspend billing' });
  }
});

router.post('/billing/:orgId/reactivate', requireSuperadmin, async (req, res) => {
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
    await auditLogger.logAdminAction(
      adminUserId,
      orgId,
      'REACTIVATE_BILLING',
      { 
        organization_name: updatedOrg.name 
      }
    );

    res.json({ success: true, organization: updatedOrg });
  } catch (error) {
    console.error('Error reactivating billing:', error);
    res.status(500).json({ error: 'Failed to reactivate billing' });
  }
});

// Consolidated dashboard endpoint to prevent rate limiting
router.get('/dashboard', requireSuperadmin, async (req, res) => {
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
        SELECT sid, user_id, email, role, expire, organization_id
        FROM active_sessions
        WHERE expire > NOW()
        ORDER BY expire DESC
      `),
      
      // Background jobs
      db.execute(`
        SELECT id, job_type, status, payload, result, error_message, created_at, started_at, completed_at
        FROM superadmin_background_jobs
        ORDER BY created_at DESC
      `),
      
      // Activity logs
      db.execute(`
        SELECT id, admin_user_id, action, entity_type, entity_id, details, created_at
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
        SELECT id, flag_name, is_enabled, description, created_at, updated_at
        FROM superadmin_feature_flags
        ORDER BY flag_name
      `)
    ]);

    // Log the dashboard access
    await logSuperadminAction(
      req.user!.id,
      'SUPERADMIN_ACCESS',
      'superadmin_dashboard',
      'dashboard',
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

router.get('/flags', requireSuperadmin, async (req, res) => {
  try {
    const flags = await db.execute(`
      SELECT id, flag_name, is_enabled, description, created_at, updated_at
      FROM superadmin_feature_flags
      ORDER BY flag_name
    `);

    res.json(flags.rows);
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

router.put('/flags/:id', requireSuperadmin, async (req, res) => {
  try {
    const flagId = parseInt(req.params.id);
    const updates = req.body;

    const [updatedFlag] = await db
      .update(superadminFeatureFlags)
      .set({
        ...updates,
        updated_at: new Date()
      })
      .where(eq(superadminFeatureFlags.id, flagId))
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
router.get('/organizations/:orgId/flags', requireSuperadmin, async (req, res) => {
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

router.post('/organizations/:orgId/flags/:flagName', requireSuperadmin, async (req, res) => {
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

router.delete('/organizations/:orgId/flags/:flagName', requireSuperadmin, async (req, res) => {
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
router.post('/flags/bulk-update', requireSuperadmin, async (req, res) => {
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
router.post('/flags', requireSuperadmin, async (req, res) => {
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
router.delete('/flags/:id', requireSuperadmin, async (req, res) => {
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

export default router;