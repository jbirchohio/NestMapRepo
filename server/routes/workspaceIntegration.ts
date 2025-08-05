import { Router } from 'express';
import { workspaceIntegrationService } from '../services/workspaceIntegrationService';
import { jwtAuthMiddleware } from '../middleware/jwtAuth';
import { requireOrganizationContext } from '../organizationContext';

const router = Router();

// Apply auth to all routes
router.use(jwtAuthMiddleware);

// Connect Google Calendar
router.post('/google/connect', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const { authCode } = req.body;

    if (!authCode) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    await workspaceIntegrationService.connectGoogleCalendar(
      req.user.id,
      authCode
    );

    res.json({ success: true, message: 'Google Calendar connected successfully' });
  } catch (error) {
    console.error('Error connecting Google Calendar:', error);
    res.status(500).json({ error: 'Failed to connect Google Calendar' });
  }
});

// Connect Microsoft 365
router.post('/microsoft/connect', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const { authCode } = req.body;

    if (!authCode) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    await workspaceIntegrationService.connectMicrosoft365(
      req.user.id,
      authCode
    );

    res.json({ success: true, message: 'Microsoft 365 connected successfully' });
  } catch (error) {
    console.error('Error connecting Microsoft 365:', error);
    res.status(500).json({ error: 'Failed to connect Microsoft 365' });
  }
});

// Sync calendar
router.post('/sync/:provider', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const provider = req.params.provider;

    if (!['google', 'microsoft'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    if (provider === 'google') {
      await workspaceIntegrationService.syncGoogleCalendar(req.user.id);
    } else {
      await workspaceIntegrationService.syncMicrosoft365Calendar(req.user.id);
    }

    res.json({ success: true, message: `${provider} calendar synced successfully` });
  } catch (error) {
    console.error(`Error syncing ${req.params.provider} calendar:`, error);
    res.status(500).json({ error: 'Failed to sync calendar' });
  }
});

// Create calendar event
router.post('/calendar/event', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    await workspaceIntegrationService.createCalendarEvent(
      req.user.id,
      req.body
    );

    res.json({ success: true, message: 'Event created successfully' });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});

// Send email
router.post('/email/send', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const { subject, body, recipients, cc } = req.body;

    if (!subject || !body || !recipients || recipients.length === 0) {
      return res.status(400).json({ 
        error: 'Subject, body, and recipients required' 
      });
    }

    await workspaceIntegrationService.sendEmail(req.user.id, {
      subject,
      body,
      recipients,
      cc
    });

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Import contacts
router.get('/contacts/:provider', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const provider = req.params.provider as 'google' | 'outlook';

    if (!['google', 'outlook'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const contacts = await workspaceIntegrationService.importContacts(
      req.user.id,
      provider
    );

    res.json(contacts);
  } catch (error) {
    console.error(`Error importing ${req.params.provider} contacts:`, error);
    res.status(500).json({ error: 'Failed to import contacts' });
  }
});

// Get OAuth URLs for connection
router.get('/oauth-urls', (req, res) => {
  const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&` +
    `response_type=code&` +
    `scope=https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/contacts.readonly&` +
    `access_type=offline&` +
    `prompt=consent`;

  const microsoftOAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
    `client_id=${process.env.MICROSOFT_CLIENT_ID}&` +
    `redirect_uri=${process.env.MICROSOFT_REDIRECT_URI}&` +
    `response_type=code&` +
    `scope=calendars.readwrite mail.send contacts.read offline_access&` +
    `response_mode=query`;

  res.json({
    google: googleOAuthUrl,
    microsoft: microsoftOAuthUrl
  });
});

export default router;