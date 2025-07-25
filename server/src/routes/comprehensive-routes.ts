import { Router } from 'express';
import { z } from 'zod';
import { roleBasedDashboard } from '../services/role-based-dashboard';
import { securityCompliance } from '../services/security-compliance';
import { advancedAnalytics } from '../services/advanced-analytics';
import { globalScalability } from '../services/global-scalability';
import { authenticate } from '../middleware/secureAuth';
import { injectOrganizationContext } from '../middleware/organizationScoping';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Apply authentication and organization security to all routes
router.use(authenticate);
router.use(injectOrganizationContext);

// =============================================
// PHASE 3: USER EXPERIENCE OPTIMIZATION ROUTES
// =============================================

// Role-based dashboard generation
router.post('/api/ux/dashboard/generate', validateRequest(z.object({
  body: z.object({
    role: z.enum(['executive', 'travel_manager', 'finance', 'it_admin', 'employee']),
    timeframe: z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
    filters: z.object({
      department: z.string().optional(),
      location: z.string().optional(),
      budgetRange: z.object({
        min: z.number().optional(),
        max: z.number().optional(),
      }).optional(),
    }).optional(),
  }),
})), async (req, res) => {
  try {
    const { role, timeframe, filters } = req.body;
    const userId = req.user?.id;
    const organizationId = req.organizationId;

    if (!userId || !organizationId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const dashboard = await roleBasedDashboard.generateDashboard(
      { role, timeframe, filters },
      userId,
      organizationId
    );

    res.json({
      success: true,
      dashboard,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dashboard generation error:', error);
    res.status(500).json({ error: 'Failed to generate dashboard' });
  }
});

// Save custom dashboard layout
router.post('/api/ux/dashboard/layout', validateRequest(z.object({
  body: z.object({
    role: z.enum(['executive', 'travel_manager', 'finance', 'it_admin', 'employee']),
    widgets: z.array(z.object({
      widgetId: z.string(),
      position: z.object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
      }),
      settings: z.record(z.any()),
      isVisible: z.boolean(),
    })),
    theme: z.object({
      primaryColor: z.string(),
      secondaryColor: z.string(),
      layout: z.enum(['grid', 'masonry', 'flex']),
    }),
  }),
})), async (req, res) => {
  try {
    const layoutData = req.body;
    const userId = req.user?.id;
    const organizationId = req.organizationId;

    if (!userId || !organizationId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await roleBasedDashboard.saveDashboardLayout(layoutData, userId, organizationId);

    res.json({
      success: true,
      result,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dashboard layout save error:', error);
    res.status(500).json({ error: 'Failed to save dashboard layout' });
  }
});

// =============================================
// PHASE 4: SECURITY & COMPLIANCE ROUTES
// =============================================

// Implement zero-trust security
router.post('/api/security/zero-trust/implement', async (req, res) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization context required' });
    }

    const implementation = await securityCompliance.implementZeroTrustSecurity(organizationId);

    res.json({
      success: true,
      implementation,
      implementedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Zero-trust implementation error:', error);
    res.status(500).json({ error: 'Failed to implement zero-trust security' });
  }
});

// Setup multi-factor authentication
router.post('/api/security/mfa/setup', async (req, res) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization context required' });
    }

    const mfaConfig = await securityCompliance.setupMultiFactorAuth(organizationId);

    res.json({
      success: true,
      mfaConfig,
      setupAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({ error: 'Failed to setup multi-factor authentication' });
  }
});

// Configure single sign-on
router.post('/api/security/sso/configure', async (req, res) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization context required' });
    }

    const ssoConfig = await securityCompliance.configureSingleSignOn(organizationId);

    res.json({
      success: true,
      ssoConfig,
      configuredAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('SSO configuration error:', error);
    res.status(500).json({ error: 'Failed to configure single sign-on' });
  }
});

// Setup biometric authentication
router.post('/api/security/biometric/setup', async (req, res) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization context required' });
    }

    const biometricConfig = await securityCompliance.setupBiometricAuth(organizationId);

    res.json({
      success: true,
      biometricConfig,
      setupAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Biometric setup error:', error);
    res.status(500).json({ error: 'Failed to setup biometric authentication' });
  }
});

// Implement end-to-end encryption
router.post('/api/security/encryption/implement', async (req, res) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization context required' });
    }

    const encryptionConfig = await securityCompliance.implementEndToEndEncryption(organizationId);

    res.json({
      success: true,
      encryptionConfig,
      implementedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Encryption implementation error:', error);
    res.status(500).json({ error: 'Failed to implement end-to-end encryption' });
  }
});

// Manage compliance
router.post('/api/security/compliance/manage', async (req, res) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization context required' });
    }

    const complianceConfig = await securityCompliance.manageCompliance(organizationId);

    res.json({
      success: true,
      complianceConfig,
      managedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Compliance management error:', error);
    res.status(500).json({ error: 'Failed to manage compliance' });
  }
});

// Implement risk management
router.post('/api/security/risk/implement', async (req, res) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization context required' });
    }

    const riskManagement = await securityCompliance.implementRiskManagement(organizationId);

    res.json({
      success: true,
      riskManagement,
      implementedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Risk management implementation error:', error);
    res.status(500).json({ error: 'Failed to implement risk management' });
  }
});

// Generate security audit
router.post('/api/security/audit/generate', validateRequest(z.object({
  body: z.object({
    auditScope: z.object({
      areas: z.array(z.string()),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  }),
})), async (req, res) => {
  try {
    const { auditScope } = req.body;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization context required' });
    }

    const auditResults = await securityCompliance.generateSecurityAudit(organizationId, auditScope);

    res.json({
      success: true,
      auditResults,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Security audit generation error:', error);
    res.status(500).json({ error: 'Failed to generate security audit' });
  }
});

// =============================================
// PHASE 5: ADVANCED ANALYTICS & INSIGHTS ROUTES
// =============================================

// Generate predictive insights
router.post('/api/analytics/predictive/generate', validateRequest(z.object({
  body: z.object({
    analysisType: z.enum(['travel_demand', 'cost_optimization', 'risk_assessment', 'performance_prediction']),
    timeframe: z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      forecastPeriod: z.number().min(1).max(365),
    }),
    parameters: z.object({
      includeSeasonality: z.boolean().default(true),
      includeExternalFactors: z.boolean().default(true),
      confidenceLevel: z.number().min(0.8).max(0.99).default(0.95),
      granularity: z.enum(['daily', 'weekly', 'monthly', 'quarterly']).default('monthly'),
    }),
  }),
})), async (req, res) => {
  try {
    const { analysisType, timeframe, parameters } = req.body;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization context required' });
    }

    const insights = await advancedAnalytics.generatePredictiveInsights({
      organizationId,
      analysisType,
      timeframe,
      parameters,
    });

    res.json({
      success: true,
      insights,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Predictive insights generation error:', error);
    res.status(500).json({ error: 'Failed to generate predictive insights' });
  }
});

// Generate real-time decision support
router.post('/api/analytics/decision-support/generate', validateRequest(z.object({
  body: z.object({
    context: z.object({
      situation: z.string(),
      urgency: z.enum(['low', 'medium', 'high', 'critical']),
      constraints: z.array(z.string()),
      objectives: z.array(z.string()),
    }),
  }),
})), async (req, res) => {
  try {
    const { context } = req.body;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization context required' });
    }

    const decisionSupport = await advancedAnalytics.generateRealTimeDecisionSupport(organizationId, context);

    res.json({
      success: true,
      decisionSupport,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Decision support generation error:', error);
    res.status(500).json({ error: 'Failed to generate decision support' });
  }
});

// Analyze travel patterns
router.post('/api/analytics/patterns/analyze', validateRequest(z.object({
  body: z.object({
    timeframe: z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  }),
})), async (req, res) => {
  try {
    const { timeframe } = req.body;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization context required' });
    }

    const patterns = await advancedAnalytics.analyzeTravelPatterns(organizationId, timeframe);

    res.json({
      success: true,
      patterns,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Travel pattern analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze travel patterns' });
  }
});

// Generate benchmark analysis
router.post('/api/analytics/benchmark/generate', validateRequest(z.object({
  body: z.object({
    benchmarkType: z.enum(['industry', 'peer_group', 'historical', 'best_practice']),
    metrics: z.array(z.string()),
    industryVertical: z.string().optional(),
    companySize: z.enum(['small', 'medium', 'large', 'enterprise']).optional(),
  }),
})), async (req, res) => {
  try {
    const { benchmarkType, metrics, industryVertical, companySize } = req.body;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization context required' });
    }

    const benchmarkAnalysis = await advancedAnalytics.generateBenchmarkAnalysis({
      organizationId,
      benchmarkType,
      metrics,
      industryVertical,
      companySize,
    });

    res.json({
      success: true,
      benchmarkAnalysis,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Benchmark analysis generation error:', error);
    res.status(500).json({ error: 'Failed to generate benchmark analysis' });
  }
});

// Generate scenario analysis
router.post('/api/analytics/scenario/generate', validateRequest(z.object({
  body: z.object({
    scenarioName: z.string(),
    variables: z.array(z.object({
      name: z.string(),
      currentValue: z.number(),
      scenarioValue: z.number(),
      impact: z.enum(['low', 'medium', 'high']),
    })),
    timeframe: z.object({
      startDate: z.string(),
      endDate: z.string(),
    }),
  }),
})), async (req, res) => {
  try {
    const { scenarioName, variables, timeframe } = req.body;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization context required' });
    }

    const scenarioAnalysis = await advancedAnalytics.generateScenarioAnalysis({
      organizationId,
      scenarioName,
      variables,
      timeframe,
    });

    res.json({
      success: true,
      scenarioAnalysis,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Scenario analysis generation error:', error);
    res.status(500).json({ error: 'Failed to generate scenario analysis' });
  }
});

// =============================================
// PHASE 6: GLOBAL SCALABILITY & LOCALIZATION ROUTES
// =============================================

// Implement multi-region support
router.post('/api/global/multi-region/implement', validateRequest(z.object({
  body: z.object({
    deploymentStrategy: z.enum(['active-active', 'active-passive', 'multi-master']),
    regions: z.array(z.object({
      regionId: z.string(),
      location: z.string(),
      isPrimary: z.boolean(),
      capacity: z.object({
        maxUsers: z.number(),
        maxTransactions: z.number(),
        storageLimit: z.string(),
      }),
      infrastructure: z.object({
        provider: z.enum(['aws', 'azure', 'gcp', 'hybrid']),
        instances: z.array(z.object({
          type: z.string(),
          count: z.number(),
          autoScaling: z.boolean(),
        })),
        database: z.object({
          type: z.string(),
          replication: z.enum(['sync', 'async', 'semi-sync']),
          backupStrategy: z.string(),
        }),
      }),
    })),
    loadBalancing: z.object({
      strategy: z.enum(['round-robin', 'least-connections', 'geographic', 'weighted']),
      healthChecks: z.boolean(),
      failoverTime: z.number(),
    }),
  }),
})), async (req, res) => {
  try {
    const { deploymentStrategy, regions, loadBalancing } = req.body;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization context required' });
    }

    const implementation = await globalScalability.implementMultiRegionSupport({
      organizationId,
      deploymentStrategy,
      regions,
      loadBalancing,
    });

    res.json({
      success: true,
      implementation,
      implementedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Multi-region implementation error:', error);
    res.status(500).json({ error: 'Failed to implement multi-region support' });
  }
});

// Implement localization
router.post('/api/global/localization/implement', validateRequest(z.object({
  body: z.object({
    regions: z.array(z.object({
      regionCode: z.string(),
      countries: z.array(z.string()),
      languages: z.array(z.string()),
      currencies: z.array(z.string()),
      timeZones: z.array(z.string()),
      localizations: z.object({
        dateFormat: z.string(),
        numberFormat: z.string(),
        addressFormat: z.string(),
        phoneFormat: z.string(),
      }),
    })),
    defaultRegion: z.string(),
    fallbackLanguage: z.string().default('en'),
  }),
})), async (req, res) => {
  try {
    const { regions, defaultRegion, fallbackLanguage } = req.body;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization context required' });
    }

    const localization = await globalScalability.implementLocalization({
      organizationId,
      regions,
      defaultRegion,
      fallbackLanguage,
    });

    res.json({
      success: true,
      localization,
      implementedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Localization implementation error:', error);
    res.status(500).json({ error: 'Failed to implement localization' });
  }
});

// Setup enterprise infrastructure
router.post('/api/global/infrastructure/setup', async (req, res) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization context required' });
    }

    const infrastructure = await globalScalability.setupEnterpriseInfrastructure(organizationId);

    res.json({
      success: true,
      infrastructure,
      setupAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Infrastructure setup error:', error);
    res.status(500).json({ error: 'Failed to setup enterprise infrastructure' });
  }
});

// Optimize performance
router.post('/api/global/performance/optimize', validateRequest(z.object({
  body: z.object({
    optimizationTargets: z.array(z.enum(['latency', 'throughput', 'availability', 'cost'])),
    currentMetrics: z.object({
      averageResponseTime: z.number(),
      throughputRps: z.number(),
      uptime: z.number(),
      errorRate: z.number(),
    }),
    targetMetrics: z.object({
      averageResponseTime: z.number(),
      throughputRps: z.number(),
      uptime: z.number(),
      errorRate: z.number(),
    }),
  }),
})), async (req, res) => {
  try {
    const { optimizationTargets, currentMetrics, targetMetrics } = req.body;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization context required' });
    }

    const optimization = await globalScalability.optimizePerformance({
      organizationId,
      optimizationTargets,
      currentMetrics,
      targetMetrics,
    });

    res.json({
      success: true,
      optimization,
      optimizedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Performance optimization error:', error);
    res.status(500).json({ error: 'Failed to optimize performance' });
  }
});

// Implement disaster recovery
router.post('/api/global/disaster-recovery/implement', validateRequest(z.object({
  body: z.object({
    rtoTarget: z.number(),
    rpoTarget: z.number(),
    backupStrategy: z.object({
      frequency: z.enum(['continuous', 'hourly', 'daily', 'weekly']),
      retention: z.object({
        daily: z.number(),
        weekly: z.number(),
        monthly: z.number(),
        yearly: z.number(),
      }),
      crossRegion: z.boolean(),
      encryption: z.boolean(),
    }),
    failoverStrategy: z.object({
      automatic: z.boolean(),
      manual: z.boolean(),
      testingFrequency: z.enum(['monthly', 'quarterly', 'semi-annually']),
    }),
  }),
})), async (req, res) => {
  try {
    const { rtoTarget, rpoTarget, backupStrategy, failoverStrategy } = req.body;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization context required' });
    }

    const disasterRecovery = await globalScalability.implementDisasterRecovery({
      organizationId,
      rtoTarget,
      rpoTarget,
      backupStrategy,
      failoverStrategy,
    });

    res.json({
      success: true,
      disasterRecovery,
      implementedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Disaster recovery implementation error:', error);
    res.status(500).json({ error: 'Failed to implement disaster recovery' });
  }
});

// Enable global deployment
router.post('/api/global/deployment/enable', async (req, res) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization context required' });
    }

    const globalDeployment = await globalScalability.enableGlobalDeployment(organizationId);

    res.json({
      success: true,
      globalDeployment,
      enabledAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Global deployment enablement error:', error);
    res.status(500).json({ error: 'Failed to enable global deployment' });
  }
});

// Health check endpoint for comprehensive features
router.get('/api/comprehensive/health', async (req, res) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization context required' });
    }

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        roleBasedDashboard: 'operational',
        securityCompliance: 'operational',
        advancedAnalytics: 'operational',
        globalScalability: 'operational',
      },
      organizationId,
    };

    res.json(healthStatus);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

export default router;
