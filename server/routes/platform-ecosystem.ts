import express from 'express';
import { z } from 'zod';
import PlatformEcosystemService from '../services/platformEcosystem.js';
import { secureAuth } from '../middleware/secureAuth.js';
import { organizationScoping } from '../middleware/organizationScoping.js';

const router = express.Router();
const platformService = new PlatformEcosystemService();

// Validation schemas
const createDeveloperSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  website: z.string().url().optional(),
  description: z.string().optional()
});

const createAppSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  category: z.enum(['booking', 'analytics', 'integration', 'communication', 'finance', 'hr', 'utility']),
  version: z.string(),
  pricing: z.object({
    model: z.enum(['free', 'freemium', 'subscription', 'usage_based', 'one_time']),
    price: z.number().min(0),
    currency: z.string().default('USD')
  }),
  permissions: z.array(z.string()),
  webhookUrl: z.string().url().optional(),
  supportEmail: z.string().email()
});

const createIntegrationSchema = z.object({
  appId: z.string(),
  configuration: z.record(z.any()),
  isActive: z.boolean().default(true)
});

const marketplaceFiltersSchema = z.object({
  category: z.string().optional(),
  pricing: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  featured: z.boolean().optional(),
  search: z.string().optional()
});

// Apply authentication and organization scoping to all routes
router.use(secureAuth);
router.use(organizationScoping);

// Developer Management Routes
router.post('/developers', async (req, res) => {
  try {
    const validatedData = createDeveloperSchema.parse(req.body);
    const developer = await platformService.registerDeveloper(validatedData);
    
    res.status(201).json({
      success: true,
      data: developer,
      message: 'Developer registered successfully'
    });
  } catch (error) {
    console.error('Create developer error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to register developer'
    });
  }
});

router.get('/developers/:developerId', async (req, res) => {
  try {
    const { developerId } = req.params;
    const developer = await platformService.getDeveloper(developerId);
    
    if (!developer) {
      return res.status(404).json({
        success: false,
        error: 'Developer not found'
      });
    }

    res.json({
      success: true,
      data: developer
    });
  } catch (error) {
    console.error('Get developer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get developer'
    });
  }
});

router.put('/developers/:developerId', async (req, res) => {
  try {
    const { developerId } = req.params;
    const updates = req.body;
    
    const developer = await platformService.updateDeveloper(developerId, updates);
    
    res.json({
      success: true,
      data: developer,
      message: 'Developer updated successfully'
    });
  } catch (error) {
    console.error('Update developer error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update developer'
    });
  }
});

// App Management Routes
router.post('/apps', async (req, res) => {
  try {
    const validatedData = createAppSchema.parse(req.body);
    const { developerId } = req.body;
    
    if (!developerId) {
      return res.status(400).json({
        success: false,
        error: 'Developer ID is required'
      });
    }

    const app = await platformService.submitApp(developerId, validatedData);
    
    res.status(201).json({
      success: true,
      data: app,
      message: 'App submitted successfully'
    });
  } catch (error) {
    console.error('Create app error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to submit app'
    });
  }
});

router.get('/apps', async (req, res) => {
  try {
    const filters = marketplaceFiltersSchema.parse(req.query);
    const apps = await platformService.getMarketplaceApps(filters);
    
    res.json({
      success: true,
      data: apps,
      count: apps.length
    });
  } catch (error) {
    console.error('Get apps error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get apps'
    });
  }
});

router.get('/apps/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const app = await platformService.getApp(appId);
    
    if (!app) {
      return res.status(404).json({
        success: false,
        error: 'App not found'
      });
    }

    res.json({
      success: true,
      data: app
    });
  } catch (error) {
    console.error('Get app error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get app'
    });
  }
});

router.put('/apps/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const updates = req.body;
    
    const app = await platformService.updateApp(appId, updates);
    
    res.json({
      success: true,
      data: app,
      message: 'App updated successfully'
    });
  } catch (error) {
    console.error('Update app error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update app'
    });
  }
});

router.post('/apps/:appId/review', async (req, res) => {
  try {
    const { appId } = req.params;
    const { action, comments } = req.body;
    
    if (!['approve', 'reject', 'request_changes'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid review action'
      });
    }

    const result = await platformService.reviewApp(appId, action, comments);
    
    res.json({
      success: true,
      data: result,
      message: `App ${action}d successfully`
    });
  } catch (error) {
    console.error('Review app error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to review app'
    });
  }
});

// API Key Management Routes
router.post('/api-keys', async (req, res) => {
  try {
    const { name, permissions, rateLimit } = req.body;
    const organizationId = req.organizationContext.id;
    
    const apiKey = await platformService.generateAPIKey(organizationId, name, permissions, rateLimit);
    
    res.status(201).json({
      success: true,
      data: apiKey,
      message: 'API key generated successfully'
    });
  } catch (error) {
    console.error('Generate API key error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to generate API key'
    });
  }
});

router.get('/api-keys', async (req, res) => {
  try {
    const organizationId = req.organizationContext.id;
    const apiKeys = await platformService.getAPIKeys(organizationId);
    
    res.json({
      success: true,
      data: apiKeys,
      count: apiKeys.length
    });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API keys'
    });
  }
});

router.delete('/api-keys/:keyId', async (req, res) => {
  try {
    const { keyId } = req.params;
    const organizationId = req.organizationContext.id;
    
    await platformService.revokeAPIKey(keyId, organizationId);
    
    res.json({
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to revoke API key'
    });
  }
});

// Integration Management Routes
router.post('/integrations', async (req, res) => {
  try {
    const validatedData = createIntegrationSchema.parse(req.body);
    const organizationId = req.organizationContext.id;
    
    const integration = await platformService.installApp(organizationId, validatedData.appId, validatedData.configuration);
    
    res.status(201).json({
      success: true,
      data: integration,
      message: 'App installed successfully'
    });
  } catch (error) {
    console.error('Install app error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to install app'
    });
  }
});

router.get('/integrations', async (req, res) => {
  try {
    const organizationId = req.organizationContext.id;
    const integrations = await platformService.getIntegrations(organizationId);
    
    res.json({
      success: true,
      data: integrations,
      count: integrations.length
    });
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get integrations'
    });
  }
});

router.put('/integrations/:integrationId', async (req, res) => {
  try {
    const { integrationId } = req.params;
    const { configuration, isActive } = req.body;
    const organizationId = req.organizationContext.id;
    
    const integration = await platformService.updateIntegration(integrationId, organizationId, { configuration, isActive });
    
    res.json({
      success: true,
      data: integration,
      message: 'Integration updated successfully'
    });
  } catch (error) {
    console.error('Update integration error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update integration'
    });
  }
});

router.delete('/integrations/:integrationId', async (req, res) => {
  try {
    const { integrationId } = req.params;
    const organizationId = req.organizationContext.id;
    
    await platformService.uninstallApp(integrationId, organizationId);
    
    res.json({
      success: true,
      message: 'App uninstalled successfully'
    });
  } catch (error) {
    console.error('Uninstall app error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to uninstall app'
    });
  }
});

// Marketplace Analytics Routes
router.get('/analytics/marketplace', async (req, res) => {
  try {
    const { period } = req.query;
    const periodObj = period ? JSON.parse(period as string) : {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    };
    
    const analytics = await platformService.getMarketplaceAnalytics(periodObj);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get marketplace analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get marketplace analytics'
    });
  }
});

router.get('/analytics/revenue', async (req, res) => {
  try {
    const { period } = req.query;
    const periodObj = period ? JSON.parse(period as string) : {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    };
    
    const revenue = await platformService.calculateRevenue(periodObj);
    
    res.json({
      success: true,
      data: revenue
    });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get revenue analytics'
    });
  }
});

// Platform Capabilities
router.get('/capabilities', async (req, res) => {
  try {
    const capabilities = platformService.getCapabilities();
    
    res.json({
      success: true,
      data: capabilities
    });
  } catch (error) {
    console.error('Get capabilities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get capabilities'
    });
  }
});

// Health Check
router.get('/health', async (req, res) => {
  try {
    const health = await platformService.healthCheck();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

export default router;
