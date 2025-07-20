import { Router } from 'express';
import { z } from 'zod';
import { predictiveBusinessIntelligenceService } from '../services/predictiveBusinessIntelligence';
import { authenticate } from '../middleware/secureAuth';
import { addOrganizationScope } from '../middleware/organizationScoping';

const router = Router();

// Validation schemas
const roiPredictionSchema = z.object({
  period: z.object({
    start: z.string().transform(str => new Date(str)),
    end: z.string().transform(str => new Date(str))
  }),
  scenarios: z.array(z.string()).optional(),
  factors: z.array(z.string()).optional()
});

const marketTrendSchema = z.object({
  markets: z.array(z.string()),
  timeframe: z.number().min(1).max(24),
  indicators: z.array(z.string()).optional()
});

const competitorAnalysisSchema = z.object({
  competitors: z.array(z.string()),
  metrics: z.array(z.string()).optional(),
  benchmarks: z.array(z.string()).optional()
});

const economicModelingSchema = z.object({
  scenarios: z.array(z.object({
    name: z.string(),
    parameters: z.record(z.any())
  })),
  timeframe: z.number().min(1).max(60),
  variables: z.array(z.string()).optional()
});

const behavioralAnalysisSchema = z.object({
  segments: z.array(z.string()).optional(),
  timeframe: z.number().min(1).max(12),
  patterns: z.array(z.string()).optional()
});

// Travel ROI Prediction Routes
router.post('/roi/predict', async (req, res) => {
  try {
    const validatedData = roiPredictionSchema.parse(req.body);
    const organizationId = (req as any).organizationId || 1; // Fallback for now
    
    const prediction = await predictiveBusinessIntelligenceService.generateTravelROIPrediction(
      organizationId,
      validatedData.period,
      {
        includeScenarios: validatedData.scenarios ? true : false,
        confidenceThreshold: 0.8
      }
    );  
    // validatedData.factors
    
    res.json({
      success: true,
      data: prediction,
      message: 'ROI prediction generated successfully'
    });
  } catch (error) {
    console.error('ROI prediction error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to generate ROI prediction'
    });
  }
});

router.get('/roi/history', async (req, res) => {
  try {
    const organizationId = req.organizationContext.id;
    const { limit = 10, offset = 0 } = req.query;
    
    const history = await predictiveService.getROIPredictionHistory(
      organizationId,
      parseInt(limit as string),
      parseInt(offset as string)
    );
    
    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    console.error('Get ROI history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ROI prediction history'
    });
  }
});

router.get('/roi/factors', async (req, res) => {
  try {
    const organizationId = req.organizationContext.id;
    const factors = await predictiveService.getROIFactors(organizationId);
    
    res.json({
      success: true,
      data: factors
    });
  } catch (error) {
    console.error('Get ROI factors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ROI factors'
    });
  }
});

// Market Trend Forecasting Routes
router.post('/market-trends/forecast', async (req, res) => {
  try {
    const validatedData = marketTrendSchema.parse(req.body);
    const organizationId = req.organizationContext.id;
    
    const forecast = await predictiveService.forecastMarketTrends(
      organizationId,
      validatedData.markets,
      validatedData.timeframe,
      validatedData.indicators
    );
    
    res.json({
      success: true,
      data: forecast,
      message: 'Market trend forecast generated successfully'
    });
  } catch (error) {
    console.error('Market trend forecast error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to generate market trend forecast'
    });
  }
});

router.get('/market-trends/current', async (req, res) => {
  try {
    const { markets } = req.query;
    const marketList = markets ? (markets as string).split(',') : [];
    
    const trends = await predictiveService.getCurrentMarketTrends(marketList);
    
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Get current market trends error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current market trends'
    });
  }
});

router.get('/market-trends/indicators', async (req, res) => {
  try {
    const indicators = await predictiveService.getMarketIndicators();
    
    res.json({
      success: true,
      data: indicators
    });
  } catch (error) {
    console.error('Get market indicators error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get market indicators'
    });
  }
});

// Competitive Intelligence Routes
router.post('/competitive-intelligence/analyze', async (req, res) => {
  try {
    const validatedData = competitorAnalysisSchema.parse(req.body);
    const organizationId = req.organizationContext.id;
    
    const analysis = await predictiveService.analyzeCompetitiveIntelligence(
      organizationId,
      validatedData.competitors,
      validatedData.metrics,
      validatedData.benchmarks
    );
    
    res.json({
      success: true,
      data: analysis,
      message: 'Competitive intelligence analysis completed successfully'
    });
  } catch (error) {
    console.error('Competitive intelligence error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to analyze competitive intelligence'
    });
  }
});

router.get('/competitive-intelligence/competitors', async (req, res) => {
  try {
    const { industry, region } = req.query;
    const competitors = await predictiveService.getCompetitors(
      industry as string,
      region as string
    );
    
    res.json({
      success: true,
      data: competitors
    });
  } catch (error) {
    console.error('Get competitors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get competitors'
    });
  }
});

router.get('/competitive-intelligence/benchmarks', async (req, res) => {
  try {
    const organizationId = req.organizationContext.id;
    const { category } = req.query;
    
    const benchmarks = await predictiveService.getIndustryBenchmarks(
      organizationId,
      category as string
    );
    
    res.json({
      success: true,
      data: benchmarks
    });
  } catch (error) {
    console.error('Get benchmarks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get industry benchmarks'
    });
  }
});

// Economic Impact Modeling Routes
router.post('/economic-modeling/simulate', async (req, res) => {
  try {
    const validatedData = economicModelingSchema.parse(req.body);
    const organizationId = req.organizationContext.id;
    
    const modeling = await predictiveService.modelEconomicImpact(
      organizationId,
      validatedData.scenarios,
      validatedData.timeframe,
      validatedData.variables
    );
    
    res.json({
      success: true,
      data: modeling,
      message: 'Economic impact modeling completed successfully'
    });
  } catch (error) {
    console.error('Economic modeling error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to model economic impact'
    });
  }
});

router.get('/economic-modeling/scenarios', async (req, res) => {
  try {
    const scenarios = await predictiveService.getEconomicScenarios();
    
    res.json({
      success: true,
      data: scenarios
    });
  } catch (error) {
    console.error('Get economic scenarios error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get economic scenarios'
    });
  }
});

// Behavioral Pattern Analysis Routes
router.post('/behavioral-analysis/analyze', async (req, res) => {
  try {
    const validatedData = behavioralAnalysisSchema.parse(req.body);
    const organizationId = req.organizationContext.id;
    
    const analysis = await predictiveService.analyzeBehavioralPatterns(
      organizationId,
      validatedData.segments,
      validatedData.timeframe,
      validatedData.patterns
    );
    
    res.json({
      success: true,
      data: analysis,
      message: 'Behavioral pattern analysis completed successfully'
    });
  } catch (error) {
    console.error('Behavioral analysis error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to analyze behavioral patterns'
    });
  }
});

router.get('/behavioral-analysis/segments', async (req, res) => {
  try {
    const organizationId = req.organizationContext.id;
    const segments = await predictiveService.getTravelerSegments(organizationId);
    
    res.json({
      success: true,
      data: segments
    });
  } catch (error) {
    console.error('Get traveler segments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get traveler segments'
    });
  }
});

router.get('/behavioral-analysis/patterns', async (req, res) => {
  try {
    const organizationId = req.organizationContext.id;
    const { segment, timeframe = 6 } = req.query;
    
    const patterns = await predictiveService.getBehavioralPatterns(
      organizationId,
      segment as string,
      parseInt(timeframe as string)
    );
    
    res.json({
      success: true,
      data: patterns
    });
  } catch (error) {
    console.error('Get behavioral patterns error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get behavioral patterns'
    });
  }
});

// Strategic Insights Routes
router.post('/strategic-insights/generate', async (req, res) => {
  try {
    const organizationId = req.organizationContext.id;
    const { focus_areas, timeframe = 12 } = req.body;
    
    const insights = await predictiveService.generateStrategicInsights(
      organizationId,
      focus_areas,
      timeframe
    );
    
    res.json({
      success: true,
      data: insights,
      message: 'Strategic insights generated successfully'
    });
  } catch (error) {
    console.error('Generate strategic insights error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to generate strategic insights'
    });
  }
});

router.get('/strategic-insights/recommendations', async (req, res) => {
  try {
    const organizationId = req.organizationContext.id;
    const { category, priority } = req.query;
    
    const recommendations = await predictiveService.getStrategicRecommendations(
      organizationId,
      category as string,
      priority as string
    );
    
    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Get strategic recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get strategic recommendations'
    });
  }
});

// Analytics Dashboard Routes
router.get('/dashboard/executive', async (req, res) => {
  try {
    const organizationId = req.organizationContext.id;
    const { period } = req.query;
    
    const periodObj = period ? JSON.parse(period as string) : {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    };
    
    const dashboard = await predictiveService.getExecutiveDashboard(organizationId, periodObj);
    
    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Get executive dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get executive dashboard'
    });
  }
});

router.get('/dashboard/predictive', async (req, res) => {
  try {
    const organizationId = req.organizationContext.id;
    const dashboard = await predictiveService.getPredictiveDashboard(organizationId);
    
    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Get predictive dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get predictive dashboard'
    });
  }
});

// Data Export Routes
router.post('/export/predictions', async (req, res) => {
  try {
    const organizationId = req.organizationContext.id;
    const { format = 'json', types, period } = req.body;
    
    const exportData = await predictiveService.exportPredictions(
      organizationId,
      format,
      types,
      period
    );
    
    res.json({
      success: true,
      data: exportData,
      message: 'Predictions exported successfully'
    });
  } catch (error) {
    console.error('Export predictions error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to export predictions'
    });
  }
});

// Service Capabilities
router.get('/capabilities', async (req, res) => {
  try {
    const capabilities = predictiveService.getCapabilities();
    
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
    const health = await predictiveService.healthCheck();
    
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
