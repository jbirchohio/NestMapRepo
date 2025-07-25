import { Router } from 'express';
import { z } from 'zod';
import { aiTripOptimizer } from '../services/ai-trip-optimizer';
import { contextualAIAssistant } from '../services/contextual-ai-assistant';
import { authenticate } from '../middleware/secureAuth';
import { injectOrganizationContext } from '../middleware/organizationScoping';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Apply authentication and organization security to all routes
router.use(authenticate);
router.use(injectOrganizationContext);

// Schemas for request validation
const FlightPredictionRequestSchema = z.object({
  route: z.string().min(1, 'Route is required'),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
});

const ItineraryOptimizationRequestSchema = z.object({
  destinations: z.array(z.object({
    city: z.string(),
    country: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    flexibleDates: z.boolean().default(false),
    budgetConstraint: z.number().optional(),
  })),
  travelDates: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date format'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format'),
    flexibility: z.number().min(0).max(7).default(0),
  }),
  preferences: z.object({
    budget: z.object({
      max: z.number().positive(),
      priority: z.enum(['cost', 'time', 'comfort']),
    }),
    travelClass: z.enum(['economy', 'premium_economy', 'business', 'first']),
    directFlights: z.boolean().default(false),
    carbonFootprint: z.boolean().default(false),
  }),
  meetingSchedule: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
    duration: z.number().positive(),
    location: z.string(),
    attendees: z.number().positive(),
  })).optional(),
});

const AssistantQuerySchema = z.object({
  query: z.string().min(1, 'Query is required'),
  context: z.object({
    currentTrip: z.string().optional(),
    location: z.string().optional(),
    timeZone: z.string().optional(),
    urgency: z.enum(['low', 'medium', 'high']).default('medium'),
  }).optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.string(),
  })).optional(),
});

const PolicyComplianceSchema = z.object({
  tripDetails: z.object({
    destination: z.string(),
    travelDates: z.object({
      startDate: z.string(),
      endDate: z.string(),
    }),
    budget: z.number(),
    travelClass: z.string(),
    purpose: z.string(),
    duration: z.number(),
  }),
});

const MeetingOptimizationSchema = z.object({
  meetingDetails: z.object({
    title: z.string(),
    date: z.string(),
    duration: z.number(),
    attendees: z.array(z.object({
      name: z.string(),
      location: z.string(),
      timeZone: z.string(),
    })),
    venue: z.object({
      name: z.string().optional(),
      address: z.string().optional(),
      city: z.string(),
      country: z.string(),
    }),
    budget: z.number().optional(),
  }),
});

const EmergencyAssistanceSchema = z.object({
  emergency: z.object({
    type: z.enum(['flight_delay', 'cancellation', 'medical', 'security', 'weather', 'other']),
    description: z.string(),
    location: z.string(),
    urgency: z.enum(['low', 'medium', 'high', 'critical']),
    contactInfo: z.string().optional(),
  }),
});

/**
 * @route POST /api/ai/predict-flight-prices
 * @desc Predict flight prices with 90-day forecasting
 * @access Private
 */
router.post('/predict-flight-prices', 
  validateRequest(FlightPredictionRequestSchema),
  async (req, res) => {
    try {
      const { route, travelDate } = req.body;
      
      const prediction = await aiTripOptimizer.predictFlightPrices(route, travelDate);
      
      res.json({
        success: true,
        data: prediction,
        message: 'Flight price prediction generated successfully',
      });
    } catch (error) {
      console.error('Flight price prediction error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to predict flight prices',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route POST /api/ai/optimize-itinerary
 * @desc Optimize travel itinerary with AI
 * @access Private
 */
router.post('/optimize-itinerary',
  validateRequest(ItineraryOptimizationRequestSchema),
  async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id;
      
      if (!organizationId || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID and User ID are required',
        });
      }

      const optimizationRequest = {
        organizationId,
        userId,
        ...req.body,
      };
      
      const optimization = await aiTripOptimizer.optimizeItinerary(optimizationRequest);
      
      res.json({
        success: true,
        data: optimization,
        message: 'Itinerary optimized successfully',
      });
    } catch (error) {
      console.error('Itinerary optimization error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to optimize itinerary',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route GET /api/ai/budget-analysis
 * @desc Get AI-powered budget optimization analysis
 * @access Private
 */
router.get('/budget-analysis', async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    const timeframe = req.query.timeframe as string || '90d';
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required',
      });
    }
    
    const analysis = await aiTripOptimizer.analyzeBudgetOptimization(organizationId, timeframe);
    
    res.json({
      success: true,
      data: analysis,
      message: 'Budget analysis generated successfully',
    });
  } catch (error) {
    console.error('Budget analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate budget analysis',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route GET /api/ai/travel-alerts/:tripId
 * @desc Get proactive travel alerts for a trip
 * @access Private
 */
router.get('/travel-alerts/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;
    
    const alerts = await aiTripOptimizer.getProactiveTravelAlerts(tripId);
    
    res.json({
      success: true,
      data: alerts,
      message: 'Travel alerts generated successfully',
    });
  } catch (error) {
    console.error('Travel alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate travel alerts',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route POST /api/ai/assistant
 * @desc Process AI assistant query
 * @access Private
 */
router.post('/assistant',
  validateRequest(AssistantQuerySchema),
  async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id;
      
      if (!organizationId || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID and User ID are required',
        });
      }

      const assistantRequest = {
        organizationId,
        userId,
        ...req.body,
      };
      
      const response = await contextualAIAssistant.processAssistantQuery(assistantRequest);
      
      res.json({
        success: true,
        data: response,
        message: 'Assistant query processed successfully',
      });
    } catch (error) {
      console.error('Assistant query error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process assistant query',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route POST /api/ai/check-policy-compliance
 * @desc Check travel policy compliance
 * @access Private
 */
router.post('/check-policy-compliance',
  validateRequest(PolicyComplianceSchema),
  async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID is required',
        });
      }

      const { tripDetails } = req.body;
      
      const compliance = await contextualAIAssistant.checkPolicyCompliance(organizationId, tripDetails);
      
      res.json({
        success: true,
        data: compliance,
        message: 'Policy compliance checked successfully',
      });
    } catch (error) {
      console.error('Policy compliance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check policy compliance',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route POST /api/ai/optimize-meeting-travel
 * @desc Optimize travel for business meetings
 * @access Private
 */
router.post('/optimize-meeting-travel',
  validateRequest(MeetingOptimizationSchema),
  async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID is required',
        });
      }

      const { meetingDetails } = req.body;
      
      const optimization = await contextualAIAssistant.optimizeMeetingTravel(organizationId, meetingDetails);
      
      res.json({
        success: true,
        data: optimization,
        message: 'Meeting travel optimized successfully',
      });
    } catch (error) {
      console.error('Meeting travel optimization error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to optimize meeting travel',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route POST /api/ai/emergency-assistance
 * @desc Handle emergency travel assistance
 * @access Private
 */
router.post('/emergency-assistance',
  validateRequest(EmergencyAssistanceSchema),
  async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id;
      
      if (!organizationId || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID and User ID are required',
        });
      }

      const { emergency } = req.body;
      
      const assistance = await contextualAIAssistant.handleEmergencyAssistance(organizationId, userId, emergency);
      
      res.json({
        success: true,
        data: assistance,
        message: 'Emergency assistance provided successfully',
      });
    } catch (error) {
      console.error('Emergency assistance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to provide emergency assistance',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
