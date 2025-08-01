import express, { Request, Response } from 'express';
import { eq, desc, count, sql, and, gte, lte } from 'drizzle-orm';
import { db } from '../db';
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
import { stripe, SUBSCRIPTION_PLANS, createStripeCustomer, updateSubscription, createRefund } from '../stripe';

// Define authenticated request interface
interface AuthenticatedUser {
  id: number;
  email: string;
  role: string;
  organization_id?: number;
  displayName?: string;
}

import { cleanJwtAuthMiddleware, requireSuperadminRole } from '../middleware/cleanJwtAuth';

// Apply JWT auth to all superadmin routes with proper middleware
const createSuperadminRoutes = () => {
  const router = express.Router();
  
  // Apply JWT auth to all routes
  router.use(cleanJwtAuthMiddleware);
  router.use(requireSuperadminRole);
  
  return router;
};

const router = createSuperadminRoutes();

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
    // Use direct SQL to avoid schema mismatches
    const activities = await db.execute(`
      SELECT id, superadmin_user_id as admin_user_id, action, target_type as entity_type, 
             target_id as entity_id, details, risk_level, created_at
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

router.get('/sessions', requireSuperadminRole, async (req, res) => {
  try {
    // Get active sessions with proper user data by joining with users table
    const sessions = await db.execute(`
      SELECT s.sid,
             s.expire as expires_at,
             EXTRACT(EPOCH FROM (s.expire - NOW())) as time_remaining,
             u.id as user_id,
             u.username,
             u.email,
             u.role,
             u.display_name,
             o.name as organization_name,
             COALESCE(s.sess #>> '{ipAddress}', s.sess #>> '{ip}', s.sess #>> '{remoteAddress}', 'Unknown IP') as ip_address,
             COALESCE(s.sess #>> '{userAgent}', s.sess #>> '{user_agent}', 'Unknown Browser') as user_agent,
             COALESCE(s.sess #>> '{loginTime}', (s.expire - INTERVAL '12 hours')::text) as login_time,
             s.sess as full_session_data
      FROM session s
      LEFT JOIN users u ON (
        u.id = CAST(s.sess #>> '{user_id}' AS INTEGER) OR
        u.auth_id = s.sess #>> '{auth_id}' OR
        u.auth_id = s.sess #>> '{authId}'
      )
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE s.expire > NOW()
      ORDER BY s.expire DESC 
      LIMIT 50
    `);

    // Format the data properly for the frontend
    const formattedSessions = sessions.rows.map(session => {
      // Parse session data to get additional info
      let sessionData = {};
      try {
        sessionData = typeof session.full_session_data === 'string' 
          ? JSON.parse(session.full_session_data) 
          : session.full_session_data || {};
      } catch (e) {
        console.warn('Failed to parse session data:', e);
      }

      // Calculate created_at from login time or estimate
      let createdAt;
      try {
        if ((session as any).login_time && (session as any).login_time !== 'null') {
          createdAt = new Date((session as any).login_time);
        } else {
          // Estimate login time as 12 hours before expiry
          createdAt = new Date(new Date((session as any).expires_at || Date.now()).getTime() - (12 * 60 * 60 * 1000));
        }
      } catch (e) {
        createdAt = new Date(new Date((session as any).expires_at || Date.now()).getTime() - (12 * 60 * 60 * 1000));
      }

      return {
        id: session.sid,
        user_id: session.user_id || (sessionData as any)?.user_id || (sessionData as any)?.userId || 'N/A',
        username: session.username || (sessionData as any)?.username || (sessionData as any)?.displayName || (sessionData as any)?.email || 'Anonymous User',
        email: session.email || (sessionData as any)?.email || (sessionData as any)?.username || 'No Email',
        role: session.role || (sessionData as any)?.role || 'User',
        display_name: session.display_name || (sessionData as any)?.display_name || (sessionData as any)?.displayName,
        organization_name: session.organization_name || (sessionData as any)?.organizationName || 'No Organization',
        ip_address: session.ip_address === '::1' ? ((sessionData as any)?.email || (sessionData as any)?.username || 'Local Development') : session.ip_address || 'Unknown IP',
        user_agent: session.user_agent || 'Unknown Browser',
        expires_at: session.expires_at,
        time_remaining: Math.max(0, Math.floor((session as any).time_remaining || 0)),
        created_at: createdAt.toISOString()
      };
    });

    res.json(formattedSessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.get('/jobs', requireSuperadminRole, async (req, res) => {
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

// Update feature flag
router.put('/flags/:id', requireSuperadminRole, async (req, res) => {
  try {
    const flagId = parseInt(req.params.id);
    const { default_value } = req.body;

    const updateResult = await db.execute(`
      UPDATE feature_flags 
      SET default_value = ${default_value}
      WHERE id = ${flagId}
      RETURNING *
    `);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    const updatedFlag = updateResult.rows[0];

    await logSuperadminAction(
      req.user!.id,
      'UPDATE_FEATURE_FLAG',
      'feature_flag',
      flagId,
      { flag_name: updatedFlag.flag_name, enabled: default_value }
    );

    res.json(updatedFlag);
  } catch (error) {
    console.error('Error updating feature flag:', error);
    res.status(500).json({ error: 'Failed to update feature flag' });
  }
});

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

export default router;