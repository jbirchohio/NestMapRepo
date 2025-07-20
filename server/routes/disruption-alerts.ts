import { Router } from 'express';
import { z } from 'zod';
import { disruptionPredictionService } from '../services/disruptionPrediction';
import { authenticate } from '../middleware/secureAuth';
import { addOrganizationScope } from '../middleware/organizationScoping';

const router = Router();

// Validation schemas
const flightPredictionSchema = z.object({
  flightNumber: z.string().min(1),
  route: z.object({
    origin: z.string().min(3).max(3),
    destination: z.string().min(3).max(3)
  }),
  scheduledDeparture: z.string().datetime(),
  lookAheadHours: z.number().min(1).max(72).optional().default(12)
});

const alertSubscriptionSchema = z.object({
  flightNumbers: z.array(z.string()).optional(),
  airports: z.array(z.string()).optional(),
  alertTypes: z.array(z.enum(['flight_delay', 'weather', 'strike', 'airport_congestion', 'security_delay', 'mechanical', 'air_traffic'])).optional(),
  severityThreshold: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  notificationMethods: z.array(z.enum(['email', 'sms', 'push', 'voice'])).optional().default(['push'])
});

// Apply authentication and organization scoping to all routes
router.use(authenticate);
router.use(addOrganizationScope);

/**
 * @route POST /api/disruption-alerts/predict/flight
 * @desc Predict disruptions for a specific flight
 * @access Private
 */
router.post('/predict/flight', async (req, res) => {
  try {
    const { flightNumber, route, scheduledDeparture, lookAheadHours } = flightPredictionSchema.parse(req.body);

    const alerts = await disruptionPredictionService.predictFlightDelays(
      flightNumber,
      route,
      new Date(scheduledDeparture),
      lookAheadHours
    );

    res.json({
      success: true,
      data: {
        flightNumber,
        route,
        scheduledDeparture,
        lookAheadHours,
        alerts: alerts.map(alert => ({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          probability: alert.probability,
          predictedTime: alert.predictedTime,
          description: alert.description,
          recommendations: alert.recommendations,
          estimatedDuration: alert.estimatedDuration,
          confidence: alert.confidence,
          sources: alert.sources,
          createdAt: alert.createdAt,
          expiresAt: alert.expiresAt
        })),
        summary: {
          totalAlerts: alerts.length,
          highPriorityAlerts: alerts.filter(a => a.severity === 'high' || a.severity === 'critical').length,
          averageProbability: alerts.length > 0 ? alerts.reduce((sum, a) => sum + a.probability, 0) / alerts.length : 0,
          recommendedActions: alerts.filter(a => a.recommendations.some(r => r.actionRequired)).length
        }
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      });
    }

    console.error('Flight disruption prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to predict flight disruptions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/disruption-alerts/active
 * @desc Get all active disruption alerts
 * @access Private
 */
router.get('/active', async (req, res) => {
  try {
    const severityFilter = req.query.severity as string;
    const typeFilter = req.query.type as string;
    const airportFilter = req.query.airport as string;

    let alerts = await disruptionPredictionService.getActiveAlerts();

    // Apply filters
    if (severityFilter) {
      alerts = alerts.filter(alert => alert.severity === severityFilter);
    }

    if (typeFilter) {
      alerts = alerts.filter(alert => alert.type === typeFilter);
    }

    if (airportFilter) {
      alerts = alerts.filter(alert => alert.affectedAirports.includes(airportFilter));
    }

    // Sort by severity and probability
    alerts.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.probability - a.probability;
    });

    res.json({
      success: true,
      data: {
        alerts: alerts.map(alert => ({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          probability: alert.probability,
          predictedTime: alert.predictedTime,
          affectedFlights: alert.affectedFlights,
          affectedAirports: alert.affectedAirports,
          description: alert.description,
          recommendations: alert.recommendations,
          estimatedDuration: alert.estimatedDuration,
          confidence: alert.confidence,
          sources: alert.sources,
          createdAt: alert.createdAt,
          expiresAt: alert.expiresAt
        })),
        summary: {
          totalAlerts: alerts.length,
          bySeverity: {
            critical: alerts.filter(a => a.severity === 'critical').length,
            high: alerts.filter(a => a.severity === 'high').length,
            medium: alerts.filter(a => a.severity === 'medium').length,
            low: alerts.filter(a => a.severity === 'low').length
          },
          byType: alerts.reduce((acc, alert) => {
            acc[alert.type] = (acc[alert.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          affectedAirports: [...new Set(alerts.flatMap(a => a.affectedAirports))],
          affectedFlights: [...new Set(alerts.flatMap(a => a.affectedFlights))]
        }
      }
    });

  } catch (error) {
    console.error('Active alerts retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve active alerts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/disruption-alerts/flight/:flightNumber
 * @desc Get alerts for a specific flight
 * @access Private
 */
router.get('/flight/:flightNumber', async (req, res) => {
  try {
    const { flightNumber } = req.params;

    const alerts = await disruptionPredictionService.getAlertsForFlight(flightNumber);

    res.json({
      success: true,
      data: {
        flightNumber,
        alerts: alerts.map(alert => ({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          probability: alert.probability,
          predictedTime: alert.predictedTime,
          description: alert.description,
          recommendations: alert.recommendations,
          estimatedDuration: alert.estimatedDuration,
          confidence: alert.confidence,
          sources: alert.sources,
          createdAt: alert.createdAt,
          expiresAt: alert.expiresAt
        })),
        summary: {
          totalAlerts: alerts.length,
          highestSeverity: alerts.length > 0 ? alerts.reduce((max, alert) => {
            const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return severityOrder[alert.severity] > severityOrder[max] ? alert.severity : max;
          }, 'low') : null,
          averageProbability: alerts.length > 0 ? alerts.reduce((sum, a) => sum + a.probability, 0) / alerts.length : 0
        }
      }
    });

  } catch (error) {
    console.error('Flight alerts retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve flight alerts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/disruption-alerts/airport/:airport
 * @desc Get alerts for a specific airport
 * @access Private
 */
router.get('/airport/:airport', async (req, res) => {
  try {
    const { airport } = req.params;

    const alerts = await disruptionPredictionService.getAlertsForAirport(airport.toUpperCase());

    res.json({
      success: true,
      data: {
        airport: airport.toUpperCase(),
        alerts: alerts.map(alert => ({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          probability: alert.probability,
          predictedTime: alert.predictedTime,
          affectedFlights: alert.affectedFlights,
          description: alert.description,
          recommendations: alert.recommendations,
          estimatedDuration: alert.estimatedDuration,
          confidence: alert.confidence,
          sources: alert.sources,
          createdAt: alert.createdAt,
          expiresAt: alert.expiresAt
        })),
        summary: {
          totalAlerts: alerts.length,
          bySeverity: {
            critical: alerts.filter(a => a.severity === 'critical').length,
            high: alerts.filter(a => a.severity === 'high').length,
            medium: alerts.filter(a => a.severity === 'medium').length,
            low: alerts.filter(a => a.severity === 'low').length
          },
          byType: alerts.reduce((acc, alert) => {
            acc[alert.type] = (acc[alert.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          affectedFlights: [...new Set(alerts.flatMap(a => a.affectedFlights))]
        }
      }
    });

  } catch (error) {
    console.error('Airport alerts retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve airport alerts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/disruption-alerts/subscribe
 * @desc Subscribe to disruption alerts
 * @access Private
 */
router.post('/subscribe', async (req, res) => {
  try {
    const subscription = alertSubscriptionSchema.parse(req.body);
    const userId = req.user!.id;
    const organizationId = req.organization!.id;

    // In a real implementation, this would store the subscription in the database
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    res.json({
      success: true,
      data: {
        subscriptionId,
        subscription: {
          ...subscription,
          userId,
          organizationId,
          createdAt: new Date(),
          isActive: true
        }
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription data',
        errors: error.errors
      });
    }

    console.error('Alert subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create alert subscription',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/disruption-alerts/subscriptions
 * @desc Get user's alert subscriptions
 * @access Private
 */
router.get('/subscriptions', async (req, res) => {
  try {
    const userId = req.user!.id;

    // In a real implementation, this would fetch from the database
    const subscriptions = [
      {
        id: 'sub_example_1',
        flightNumbers: ['AA123', 'DL456'],
        airports: ['LAX', 'JFK'],
        alertTypes: ['flight_delay', 'weather'],
        severityThreshold: 'medium',
        notificationMethods: ['push', 'email'],
        isActive: true,
        createdAt: new Date(),
        lastTriggered: null
      }
    ];

    res.json({
      success: true,
      data: {
        subscriptions,
        summary: {
          totalSubscriptions: subscriptions.length,
          activeSubscriptions: subscriptions.filter(s => s.isActive).length,
          monitoredFlights: [...new Set(subscriptions.flatMap(s => s.flightNumbers || []))],
          monitoredAirports: [...new Set(subscriptions.flatMap(s => s.airports || []))]
        }
      }
    });

  } catch (error) {
    console.error('Subscriptions retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve subscriptions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route PUT /api/disruption-alerts/subscriptions/:subscriptionId
 * @desc Update alert subscription
 * @access Private
 */
router.put('/subscriptions/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const updates = alertSubscriptionSchema.partial().parse(req.body);
    const userId = req.user!.id;

    // In a real implementation, this would update the subscription in the database
    res.json({
      success: true,
      data: {
        subscriptionId,
        updates,
        updatedAt: new Date()
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid update data',
        errors: error.errors
      });
    }

    console.error('Subscription update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route DELETE /api/disruption-alerts/subscriptions/:subscriptionId
 * @desc Delete alert subscription
 * @access Private
 */
router.delete('/subscriptions/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const userId = req.user!.id;

    // In a real implementation, this would delete the subscription from the database
    res.json({
      success: true,
      message: 'Subscription deleted successfully'
    });

  } catch (error) {
    console.error('Subscription deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete subscription',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/disruption-alerts/analytics
 * @desc Get disruption analytics and trends
 * @access Private
 */
router.get('/analytics', async (req, res) => {
  try {
    const timeframe = req.query.timeframe as string || '30d';
    const organizationId = req.organization!.id;

    // Simulate analytics data
    const analytics = {
      timeframe,
      totalAlerts: 156,
      alertsByType: {
        flight_delay: 45,
        weather: 38,
        airport_congestion: 32,
        mechanical: 18,
        air_traffic: 15,
        security_delay: 8
      },
      alertsBySeverity: {
        critical: 12,
        high: 34,
        medium: 67,
        low: 43
      },
      accuracyMetrics: {
        overallAccuracy: 0.87,
        falsePositiveRate: 0.08,
        falseNegativeRate: 0.05,
        averageLeadTime: 8.5 // hours
      },
      topAffectedAirports: [
        { airport: 'LAX', alertCount: 23 },
        { airport: 'JFK', alertCount: 19 },
        { airport: 'ORD', alertCount: 16 },
        { airport: 'ATL', alertCount: 14 },
        { airport: 'DFW', alertCount: 12 }
      ],
      trends: {
        weeklyTrend: [
          { week: '2024-01-01', alerts: 32 },
          { week: '2024-01-08', alerts: 28 },
          { week: '2024-01-15', alerts: 35 },
          { week: '2024-01-22', alerts: 31 }
        ],
        hourlyDistribution: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          alerts: Math.floor(Math.random() * 20) + 5
        }))
      }
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Analytics retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/disruption-alerts/test
 * @desc Test disruption prediction system (development only)
 * @access Private
 */
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      success: false,
      message: 'Test endpoint only available in development'
    });
  }

  try {
    const { scenario } = z.object({
      scenario: z.enum(['weather_delay', 'airport_congestion', 'mechanical_issue', 'strike'])
    }).parse(req.body);

    // Generate test alert based on scenario
    const testAlert = {
      id: `test_${Date.now()}`,
      type: scenario === 'weather_delay' ? 'weather' : 
            scenario === 'airport_congestion' ? 'airport_congestion' :
            scenario === 'mechanical_issue' ? 'mechanical' : 'strike',
      severity: 'medium' as const,
      probability: 0.75,
      predictedTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      affectedFlights: ['TEST123'],
      affectedAirports: ['LAX'],
      description: `Test ${scenario} scenario`,
      recommendations: [
        {
          type: 'rebook' as const,
          description: 'Consider rebooking to avoid disruption',
          estimatedCost: 100,
          timeSaving: 60,
          priority: 'medium' as const,
          actionRequired: false
        }
      ],
      estimatedDuration: 90,
      confidence: 0.8,
      sources: ['test_system'],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };

    res.json({
      success: true,
      data: {
        scenario,
        testAlert
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test scenario',
        errors: error.errors
      });
    }

    console.error('Test alert generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate test alert',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
