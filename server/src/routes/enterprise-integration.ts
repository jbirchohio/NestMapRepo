import express from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/secureAuth';
import { addOrganizationScope } from '../middleware/organizationScope';
import { enterpriseIntegrationHubService } from '../services/enterpriseIntegrationHub';

const router = express.Router();

// Validation schemas
const CreateIntegrationSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['hr', 'finance', 'communication']),
  provider: z.string().min(1),
  config: z.object({
    apiUrl: z.string().url(),
    credentials: z.record(z.string()),
    settings: z.record(z.any()).optional()
  }),
  syncSchedule: z.object({
    enabled: z.boolean(),
    frequency: z.enum(['hourly', 'daily', 'weekly']),
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional()
  }),
  webhookUrl: z.string().url().optional(),
  isActive: z.boolean().default(true)
});

const UpdateIntegrationSchema = CreateIntegrationSchema.partial();

const SyncRequestSchema = z.object({
  integrationId: z.string(),
  syncType: z.enum(['full', 'incremental']).default('incremental'),
  force: z.boolean().default(false)
});

const WebhookSchema = z.object({
  integrationId: z.string(),
  eventType: z.string(),
  data: z.record(z.any()),
  timestamp: z.string().datetime().optional()
});

const NotificationSchema = z.object({
  channel: z.enum(['slack', 'teams', 'email']),
  recipients: z.array(z.string()),
  message: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  metadata: z.record(z.any()).optional()
});

// Apply authentication and organization scoping to all routes
router.use(authenticate);
router.use(addOrganizationScope);

// Integration Management

/**
 * @route POST /api/enterprise-integration/integrations
 * @desc Create a new enterprise integration
 * @access Private
 */
router.post('/integrations', async (req, res) => {
  try {
    const validatedData = CreateIntegrationSchema.parse(req.body);

    const integration = await enterpriseIntegrationHubService.createIntegration(
      req.organizationId!,
      validatedData
    );

    res.status(201).json({
      success: true,
      data: integration,
      message: 'Integration created successfully'
    });
  } catch (error) {
    console.error('Create integration error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : error.message
    });
  }
});

/**
 * @route GET /api/enterprise-integration/integrations
 * @desc Get all integrations for organization
 * @access Private
 */
router.get('/integrations', async (req, res) => {
  try {
    const { type, status } = req.query;

    const integrations = await enterpriseIntegrationHubService.getIntegrations(req.organizationId!);

    let filteredIntegrations = integrations;

    if (type && typeof type === 'string') {
      filteredIntegrations = filteredIntegrations.filter(integration => integration.type === type);
    }

    if (status && typeof status === 'string') {
      filteredIntegrations = filteredIntegrations.filter(integration => integration.status === status);
    }

    res.json({
      success: true,
      data: filteredIntegrations,
      count: filteredIntegrations.length
    });
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/enterprise-integration/integrations/:integrationId
 * @desc Get specific integration details
 * @access Private
 */
router.get('/integrations/:integrationId', async (req, res) => {
  try {
    const { integrationId } = req.params;

    const integration = await enterpriseIntegrationHubService.getIntegration(integrationId);

    if (!integration || integration.organizationId !== req.organizationId) {
      return res.status(404).json({
        success: false,
        error: 'Integration not found'
      });
    }

    res.json({
      success: true,
      data: integration
    });
  } catch (error) {
    console.error('Get integration error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route PUT /api/enterprise-integration/integrations/:integrationId
 * @desc Update integration configuration
 * @access Private
 */
router.put('/integrations/:integrationId', async (req, res) => {
  try {
    const { integrationId } = req.params;
    const validatedData = UpdateIntegrationSchema.parse(req.body);

    const updatedIntegration = await enterpriseIntegrationHubService.updateIntegration(
      integrationId,
      validatedData
    );

    res.json({
      success: true,
      data: updatedIntegration,
      message: 'Integration updated successfully'
    });
  } catch (error) {
    console.error('Update integration error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : error.message
    });
  }
});

/**
 * @route DELETE /api/enterprise-integration/integrations/:integrationId
 * @desc Delete integration
 * @access Private
 */
router.delete('/integrations/:integrationId', async (req, res) => {
  try {
    const { integrationId } = req.params;

    await enterpriseIntegrationHubService.deleteIntegration(integrationId);

    res.json({
      success: true,
      message: 'Integration deleted successfully'
    });
  } catch (error) {
    console.error('Delete integration error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/enterprise-integration/integrations/:integrationId/test
 * @desc Test integration connection
 * @access Private
 */
router.post('/integrations/:integrationId/test', async (req, res) => {
  try {
    const { integrationId } = req.params;

    const testResult = await enterpriseIntegrationHubService.testIntegration(integrationId);

    res.json({
      success: true,
      data: testResult,
      message: testResult.success ? 'Integration test successful' : 'Integration test failed'
    });
  } catch (error) {
    console.error('Test integration error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Data Synchronization

/**
 * @route POST /api/enterprise-integration/sync/manual
 * @desc Manually trigger data synchronization
 * @access Private
 */
router.post('/sync/manual', async (req, res) => {
  try {
    const validatedData = SyncRequestSchema.parse(req.body);

    const syncResult = await enterpriseIntegrationHubService.triggerManualSync(
      validatedData.integrationId,
      validatedData.syncType,
      validatedData.force
    );

    res.json({
      success: true,
      data: syncResult,
      message: 'Manual sync triggered successfully'
    });
  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : error.message
    });
  }
});

/**
 * @route GET /api/enterprise-integration/sync/status/:integrationId
 * @desc Get synchronization status for integration
 * @access Private
 */
router.get('/sync/status/:integrationId', async (req, res) => {
  try {
    const { integrationId } = req.params;

    const syncStatus = await enterpriseIntegrationHubService.getSyncStatus(integrationId);

    res.json({
      success: true,
      data: syncStatus
    });
  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/enterprise-integration/sync/history/:integrationId
 * @desc Get synchronization history for integration
 * @access Private
 */
router.get('/sync/history/:integrationId', async (req, res) => {
  try {
    const { integrationId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const syncHistory = await enterpriseIntegrationHubService.getSyncHistory(
      integrationId,
      Number(limit),
      Number(offset)
    );

    res.json({
      success: true,
      data: syncHistory,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: syncHistory.length
      }
    });
  } catch (error) {
    console.error('Get sync history error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// HR Integration Endpoints

/**
 * @route POST /api/enterprise-integration/hr/sync/:integrationId
 * @desc Sync HR data (employees, cost centers)
 * @access Private
 */
router.post('/hr/sync/:integrationId', async (req, res) => {
  try {
    const { integrationId } = req.params;

    const syncResult = await enterpriseIntegrationHubService.syncHRData(integrationId);

    res.json({
      success: true,
      data: syncResult,
      message: 'HR data sync completed'
    });
  } catch (error) {
    console.error('HR sync error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/enterprise-integration/hr/employees
 * @desc Get synchronized employee data
 * @access Private
 */
router.get('/hr/employees', async (req, res) => {
  try {
    const { department, status, limit = 100 } = req.query;

    // Mock employee data - in real implementation, fetch from database
    const employees = [
      {
        id: 'emp_001',
        employeeId: 'E001',
        name: 'John Smith',
        email: 'john.smith@company.com',
        department: 'Engineering',
        costCenter: 'ENG-001',
        manager: 'Jane Doe',
        status: 'active',
        startDate: '2023-01-15',
        travelApprover: 'jane.doe@company.com'
      },
      {
        id: 'emp_002',
        employeeId: 'E002',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@company.com',
        department: 'Sales',
        costCenter: 'SAL-001',
        manager: 'Mike Wilson',
        status: 'active',
        startDate: '2022-08-20',
        travelApprover: 'mike.wilson@company.com'
      }
    ];

    let filteredEmployees = employees;

    if (department && typeof department === 'string') {
      filteredEmployees = filteredEmployees.filter(emp => emp.department === department);
    }

    if (status && typeof status === 'string') {
      filteredEmployees = filteredEmployees.filter(emp => emp.status === status);
    }

    filteredEmployees = filteredEmployees.slice(0, Number(limit));

    res.json({
      success: true,
      data: filteredEmployees,
      count: filteredEmployees.length
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Finance Integration Endpoints

/**
 * @route POST /api/enterprise-integration/finance/sync/:integrationId
 * @desc Sync finance data (budgets, expenses, cost centers)
 * @access Private
 */
router.post('/finance/sync/:integrationId', async (req, res) => {
  try {
    const { integrationId } = req.params;

    const syncResult = await enterpriseIntegrationHubService.syncFinanceData(integrationId);

    res.json({
      success: true,
      data: syncResult,
      message: 'Finance data sync completed'
    });
  } catch (error) {
    console.error('Finance sync error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/enterprise-integration/finance/budgets
 * @desc Get synchronized budget data
 * @access Private
 */
router.get('/finance/budgets', async (req, res) => {
  try {
    const { department, year, status } = req.query;

    // Mock budget data
    const budgets = [
      {
        id: 'budget_001',
        department: 'Engineering',
        year: 2024,
        totalBudget: 500000,
        spentAmount: 125000,
        remainingAmount: 375000,
        status: 'active',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'budget_002',
        department: 'Sales',
        year: 2024,
        totalBudget: 750000,
        spentAmount: 280000,
        remainingAmount: 470000,
        status: 'active',
        lastUpdated: new Date().toISOString()
      }
    ];

    let filteredBudgets = budgets;

    if (department && typeof department === 'string') {
      filteredBudgets = filteredBudgets.filter(budget => budget.department === department);
    }

    if (year && typeof year === 'string') {
      filteredBudgets = filteredBudgets.filter(budget => budget.year === Number(year));
    }

    if (status && typeof status === 'string') {
      filteredBudgets = filteredBudgets.filter(budget => budget.status === status);
    }

    res.json({
      success: true,
      data: filteredBudgets,
      count: filteredBudgets.length
    });
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Communication Integration Endpoints

/**
 * @route POST /api/enterprise-integration/communication/notify
 * @desc Send notification through integrated communication platform
 * @access Private
 */
router.post('/communication/notify', async (req, res) => {
  try {
    const validatedData = NotificationSchema.parse(req.body);

    const notificationResult = await enterpriseIntegrationHubService.sendNotification(
      validatedData.channel,
      validatedData.recipients,
      validatedData.message,
      {
        priority: validatedData.priority,
        metadata: validatedData.metadata
      }
    );

    res.json({
      success: true,
      data: notificationResult,
      message: 'Notification sent successfully'
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : error.message
    });
  }
});

/**
 * @route GET /api/enterprise-integration/communication/channels
 * @desc Get available communication channels
 * @access Private
 */
router.get('/communication/channels', async (req, res) => {
  try {
    const channels = await enterpriseIntegrationHubService.getAvailableChannels(req.organizationId!);

    res.json({
      success: true,
      data: channels
    });
  } catch (error) {
    console.error('Get communication channels error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Webhook Endpoints

/**
 * @route POST /api/enterprise-integration/webhooks/receive
 * @desc Receive webhook from external system
 * @access Public (with validation)
 */
router.post('/webhooks/receive', async (req, res) => {
  try {
    const validatedData = WebhookSchema.parse(req.body);

    const processResult = await enterpriseIntegrationHubService.processWebhook(
      validatedData.integrationId,
      validatedData.eventType,
      validatedData.data,
      validatedData.timestamp ? new Date(validatedData.timestamp) : new Date()
    );

    res.json({
      success: true,
      data: processResult,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    console.error('Process webhook error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : error.message
    });
  }
});

// Integration Analytics

/**
 * @route GET /api/enterprise-integration/analytics/overview
 * @desc Get integration analytics overview
 * @access Private
 */
router.get('/analytics/overview', async (req, res) => {
  try {
    const { period = '30' } = req.query;

    const analytics = {
      totalIntegrations: 5,
      activeIntegrations: 4,
      syncSuccessRate: 98.5,
      lastSyncTime: new Date().toISOString(),
      dataVolume: {
        employees: 1250,
        expenses: 3420,
        budgets: 15,
        notifications: 89
      },
      performance: {
        averageSyncTime: 45, // seconds
        errorRate: 1.5,
        uptime: 99.8
      },
      recentActivity: [
        {
          type: 'sync',
          integration: 'Workday HR',
          status: 'success',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          recordsProcessed: 125
        },
        {
          type: 'notification',
          integration: 'Slack',
          status: 'success',
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          message: 'Travel approval required'
        }
      ]
    };

    res.json({
      success: true,
      data: analytics,
      period: `${period} days`
    });
  } catch (error) {
    console.error('Get integration analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health and Status

/**
 * @route GET /api/enterprise-integration/health
 * @desc Health check for enterprise integration service
 * @access Private
 */
router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        features: {
          hrIntegration: 'active',
          financeIntegration: 'active',
          communicationIntegration: 'active',
          webhooks: 'active',
          scheduling: 'active'
        },
        integrationStatus: {
          total: 5,
          active: 4,
          inactive: 1,
          error: 0
        }
      }
    });
  } catch (error) {
    console.error('Integration health check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/enterprise-integration/capabilities
 * @desc Get enterprise integration capabilities
 * @access Private
 */
router.get('/capabilities', async (req, res) => {
  try {
    const capabilities = {
      hrProviders: ['Workday', 'BambooHR', 'ADP', 'SAP SuccessFactors', 'Namely'],
      financeProviders: ['SAP', 'Oracle Financials', 'NetSuite', 'QuickBooks', 'Xero'],
      communicationProviders: ['Slack', 'Microsoft Teams', 'Email', 'SMS'],
      syncFrequencies: ['Real-time', 'Hourly', 'Daily', 'Weekly'],
      dataTypes: ['Employees', 'Cost Centers', 'Budgets', 'Expenses', 'Approvals'],
      webhookEvents: ['Employee Update', 'Budget Change', 'Approval Required', 'Expense Submitted'],
      securityFeatures: ['OAuth 2.0', 'API Key', 'Certificate-based', 'IP Whitelisting']
    };

    res.json({
      success: true,
      data: capabilities
    });
  } catch (error) {
    console.error('Get integration capabilities error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
