import { Router } from 'express';
import { z } from 'zod';
import { enterpriseAnalytics } from '../services/enterprise-analytics';
import { enterpriseIntegrationHub } from '../services/enterprise-integration-hub';
import { roleBasedExperience } from '../services/role-based-experience';
import { mobileExperience } from '../services/mobile-experience';
import { authenticate } from '../middleware/secureAuth';
import { validateRequest } from '../middleware/validation';
import { injectOrganizationContext } from '../middleware/organizationScoping';

const router = Router();

// Apply authentication and organization security to all routes
router.use(authenticate);
router.use(injectOrganizationContext);

// Validation schemas
const TimeframeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
});

const IntegrationConfigSchema = z.object({
  type: z.enum(['hr', 'finance', 'communication', 'calendar', 'expense']),
  provider: z.string(),
  credentials: z.object({
    apiKey: z.string().optional(),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    baseUrl: z.string().optional(),
  }),
  settings: z.record(z.any()).optional(),
  active: z.boolean().default(true),
});

const MobileConfigSchema = z.object({
  deviceInfo: z.object({
    platform: z.enum(['ios', 'android', 'web']),
    version: z.string(),
    deviceId: z.string(),
    pushToken: z.string().optional(),
  }),
  preferences: z.object({
    offlineMode: z.boolean().default(true),
    pushNotifications: z.boolean().default(true),
    locationServices: z.boolean().default(true),
    biometricAuth: z.boolean().default(false),
  }),
  features: z.object({
    voiceBooking: z.boolean().default(false),
    photoExpenses: z.boolean().default(true),
    quickActions: z.array(z.string()),
    emergencyMode: z.boolean().default(true),
  }),
});

// =============================================================================
// ANALYTICS & REPORTING ROUTES
// =============================================================================

/**
 * @route GET /api/enterprise/analytics/executive-dashboard
 * @desc Get executive dashboard with key metrics
 * @access Private
 */
router.get('/analytics/executive-dashboard', async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const { startDate, endDate } = req.query;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required',
      });
    }

    const timeframe = {
      startDate: startDate as string || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: endDate as string || new Date().toISOString().split('T')[0],
    };

    const dashboard = await enterpriseAnalytics.generateExecutiveDashboard(organizationId, timeframe);
    
    res.json({
      success: true,
      data: dashboard,
      message: 'Executive dashboard generated successfully',
    });
  } catch (error) {
    console.error('Executive dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate executive dashboard',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route GET /api/enterprise/analytics/travel-forecast
 * @desc Get travel demand forecast
 * @access Private
 */
router.get('/analytics/travel-forecast', async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const forecastPeriod = parseInt(req.query.period as string) || 90;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required',
      });
    }

    const forecast = await enterpriseAnalytics.generateTravelDemandForecast(organizationId, forecastPeriod);
    
    res.json({
      success: true,
      data: forecast,
      message: 'Travel demand forecast generated successfully',
    });
  } catch (error) {
    console.error('Travel forecast error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate travel forecast',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route POST /api/enterprise/analytics/custom-report
 * @desc Generate custom analytics report
 * @access Private
 */
router.post('/analytics/custom-report', async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const reportConfig = req.body;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required',
      });
    }

    const report = await enterpriseAnalytics.generateCustomReport(organizationId, reportConfig);
    
    res.json({
      success: true,
      data: report,
      message: 'Custom report generated successfully',
    });
  } catch (error) {
    console.error('Custom report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate custom report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route GET /api/enterprise/analytics/vendor-performance
 * @desc Analyze vendor performance
 * @access Private
 */
router.get('/analytics/vendor-performance', 
  validateRequest(z.object({ query: TimeframeSchema })),
  async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      const { startDate, endDate } = req.query;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID is required',
        });
      }

      const timeframe = { startDate: startDate as string, endDate: endDate as string };
      const analysis = await enterpriseAnalytics.analyzeVendorPerformance(organizationId, timeframe);
      
      res.json({
        success: true,
        data: analysis,
        message: 'Vendor performance analysis completed successfully',
      });
    } catch (error) {
      console.error('Vendor performance analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze vendor performance',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route GET /api/enterprise/analytics/real-time-insights
 * @desc Get real-time travel insights
 * @access Private
 */
router.get('/analytics/real-time-insights', async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required',
      });
    }

    const insights = await enterpriseAnalytics.generateRealTimeInsights(organizationId);
    
    res.json({
      success: true,
      data: insights,
      message: 'Real-time insights generated successfully',
    });
  } catch (error) {
    console.error('Real-time insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate real-time insights',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// =============================================================================
// INTEGRATION HUB ROUTES
// =============================================================================

/**
 * @route POST /api/enterprise/integrations/hr
 * @desc Configure HR system integration
 * @access Private
 */
router.post('/integrations/hr',
  validateRequest(IntegrationConfigSchema),
  async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID is required',
        });
      }

      const result = await enterpriseIntegrationHub.configureHRIntegration(organizationId, req.body);
      
      res.json({
        success: true,
        data: result,
        message: 'HR integration configured successfully',
      });
    } catch (error) {
      console.error('HR integration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to configure HR integration',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route POST /api/enterprise/integrations/sync-employees
 * @desc Sync employee directory from HR system
 * @access Private
 */
router.post('/integrations/sync-employees', async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required',
      });
    }

    const result = await enterpriseIntegrationHub.syncEmployeeDirectory(organizationId);
    
    res.json({
      success: true,
      data: result,
      message: 'Employee directory synchronized successfully',
    });
  } catch (error) {
    console.error('Employee sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync employee directory',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route POST /api/enterprise/integrations/expense
 * @desc Configure expense management integration
 * @access Private
 */
router.post('/integrations/expense',
  validateRequest(IntegrationConfigSchema),
  async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID is required',
        });
      }

      const result = await enterpriseIntegrationHub.configureExpenseIntegration(organizationId, req.body);
      
      res.json({
        success: true,
        data: result,
        message: 'Expense integration configured successfully',
      });
    } catch (error) {
      console.error('Expense integration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to configure expense integration',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// =============================================================================
// ROLE-BASED EXPERIENCE ROUTES
// =============================================================================

/**
 * @route GET /api/enterprise/experience/executive
 * @desc Get executive user experience
 * @access Private
 */
router.get('/experience/executive', async (req, res) => {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organizationId;
    
    if (!userId || !organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Organization ID are required',
      });
    }

    const experience = await roleBasedExperience.getExecutiveExperience(userId, organizationId);
    
    res.json({
      success: true,
      data: experience,
      message: 'Executive experience retrieved successfully',
    });
  } catch (error) {
    console.error('Executive experience error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get executive experience',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route GET /api/enterprise/experience/travel-manager
 * @desc Get travel manager user experience
 * @access Private
 */
router.get('/experience/travel-manager', async (req, res) => {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organizationId;
    
    if (!userId || !organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Organization ID are required',
      });
    }

    const experience = await roleBasedExperience.getTravelManagerExperience(userId, organizationId);
    
    res.json({
      success: true,
      data: experience,
      message: 'Travel manager experience retrieved successfully',
    });
  } catch (error) {
    console.error('Travel manager experience error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get travel manager experience',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route GET /api/enterprise/experience/personalized
 * @desc Get personalized user experience
 * @access Private
 */
router.get('/experience/personalized', async (req, res) => {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organizationId;
    
    if (!userId || !organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Organization ID are required',
      });
    }

    const experience = await roleBasedExperience.getPersonalizedExperience(userId, organizationId);
    
    res.json({
      success: true,
      data: experience,
      message: 'Personalized experience retrieved successfully',
    });
  } catch (error) {
    console.error('Personalized experience error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get personalized experience',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// =============================================================================
// MOBILE EXPERIENCE ROUTES
// =============================================================================

/**
 * @route POST /api/enterprise/mobile/configure
 * @desc Configure mobile experience
 * @access Private
 */
router.post('/mobile/configure',
  validateRequest(MobileConfigSchema),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const config = { userId, ...req.body };
      const result = await mobileExperience.configureMobileExperience(config);
      
      res.json({
        success: true,
        data: result,
        message: 'Mobile experience configured successfully',
      });
    } catch (error) {
      console.error('Mobile configuration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to configure mobile experience',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route GET /api/enterprise/mobile/offline-data
 * @desc Get offline data for mobile app
 * @access Private
 */
router.get('/mobile/offline-data', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    const offlineData = await mobileExperience.prepareOfflineData(userId);
    
    res.json({
      success: true,
      data: offlineData,
      message: 'Offline data prepared successfully',
    });
  } catch (error) {
    console.error('Offline data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to prepare offline data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route GET /api/enterprise/mobile/dashboard
 * @desc Get mobile dashboard
 * @access Private
 */
router.get('/mobile/dashboard', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    const dashboard = await mobileExperience.getMobileDashboard(userId);
    
    res.json({
      success: true,
      data: dashboard,
      message: 'Mobile dashboard retrieved successfully',
    });
  } catch (error) {
    console.error('Mobile dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get mobile dashboard',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route POST /api/enterprise/mobile/emergency
 * @desc Handle emergency assistance
 * @access Private
 */
router.post('/mobile/emergency', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { emergencyType, location } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    const result = await mobileExperience.handleEmergencyAssistance(userId, emergencyType, location);
    
    res.json({
      success: true,
      data: result,
      message: 'Emergency assistance activated successfully',
    });
  } catch (error) {
    console.error('Emergency assistance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle emergency assistance',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
