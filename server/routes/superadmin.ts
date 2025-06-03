import { Router } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { authenticateUser } from '../auth';

const router = Router();

// Strict superadmin authentication
router.use(async (req: any, res, next) => {
  try {
    // First authenticate the user
    const authResult = await authenticateUser(req, res);
    if (!authResult || !authResult.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    req.user = authResult;

    // Check if user has superadmin role
    if (req.user.role !== 'superadmin') {
      // Create audit log for unauthorized access attempt
      try {
        await storage.createSuperadminAuditLog({
          superadmin_id: null,
          action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          target_type: 'superadmin_dashboard',
          target_id: req.user.id.toString(),
          details: { user_role: req.user.role, ip_address: req.ip },
          ip_address: req.ip
        });
      } catch (auditError) {
        console.error('Failed to create audit log:', auditError);
      }
      
      return res.status(403).json({ message: 'Superadmin access required' });
    }

    // Log successful superadmin access
    try {
      await storage.createSuperadminAuditLog({
        superadmin_id: req.user.id,
        action: 'SUPERADMIN_ACCESS',
        target_type: 'superadmin_dashboard',
        target_id: 'dashboard',
        details: { ip_address: req.ip },
        ip_address: req.ip
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    next();
  } catch (error) {
    console.error('Superadmin auth error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
});

// Organizations & Users
router.get('/organizations', async (req, res) => {
  try {
    const organizations = await storage.getSuperadminOrganizations();
    res.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ message: 'Failed to fetch organizations' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await storage.getSuperadminUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

router.post('/users/:id/deactivate', async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    await storage.deactivateUser(userId);
    
    // Log audit action
    await storage.createSuperadminAuditLog({
      superadmin_user_id: req.user!.id,
      action: 'user_deactivate',
      target_type: 'user',
      target_id: req.params.id,
      details: { reason: req.body.reason },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ message: 'Failed to deactivate user' });
  }
});

router.post('/orgs/:id/disable', async (req: any, res) => {
  try {
    const orgId = parseInt(req.params.id);
    await storage.disableOrganization(orgId);
    
    // Log audit action
    await storage.createSuperadminAuditLog({
      superadmin_user_id: req.user!.id,
      action: 'org_disable',
      target_type: 'organization',
      target_id: req.params.id,
      details: { reason: req.body.reason },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error disabling organization:', error);
    res.status(500).json({ message: 'Failed to disable organization' });
  }
});

router.post('/roles', async (req: any, res) => {
  try {
    const { userId, newRole } = req.body;
    await storage.updateUserRole(userId, newRole);
    
    // Log audit action
    await storage.createSuperadminAuditLog({
      superadmin_user_id: req.user!.id,
      action: 'role_change',
      target_type: 'user',
      target_id: userId.toString(),
      details: { newRole, previousRole: req.body.previousRole },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Failed to update user role' });
  }
});

// Audit & Security
router.get('/activity', async (req, res) => {
  try {
    const activity = await storage.getSuperadminActivity();
    res.json(activity);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ message: 'Failed to fetch activity' });
  }
});

router.get('/sessions', async (req, res) => {
  try {
    const sessions = await storage.getActiveSessions();
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ message: 'Failed to fetch sessions' });
  }
});

router.post('/logout/:sessionId', async (req: any, res) => {
  try {
    await storage.terminateSession(req.params.sessionId);
    
    // Log audit action
    await storage.createSuperadminAuditLog({
      superadmin_user_id: req.user!.id,
      action: 'session_terminate',
      target_type: 'session',
      target_id: req.params.sessionId,
      details: {},
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error terminating session:', error);
    res.status(500).json({ message: 'Failed to terminate session' });
  }
});

// Trip/AI Logs
router.get('/trip-logs', async (req, res) => {
  try {
    const logs = await storage.getTripLogs();
    res.json(logs);
  } catch (error) {
    console.error('Error fetching trip logs:', error);
    res.status(500).json({ message: 'Failed to fetch trip logs' });
  }
});

router.get('/ai-usage', async (req, res) => {
  try {
    const usage = await storage.getAiUsage();
    res.json(usage);
  } catch (error) {
    console.error('Error fetching AI usage:', error);
    res.status(500).json({ message: 'Failed to fetch AI usage' });
  }
});

router.post('/impersonate', async (req: any, res) => {
  try {
    const { userId } = req.body;
    const impersonationToken = await storage.createImpersonationSession(req.user!.id, userId);
    
    // Log audit action
    await storage.createSuperadminAuditLog({
      superadmin_user_id: req.user!.id,
      action: 'user_impersonate',
      target_type: 'user',
      target_id: userId.toString(),
      details: {},
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({ impersonationToken });
  } catch (error) {
    console.error('Error creating impersonation session:', error);
    res.status(500).json({ message: 'Failed to create impersonation session' });
  }
});

// Billing & Plans
router.get('/billing', async (req, res) => {
  try {
    const billing = await storage.getBillingOverview();
    res.json(billing);
  } catch (error) {
    console.error('Error fetching billing:', error);
    res.status(500).json({ message: 'Failed to fetch billing data' });
  }
});

router.post('/billing/override', async (req: any, res) => {
  try {
    const { organizationId, planOverride, credits } = req.body;
    await storage.setBillingOverride(organizationId, planOverride, credits);
    
    // Log audit action
    await storage.createSuperadminAuditLog({
      superadmin_user_id: req.user!.id,
      action: 'billing_override',
      target_type: 'organization',
      target_id: organizationId.toString(),
      details: { planOverride, credits },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error setting billing override:', error);
    res.status(500).json({ message: 'Failed to set billing override' });
  }
});

router.get('/invoices', async (req, res) => {
  try {
    const invoices = await storage.getInvoices();
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ message: 'Failed to fetch invoices' });
  }
});

// Feature Flags
router.get('/flags', async (req, res) => {
  try {
    const flags = await storage.getFeatureFlags();
    res.json(flags);
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    res.status(500).json({ message: 'Failed to fetch feature flags' });
  }
});

router.post('/flags/:orgId', async (req: any, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const { flagName, enabled } = req.body;
    await storage.setOrganizationFeatureFlag(orgId, flagName, enabled);
    
    // Log audit action
    await storage.createSuperadminAuditLog({
      superadmin_user_id: req.user!.id,
      action: 'feature_flag_change',
      target_type: 'organization',
      target_id: req.params.orgId,
      details: { flagName, enabled },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error setting feature flag:', error);
    res.status(500).json({ message: 'Failed to set feature flag' });
  }
});

// White Label Tools
router.get('/white-label', async (req, res) => {
  try {
    const whiteLabelData = await storage.getWhiteLabelData();
    res.json(whiteLabelData);
  } catch (error) {
    console.error('Error fetching white label data:', error);
    res.status(500).json({ message: 'Failed to fetch white label data' });
  }
});

router.post('/orgs/:id/theme', async (req: any, res) => {
  try {
    const orgId = parseInt(req.params.id);
    const { theme } = req.body;
    await storage.setOrganizationTheme(orgId, theme);
    
    // Log audit action
    await storage.createSuperadminAuditLog({
      superadmin_user_id: req.user!.id,
      action: 'theme_change',
      target_type: 'organization',
      target_id: req.params.id,
      details: { theme },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error setting organization theme:', error);
    res.status(500).json({ message: 'Failed to set organization theme' });
  }
});

// Exports & Compliance
router.post('/export/org/:id', async (req: any, res) => {
  try {
    const orgId = parseInt(req.params.id);
    const jobId = await storage.createExportJob(orgId, req.user!.id);
    
    // Log audit action
    await storage.createSuperadminAuditLog({
      superadmin_user_id: req.user!.id,
      action: 'data_export',
      target_type: 'organization',
      target_id: req.params.id,
      details: { jobId },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({ jobId });
  } catch (error) {
    console.error('Error creating export job:', error);
    res.status(500).json({ message: 'Failed to create export job' });
  }
});

router.post('/delete/user/:id', async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    await storage.deleteUserData(userId);
    
    // Log audit action
    await storage.createSuperadminAuditLog({
      superadmin_user_id: req.user!.id,
      action: 'user_delete',
      target_type: 'user',
      target_id: req.params.id,
      details: { reason: req.body.reason },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user data:', error);
    res.status(500).json({ message: 'Failed to delete user data' });
  }
});

// Job/Webhook Utilities
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await storage.getBackgroundJobs();
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching background jobs:', error);
    res.status(500).json({ message: 'Failed to fetch background jobs' });
  }
});

router.post('/jobs/:id/retry', async (req: any, res) => {
  try {
    const jobId = parseInt(req.params.id);
    await storage.retryBackgroundJob(jobId);
    
    // Log audit action
    await storage.createSuperadminAuditLog({
      superadmin_user_id: req.user!.id,
      action: 'job_retry',
      target_type: 'job',
      target_id: req.params.id,
      details: {},
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error retrying background job:', error);
    res.status(500).json({ message: 'Failed to retry background job' });
  }
});

router.post('/webhooks/test', async (req: any, res) => {
  try {
    const { url, payload } = req.body;
    const result = await storage.testWebhook(url, payload);
    
    // Log audit action
    await storage.createSuperadminAuditLog({
      superadmin_user_id: req.user!.id,
      action: 'webhook_test',
      target_type: 'webhook',
      target_id: url,
      details: { payload, result },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({ result });
  } catch (error) {
    console.error('Error testing webhook:', error);
    res.status(500).json({ message: 'Failed to test webhook' });
  }
});

export default router;