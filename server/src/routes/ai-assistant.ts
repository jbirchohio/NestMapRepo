import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Apply JWT authentication to all AI assistant routes
router.use(authenticateJWT);

// Validation schemas
const querySchema = z.object({
  query: z.string().min(1),
  context: z.object({
    urgency: z.enum(['low', 'medium', 'high']).optional(),
    timeZone: z.string().optional(),
    location: z.string().optional(),
    budget: z.number().optional(),
    travelDates: z.object({
      start: z.string().optional(),
      end: z.string().optional()
    }).optional()
  }).optional()
});

// Helper function to analyze query and generate response
const processAIQuery = async (query: string, context: any = {}) => {
  const lowerQuery = query.toLowerCase();
  
  // Travel options query
  if (lowerQuery.includes('travel options') || lowerQuery.includes('trip') && lowerQuery.includes('budget')) {
    const destination = extractDestination(query);
    const budget = context.budget || extractBudget(query);
    
    return {
      response: `Based on your query for travel options to ${destination || 'your destination'} with a budget ${budget ? `under $${budget}` : 'consideration'}, here are some recommendations:`,
      suggestions: [
        {
          type: 'flight',
          option: 'Economy Class Direct Flight',
          cost: budget ? Math.min(budget * 0.7, 800) : 600,
          duration: '6h 45m',
          pros: ['Direct route', 'Good value', 'Flexible cancellation']
        },
        {
          type: 'flight',
          option: 'Premium Economy with 1 Stop',
          cost: budget ? Math.min(budget * 0.8, 1200) : 900,
          duration: '9h 20m',
          pros: ['More legroom', 'Better meals', 'Priority boarding']
        },
        {
          type: 'accommodation',
          option: 'Business Hotel Downtown',
          cost: budget ? Math.min(budget * 0.3, 400) : 250,
          duration: 'per night',
          pros: ['Central location', 'Meeting facilities', 'Airport shuttle']
        }
      ],
      actionItems: [
        'Check flight availability for your preferred dates',
        'Compare hotel options in the business district',
        'Review company travel policy for approval requirements',
        'Consider travel insurance options'
      ],
      totalEstimatedCost: budget ? Math.min(budget * 0.9, 1500) : 1200,
      urgency: context.urgency || 'medium'
    };
  }
  
  // General travel planning
  if (lowerQuery.includes('plan') || lowerQuery.includes('organize')) {
    return {
      response: 'I can help you plan your trip comprehensively. Let me break down what we need to organize:',
      suggestions: [
        {
          type: 'planning_step',
          option: 'Define Trip Objectives',
          description: 'Clarify business goals, meetings, and deliverables'
        },
        {
          type: 'planning_step', 
          option: 'Transportation Planning',
          description: 'Book flights, arrange ground transportation'
        },
        {
          type: 'planning_step',
          option: 'Accommodation & Logistics',
          description: 'Hotel booking, meeting room reservations'
        }
      ],
      actionItems: [
        'Create detailed itinerary with all meetings',
        'Book travel within company policy guidelines',
        'Set up expense tracking for the trip',
        'Prepare necessary travel documents'
      ]
    };
  }
  
  // Default intelligent response
  return {
    response: `I understand you're asking about: "${query}". I'm here to help with travel planning, booking, and optimization.`,
    suggestions: [
      {
        type: 'capability',
        option: 'Flight Search & Booking',
        description: 'Find and book flights with real-time pricing'
      },
      {
        type: 'capability',
        option: 'Travel Policy Compliance',
        description: 'Ensure all bookings meet company guidelines'
      },
      {
        type: 'capability',
        option: 'Itinerary Management',
        description: 'Organize and optimize your travel schedule'
      }
    ],
    actionItems: [
      'Specify your travel requirements',
      'Review available options and pricing',
      'Complete booking with policy compliance check'
    ]
  };
};

// Helper functions for extraction
const extractDestination = (query: string): string | null => {
  const patterns = [
    /to\s+([A-Za-z\s]+?)(?:\s+next|\s+on|\s+under|\s*$)/i,
    /visit\s+([A-Za-z\s]+?)(?:\s+next|\s+on|\s+under|\s*$)/i,
    /([A-Za-z\s]+?)\s+next\s+week/i
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
};

const extractBudget = (query: string): number | null => {
  const budgetMatch = query.match(/\$(\d+(?:,\d+)?)/);
  if (budgetMatch) {
    return parseInt(budgetMatch[1].replace(',', ''));
  }
  
  const underMatch = query.match(/under\s+(\d+)/i);
  if (underMatch) {
    return parseInt(underMatch[1]);
  }
  
  return null;
};

// POST /api/ai-assistant/query
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { query, context } = querySchema.parse(req.body);
    const userId = (req as any).user?.id || 'anonymous';
    
    logger.info(`AI Assistant query from user ${userId}: "${query}"`);
    
    // Process the query with AI logic
    const aiResponse = await processAIQuery(query, context);
    
    // Log the interaction for analytics
    const interaction = {
      userId: userId,
      timestamp: new Date().toISOString(),
      query: query,
      context: context,
      responseType: aiResponse.suggestions?.[0]?.type || 'general',
      urgency: context?.urgency || 'medium'
    };
    
    logger.info(`AI Assistant response generated:`, { 
      userId, 
      responseType: interaction.responseType,
      suggestionsCount: aiResponse.suggestions?.length || 0 
    });
    
    res.json({
      success: true,
      data: {
        response: aiResponse.response,
        suggestions: aiResponse.suggestions,
        actionItems: aiResponse.actionItems,
        context: {
          query: query,
          timestamp: interaction.timestamp,
          estimatedCost: aiResponse.totalEstimatedCost,
          urgency: aiResponse.urgency
        }
      }
    });
    
  } catch (error: unknown) {
    logger.error('AI Assistant query error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid request data', details: error.errors }
      });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'AI Assistant query failed', details: errorMessage }
    });
  }
});

// POST /api/ai-assistant/feedback
router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const { queryId, rating, feedback, helpful } = req.body;
    const userId = (req as any).user?.id || 'anonymous';
    
    if (!queryId || rating === undefined) {
      return res.status(400).json({
        success: false,
        error: { message: 'Query ID and rating are required' }
      });
    }
    
    // In production, store feedback in database for model improvement
    const feedbackRecord = {
      queryId: queryId,
      userId: userId,
      rating: rating, // 1-5 scale
      feedback: feedback,
      helpful: helpful,
      timestamp: new Date().toISOString()
    };
    
    logger.info(`AI Assistant feedback received:`, feedbackRecord);
    
    res.json({
      success: true,
      data: {
        message: 'Thank you for your feedback! This helps improve our AI assistant.',
        feedbackId: `feedback_${Date.now()}`
      }
    });
    
  } catch (error: unknown) {
    logger.error('AI Assistant feedback error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Failed to submit feedback', details: errorMessage }
    });
  }
});

// GET /api/ai-assistant/capabilities
router.get('/capabilities', async (_req: Request, res: Response) => {
  try {
    const capabilities = {
      travelPlanning: {
        name: 'Travel Planning',
        description: 'Comprehensive trip planning with intelligent recommendations',
        features: ['Itinerary optimization', 'Budget analysis', 'Policy compliance']
      },
      flightBooking: {
        name: 'Flight Booking',
        description: 'Smart flight search and booking with real-time pricing',
        features: ['Multi-airline comparison', 'Flexible date search', 'Seat preferences']
      },
      expenseOptimization: {
        name: 'Expense Optimization', 
        description: 'Cost analysis and savings recommendations',
        features: ['Budget tracking', 'Cost alerts', 'Spending insights']
      },
      policyCompliance: {
        name: 'Policy Compliance',
        description: 'Automatic compliance checking and approval workflows',
        features: ['Real-time policy checks', 'Approval routing', 'Exception handling']
      }
    };
    
    res.json({
      success: true,
      data: {
        capabilities: capabilities,
        version: '1.0.0',
        lastUpdated: '2024-07-24'
      }
    });
    
  } catch (error: unknown) {
    logger.error('AI Assistant capabilities error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get capabilities', details: errorMessage }
    });
  }
});

export default router;
