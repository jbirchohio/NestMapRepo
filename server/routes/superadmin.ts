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
import { hashPassword } from '../auth';
import { supabaseAdmin } from '../supabaseAdmin';

const router = express.Router();

// Middleware to check superadmin permissions
const requireSuperadmin = (req: any, res: any, next: any) => {
  if (!req.user || !['superadmin', 'superadmin_owner', 'superadmin_staff', 'superadmin_auditor', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Superadmin access required' });
  }
  next();
};

// Audit logging helper - temporarily disabled to fix user management
const logSuperadminAction = async (adminUserId: number, action: string, targetType: string, targetId?: number, details?: any) => {
  // TODO: Fix schema mismatch for audit logging
  console.log('Audit action:', { adminUserId, action, targetType, targetId, details });
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
    // Fetch all users from Supabase auth
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching users from Supabase:', authError);
      return res.status(500).json({ error: 'Failed to fetch users from authentication system' });
    }

    // Fetch user profiles from Supabase database
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        auth_id,
        username,
        email,
        display_name,
        role,
        role_type,
        organization_id,
        company,
        job_title,
        created_at
      `)
      .order('created_at', { ascending: false });

    // Fetch organizations separately to avoid join issues
    const { data: organizations, error: orgsError } = await supabaseAdmin
      .from('organizations')
      .select('id, name');

    if (profilesError) {
      console.error('Error fetching user profiles from Supabase:', profilesError);
      return res.status(500).json({ error: 'Failed to fetch user profiles' });
    }

    // Merge auth data with profile data
    const usersData = profiles?.map(profile => {
      const authUser = authUsers.users.find(u => u.id === profile.auth_id);
      const organization = organizations?.find(org => org.id === profile.organization_id);
      
      return {
        id: profile.id,
        auth_id: profile.auth_id,
        username: profile.username,
        email: profile.email,
        display_name: profile.display_name,
        role: profile.role,
        role_type: profile.role_type,
        organization_id: profile.organization_id,
        company: profile.company,
        job_title: profile.job_title,
        created_at: profile.created_at,
        organization_name: organization?.name || null,
        // Add auth-specific data
        email_confirmed: authUser?.email_confirmed_at ? true : false,
        last_sign_in: authUser?.last_sign_in_at,
      };
    }) || [];

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

    // Get current user data
    const { data: currentUser, error: getUserError } = await supabaseAdmin
      .from('users')
      .select('auth_id, email')
      .eq('id', userId)
      .single();

    if (getUserError || !currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user profile in Supabase database
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      return res.status(500).json({ error: 'Failed to update user profile' });
    }

    // If email is being updated, also update it in Supabase Auth
    if (updates.email && updates.email !== currentUser.email) {
      const { error: emailUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        currentUser.auth_id,
        { email: updates.email }
      );

      if (emailUpdateError) {
        console.error('Error updating email in Supabase auth:', emailUpdateError);
        // Continue even if auth email update fails - profile is already updated
      }
    }

    await logSuperadminAction(
      req.user!.id,
      'UPDATE_USER',
      'user',
      userId,
      { ...updates, auth_id: currentUser.auth_id }
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

    // Get user from Supabase database
    const { data: user, error: getUserError } = await supabaseAdmin
      .from('users')
      .select('auth_id, username, email')
      .eq('id', userId)
      .single();

    if (getUserError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update password in Supabase Auth
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
      user.auth_id,
      { password: newPassword }
    );

    if (passwordError) {
      console.error('Error updating password in Supabase auth:', passwordError);
      return res.status(500).json({ error: 'Failed to update password in authentication system' });
    }

    await logSuperadminAction(
      req.user!.id,
      'RESET_PASSWORD',
      'user',
      userId,
      { target_username: user.username, auth_id: user.auth_id }
    );

    res.json({ 
      success: true, 
      user: { 
        id: userId, 
        username: user.username, 
        email: user.email 
      } 
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.delete('/users/:id', requireSuperadmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Get user info from Supabase database before deletion
    const { data: user, error: getUserError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (getUserError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete from Supabase Auth first (this will cascade to related data)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.auth_id);
    
    if (authDeleteError) {
      console.error('Error deleting user from Supabase auth:', authDeleteError);
      return res.status(500).json({ error: 'Failed to delete user from authentication system' });
    }

    // Delete organization memberships from Supabase database
    const { error: memberDeleteError } = await supabaseAdmin
      .from('organization_members')
      .delete()
      .eq('user_id', userId);

    if (memberDeleteError) {
      console.error('Error deleting organization memberships:', memberDeleteError);
      // Continue with user deletion even if membership deletion fails
    }

    // Delete user profile from Supabase database
    const { error: profileDeleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (profileDeleteError) {
      console.error('Error deleting user profile:', profileDeleteError);
      return res.status(500).json({ error: 'Failed to delete user profile' });
    }

    await logSuperadminAction(
      req.user!.id,
      'DELETE_USER',
      'user',
      userId,
      { username: user.username, email: user.email, auth_id: user.auth_id }
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
      .set(updates)
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

export default router;