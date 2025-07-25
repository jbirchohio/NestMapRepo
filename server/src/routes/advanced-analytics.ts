import express from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/secureAuth';
import { addOrganizationScope } from '../middleware/organizationScope';
import { advancedAnalyticsService } from '../services/advancedAnalytics';

const router = express.Router();

// Validation schemas
const DashboardPeriodSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  type: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
});

const TravelDemandForecastSchema = z.object({
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('monthly'),
  includeFactors: z.array(z.enum(['seasonality', 'events', 'holidays', 'business_cycles'])).optional()
});

const CostOptimizationSchema = z.object({
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  focus: z.enum(['flights', 'hotels', 'ground_transport', 'meals', 'overall']).default('overall'),
  targetSavings: z.number().min(0).max(1).optional() // percentage
});

const BenchmarkingSchema = z.object({
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  industry: z.string().optional(),
  companySize: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
  region: z.string().optional()
});

const CustomReportSchema = z.object({
  name: z.string().min(1).max(255),
  metrics: z.array(z.string()),
  dimensions: z.array(z.string()),
  filters: z.record(z.any()).optional(),
  period: DashboardPeriodSchema,
  visualization: z.enum(['table', 'chart', 'dashboard']).default('table')
});

// Apply authentication and organization scoping to all routes
router.use(authenticate);
router.use(addOrganizationScope);

// Executive Dashboard

/**
 * @route GET /api/advanced-analytics/dashboard/executive
 * @desc Get executive dashboard with KPIs and trends
 * @access Private
 */
router.get('/dashboard/executive', async (req, res) => {
  try {
    const { start, end, type = 'monthly' } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({
        success: false,
        error: 'Start and end dates are required'
      });
    }

    const period = {
      start: new Date(start as string),
      end: new Date(end as string),
      type: type as string
    };

    const dashboard = await advancedAnalyticsService.generateExecutiveDashboard(
      req.organizationId!,
      period
    );

    res.json({
      success: true,
      data: dashboard,
      message: 'Executive dashboard generated successfully'
    });
  } catch (error) {
    console.error('Executive dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/advanced-analytics/dashboard/kpis
 * @desc Get key performance indicators
 * @access Private
 */
router.get('/dashboard/kpis', async (req, res) => {
  try {
    const { start, end, type = 'monthly' } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({
        success: false,
        error: 'Start and end dates are required'
      });
    }

    const period = {
      start: new Date(start as string),
      end: new Date(end as string),
      type: type as string
    };

    const dashboard = await advancedAnalyticsService.generateExecutiveDashboard(
      req.organizationId!,
      period
    );

    res.json({
      success: true,
      data: {
        kpis: dashboard.summary.kpis,
        trends: dashboard.trends
      },
      message: 'KPIs retrieved successfully'
    });
  } catch (error) {
    console.error('KPIs error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Travel Demand Forecasting

/**
 * @route POST /api/advanced-analytics/forecast/travel-demand
 * @desc Generate travel demand forecast
 * @access Private
 */
router.post('/forecast/travel-demand', async (req, res) => {
  try {
    const validatedData = TravelDemandForecastSchema.parse(req.body);

    const forecast = await advancedAnalyticsService.generateTravelDemandForecast(
      req.organizationId!,
      validatedData.period,
      {
        granularity: validatedData.granularity,
        includeFactors: validatedData.includeFactors || ['seasonality', 'business_cycles']
      }
    );

    res.json({
      success: true,
      data: forecast,
      message: 'Travel demand forecast generated successfully'
    });
  } catch (error) {
    console.error('Travel demand forecast error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : error.message
    });
  }
});

/**
 * @route GET /api/advanced-analytics/forecast/travel-demand/historical
 * @desc Get historical travel demand data for comparison
 * @access Private
 */
router.get('/forecast/travel-demand/historical', async (req, res) => {
  try {
    const { months = 12 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - Number(months));

    const forecast = await advancedAnalyticsService.generateTravelDemandForecast(
      req.organizationId!,
      { start: startDate, end: endDate },
      { granularity: 'monthly', includeFactors: ['seasonality'] }
    );

    res.json({
      success: true,
      data: {
        historical: forecast.predictions.slice(0, Number(months)),
        summary: forecast.summary
      },
      message: 'Historical travel demand data retrieved successfully'
    });
  } catch (error) {
    console.error('Historical travel demand error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cost Optimization Analysis

/**
 * @route POST /api/advanced-analytics/cost-optimization/analyze
 * @desc Analyze cost optimization opportunities
 * @access Private
 */
router.post('/cost-optimization/analyze', async (req, res) => {
  try {
    const validatedData = CostOptimizationSchema.parse(req.body);

    const analysis = await advancedAnalyticsService.generateCostOptimizationAnalysis(
      req.organizationId!,
      validatedData.period,
      {
        focus: validatedData.focus,
        targetSavings: validatedData.targetSavings
      }
    );

    res.json({
      success: true,
      data: analysis,
      message: 'Cost optimization analysis completed successfully'
    });
  } catch (error) {
    console.error('Cost optimization analysis error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : error.message
    });
  }
});

/**
 * @route GET /api/advanced-analytics/cost-optimization/recommendations
 * @desc Get cost optimization recommendations
 * @access Private
 */
router.get('/cost-optimization/recommendations', async (req, res) => {
  try {
    const { category, priority = 'all' } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3); // Last 3 months

    const analysis = await advancedAnalyticsService.generateCostOptimizationAnalysis(
      req.organizationId!,
      { start: startDate, end: endDate },
      { focus: 'overall' }
    );

    let recommendations = analysis.recommendations;

    if (category && typeof category === 'string') {
      recommendations = recommendations.filter(rec => rec.category === category);
    }

    if (priority !== 'all') {
      recommendations = recommendations.filter(rec => rec.priority === priority);
    }

    res.json({
      success: true,
      data: {
        recommendations,
        totalPotentialSavings: analysis.potentialSavings.total,
        count: recommendations.length
      },
      message: 'Cost optimization recommendations retrieved successfully'
    });
  } catch (error) {
    console.error('Cost optimization recommendations error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Compliance Monitoring

/**
 * @route GET /api/advanced-analytics/compliance/status
 * @desc Get compliance monitoring status
 * @access Private
 */
router.get('/compliance/status', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    const compliance = await advancedAnalyticsService.generateComplianceReport(
      req.organizationId!,
      { start: startDate, end: endDate }
    );

    res.json({
      success: true,
      data: {
        overallScore: compliance.overallScore,
        status: compliance.overallScore >= 90 ? 'excellent' : 
                compliance.overallScore >= 75 ? 'good' : 
                compliance.overallScore >= 60 ? 'needs_improvement' : 'critical',
        categories: compliance.categories,
        violations: compliance.violations.filter(v => v.severity === 'high').slice(0, 5),
        trends: compliance.trends
      },
      message: 'Compliance status retrieved successfully'
    });
  } catch (error) {
    console.error('Compliance status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/advanced-analytics/compliance/violations
 * @desc Get detailed compliance violations
 * @access Private
 */
router.get('/compliance/violations', async (req, res) => {
  try {
    const { severity, category, status = 'all', limit = 50 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1); // Last month

    const compliance = await advancedAnalyticsService.generateComplianceReport(
      req.organizationId!,
      { start: startDate, end: endDate }
    );

    let violations = compliance.violations;

    if (severity && typeof severity === 'string') {
      violations = violations.filter(v => v.severity === severity);
    }

    if (category && typeof category === 'string') {
      violations = violations.filter(v => v.category === category);
    }

    if (status !== 'all') {
      violations = violations.filter(v => v.status === status);
    }

    violations = violations.slice(0, Number(limit));

    res.json({
      success: true,
      data: {
        violations,
        summary: {
          total: compliance.violations.length,
          high: compliance.violations.filter(v => v.severity === 'high').length,
          medium: compliance.violations.filter(v => v.severity === 'medium').length,
          low: compliance.violations.filter(v => v.severity === 'low').length
        },
        count: violations.length
      },
      message: 'Compliance violations retrieved successfully'
    });
  } catch (error) {
    console.error('Compliance violations error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Benchmarking

/**
 * @route POST /api/advanced-analytics/benchmarking/compare
 * @desc Compare organization performance against industry benchmarks
 * @access Private
 */
router.post('/benchmarking/compare', async (req, res) => {
  try {
    const validatedData = BenchmarkingSchema.parse(req.body);

    const benchmarks = await advancedAnalyticsService.generateBenchmarkingReport(
      req.organizationId!,
      validatedData.period,
      {
        industry: validatedData.industry,
        companySize: validatedData.companySize,
        region: validatedData.region
      }
    );

    res.json({
      success: true,
      data: benchmarks,
      message: 'Benchmarking comparison completed successfully'
    });
  } catch (error) {
    console.error('Benchmarking comparison error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : error.message
    });
  }
});

/**
 * @route GET /api/advanced-analytics/benchmarking/metrics
 * @desc Get available benchmarking metrics
 * @access Private
 */
router.get('/benchmarking/metrics', async (req, res) => {
  try {
    const metrics = {
      cost: [
        'average_trip_cost',
        'cost_per_employee',
        'advance_booking_rate',
        'policy_compliance_rate'
      ],
      efficiency: [
        'booking_lead_time',
        'approval_time',
        'expense_processing_time',
        'traveler_satisfaction'
      ],
      sustainability: [
        'carbon_footprint_per_trip',
        'green_travel_percentage',
        'offset_participation_rate'
      ],
      risk: [
        'duty_of_care_score',
        'disruption_response_time',
        'emergency_contact_rate'
      ]
    };

    res.json({
      success: true,
      data: metrics,
      message: 'Benchmarking metrics retrieved successfully'
    });
  } catch (error) {
    console.error('Benchmarking metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Custom Reports

/**
 * @route POST /api/advanced-analytics/reports/custom
 * @desc Generate custom analytics report
 * @access Private
 */
router.post('/reports/custom', async (req, res) => {
  try {
    const validatedData = CustomReportSchema.parse(req.body);

    const report = await advancedAnalyticsService.generateCustomReport(
      req.organizationId!,
      {
        name: validatedData.name,
        metrics: validatedData.metrics,
        dimensions: validatedData.dimensions,
        filters: validatedData.filters || {},
        period: {
          start: new Date(validatedData.period.start),
          end: new Date(validatedData.period.end),
          type: validatedData.period.type
        },
        visualization: validatedData.visualization
      }
    );

    res.json({
      success: true,
      data: report,
      message: 'Custom report generated successfully'
    });
  } catch (error) {
    console.error('Custom report error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : error.message
    });
  }
});

// Data Export

/**
 * @route GET /api/advanced-analytics/export/dashboard
 * @desc Export dashboard data
 * @access Private
 */
router.get('/export/dashboard', async (req, res) => {
  try {
    const { start, end, type = 'monthly', format = 'json' } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({
        success: false,
        error: 'Start and end dates are required'
      });
    }

    const period = {
      start: new Date(start as string),
      end: new Date(end as string),
      type: type as string
    };

    const dashboard = await advancedAnalyticsService.generateExecutiveDashboard(
      req.organizationId!,
      period
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=dashboard-export.csv');
      
      // Convert dashboard data to CSV format
      const csvData = this.convertDashboardToCSV(dashboard);
      res.send(csvData);
    } else {
      res.json({
        success: true,
        data: dashboard,
        exportedAt: new Date().toISOString(),
        format: format
      });
    }
  } catch (error) {
    console.error('Dashboard export error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Analytics Health and Status

/**
 * @route GET /api/advanced-analytics/health
 * @desc Health check for advanced analytics service
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
          dashboard: 'active',
          forecasting: 'active',
          costOptimization: 'active',
          compliance: 'active',
          benchmarking: 'active',
          customReports: 'active'
        },
        cacheStatus: 'active',
        lastUpdate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Analytics health check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/advanced-analytics/capabilities
 * @desc Get advanced analytics capabilities
 * @access Private
 */
router.get('/capabilities', async (req, res) => {
  try {
    const capabilities = {
      dashboards: ['Executive', 'Operational', 'Financial', 'Compliance'],
      forecasting: ['Travel Demand', 'Cost Trends', 'Risk Assessment'],
      optimization: ['Cost Reduction', 'Policy Compliance', 'Sustainability'],
      benchmarking: ['Industry Comparison', 'Peer Analysis', 'Best Practices'],
      reporting: ['Custom Reports', 'Scheduled Reports', 'Real-time Alerts'],
      integrations: ['BI Tools', 'Data Warehouses', 'External APIs'],
      exportFormats: ['JSON', 'CSV', 'Excel', 'PDF'],
      updateFrequency: 'Real-time with 15-minute cache'
    };

    res.json({
      success: true,
      data: capabilities
    });
  } catch (error) {
    console.error('Analytics capabilities error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper method for CSV conversion
function convertDashboardToCSV(dashboard: any): string {
  const rows = [];
  
  // Add KPIs
  rows.push('Metric,Value,Change,Period');
  dashboard.summary.kpis.forEach((kpi: any) => {
    rows.push(`${kpi.name},${kpi.value},${kpi.change || 0},${kpi.period || 'N/A'}`);
  });
  
  return rows.join('\n');
}

export default router;
