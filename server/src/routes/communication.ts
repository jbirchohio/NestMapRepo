import express from 'express';
import { CommunicationIntegrationService } from '../communicationIntegration';
import { authenticateJWT as requireAuth, requireRole } from '../middleware/auth';
import { auditLogger } from '../auditLogger';

const router = express.Router();
const communicationService = CommunicationIntegrationService.getInstance();

// Get communication providers for organization
router.get('/providers', requireAuth, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const providers = await communicationService.getProviders(organizationId);

    res.json(providers);
  } catch (error) {
    console.error('Error fetching communication providers:', error);
    res.status(500).json({ error: 'Failed to fetch communication providers' });
  }
});

// Configure communication provider
router.post('/providers', requireAuth, requireRole(['admin', 'integration_manager']), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { provider, config } = req.body;

    if (!provider || !config) {
      return res.status(400).json({ error: 'Provider and config are required' });
    }

    const result = await communicationService.configureProvider(
      organizationId,
      provider,
      config
    );

    await auditLogger.log({
      action: 'communication_provider_configured',
      userId: req.user.id,
      organizationId,
      details: { provider, enabled: config.enabled }
    });

    res.json(result);
  } catch (error) {
    console.error('Error configuring communication provider:', error);
    res.status(500).json({ error: 'Failed to configure communication provider' });
  }
});

// Update communication provider
router.patch('/providers/:provider', requireAuth, requireRole(['admin', 'integration_manager']), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { provider } = req.params;
    const updates = req.body;

    const result = await communicationService.updateProviderConfig(
      organizationId,
      provider,
      updates
    );

    await auditLogger.log({
      action: 'communication_provider_updated',
      userId: req.user.id,
      organizationId,
      details: { provider, updates }
    });

    res.json(result);
  } catch (error) {
    console.error('Error updating communication provider:', error);
    res.status(500).json({ error: 'Failed to update communication provider' });
  }
});

// Test communication provider
router.post('/providers/:provider/test', requireAuth, requireRole(['admin', 'integration_manager']), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { provider } = req.params;
    const { testMessage } = req.body;

    const result = await communicationService.testProvider(
      organizationId,
      provider,
      testMessage || {
        title: 'Test Message',
        message: 'This is a test message from NestMap',
        type: 'test',
        priority: 'normal'
      }
    );

    await auditLogger.log({
      action: 'communication_provider_tested',
      userId: req.user.id,
      organizationId,
      details: { provider, success: result.success }
    });

    res.json(result);
  } catch (error) {
    console.error('Error testing communication provider:', error);
    res.status(500).json({ error: 'Failed to test communication provider' });
  }
});

// Send notification
router.post('/notifications', requireAuth, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const message = req.body;

    if (!message.title || !message.message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const results = await communicationService.sendNotification(organizationId, message);

    await auditLogger.log({
      action: 'notification_sent',
      userId: req.user.id,
      organizationId,
      details: { 
        messageType: message.type,
        priority: message.priority,
        recipientCount: message.recipients?.length || 0,
        providerResults: results.length
      }
    });

    res.json(results);
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Get notification templates
router.get('/templates', requireAuth, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const templates = await communicationService.getNotificationTemplates(organizationId);

    res.json(templates);
  } catch (error) {
    console.error('Error fetching notification templates:', error);
    res.status(500).json({ error: 'Failed to fetch notification templates' });
  }
});

// Create notification template
router.post('/templates', requireAuth, requireRole(['admin', 'communication_manager']), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const template = req.body;

    if (!template.name || !template.title || !template.message) {
      return res.status(400).json({ error: 'Name, title, and message are required' });
    }

    const result = await communicationService.createNotificationTemplate(
      organizationId,
      template
    );

    await auditLogger.log({
      action: 'notification_template_created',
      userId: req.user.id,
      organizationId,
      details: { templateId: result.id, templateName: template.name }
    });

    res.json(result);
  } catch (error) {
    console.error('Error creating notification template:', error);
    res.status(500).json({ error: 'Failed to create notification template' });
  }
});

// Update notification template
router.patch('/templates/:templateId', requireAuth, requireRole(['admin', 'communication_manager']), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { templateId } = req.params;
    const updates = req.body;

    const result = await communicationService.updateNotificationTemplate(
      organizationId,
      templateId,
      updates
    );

    await auditLogger.log({
      action: 'notification_template_updated',
      userId: req.user.id,
      organizationId,
      details: { templateId, updates }
    });

    res.json(result);
  } catch (error) {
    console.error('Error updating notification template:', error);
    res.status(500).json({ error: 'Failed to update notification template' });
  }
});

// Delete notification template
router.delete('/templates/:templateId', requireAuth, requireRole(['admin', 'communication_manager']), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { templateId } = req.params;

    await communicationService.deleteNotificationTemplate(organizationId, templateId);

    await auditLogger.log({
      action: 'notification_template_deleted',
      userId: req.user.id,
      organizationId,
      details: { templateId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification template:', error);
    res.status(500).json({ error: 'Failed to delete notification template' });
  }
});

// Get notification history
router.get('/history', requireAuth, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { startDate, endDate, type, status, limit = 50 } = req.query;

    const history = await communicationService.getNotificationHistory(organizationId, {
      startDate: startDate as string,
      endDate: endDate as string,
      type: type as string,
      status: status as string,
      limit: parseInt(limit as string)
    });

    res.json(history);
  } catch (error) {
    console.error('Error fetching notification history:', error);
    res.status(500).json({ error: 'Failed to fetch notification history' });
  }
});

// Get notification statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { startDate, endDate } = req.query;

    const stats = await communicationService.getNotificationStats(
      organizationId,
      startDate as string,
      endDate as string
    );

    res.json(stats);
  } catch (error) {
    console.error('Error fetching notification statistics:', error);
    res.status(500).json({ error: 'Failed to fetch notification statistics' });
  }
});

// Slack OAuth callback
router.get('/slack/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const result = await communicationService.handleSlackOAuthCallback(
      code as string,
      state as string
    );

    if (result.success) {
      res.redirect(`${process.env.CLIENT_URL}/settings/integrations?slack=success`);
    } else {
      res.redirect(`${process.env.CLIENT_URL}/settings/integrations?slack=error`);
    }
  } catch (error) {
    console.error('Error handling Slack OAuth callback:', error);
    res.redirect(`${process.env.CLIENT_URL}/settings/integrations?slack=error`);
  }
});

// Teams OAuth callback
router.get('/teams/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const result = await communicationService.handleTeamsOAuthCallback(
      code as string,
      state as string
    );

    if (result.success) {
      res.redirect(`${process.env.CLIENT_URL}/settings/integrations?teams=success`);
    } else {
      res.redirect(`${process.env.CLIENT_URL}/settings/integrations?teams=error`);
    }
  } catch (error) {
    console.error('Error handling Teams OAuth callback:', error);
    res.redirect(`${process.env.CLIENT_URL}/settings/integrations?teams=error`);
  }
});

// Get Slack channels
router.get('/slack/channels', requireAuth, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const channels = await communicationService.getSlackChannels(organizationId);

    res.json(channels);
  } catch (error) {
    console.error('Error fetching Slack channels:', error);
    res.status(500).json({ error: 'Failed to fetch Slack channels' });
  }
});

// Get Teams channels
router.get('/teams/channels', requireAuth, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const channels = await communicationService.getTeamsChannels(organizationId);

    res.json(channels);
  } catch (error) {
    console.error('Error fetching Teams channels:', error);
    res.status(500).json({ error: 'Failed to fetch Teams channels' });
  }
});

export default router;

