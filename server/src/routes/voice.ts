import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { authenticateJWT } from '../middleware/auth';
import { db } from '../db/db';
import { eq } from 'drizzle-orm';
import { asc } from 'drizzle-orm/expressions';
import { sql } from 'drizzle-orm/sql';
import { voiceSessions, voiceCommands } from '../db/schema';

const router = Router();

// Apply JWT authentication to all voice routes
router.use(authenticateJWT);

// Initialize OpenAI client if API key is available (optional dependency)
let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
    // Dynamically import OpenAI only if needed
    const OpenAI = require('openai');
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
} catch (error) {
  logger.warn('OpenAI package not available, using fallback NLP processing');
}

// In-memory fallback for sessions when database operations fail
const voiceSessionsFallback: Map<string, any> = new Map();

// Validation schemas
const startSessionSchema = z.object({
  language: z.string().default('en-US'),
  context: z.object({
    timeZone: z.string().optional(),
    location: z.string().optional()
  }).optional()
});

const textCommandSchema = z.object({
  text: z.string().min(1),
  sessionId: z.string().min(1), // Accept any non-empty string, not just UUID
  context: z.object({
    timestamp: z.string().optional(),
    location: z.string().optional()
  }).optional()
});

// Helper function to generate session token
const generateSessionToken = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Helper function to create or get session from database
const createVoiceSession = async (userId, organizationId, language = 'en') => {
  try {
    const sessionToken = generateSessionToken();
    
    const [session] = await db
      .insert(voiceSessions)
      .values({
        userId,
        organizationId,
        sessionToken,
        language,
        status: 'active',
        metadata: {}
      })
      .returning();
      
    return session;
  } catch (error) {
    logger.error('Database session creation failed, using fallback:', error);
    // Fallback to in-memory storage
    const sessionData = {
      id: generateSessionToken(),
      userId,
      organizationId,
      sessionToken: generateSessionToken(),
      language,
      status: 'active',
      startTime: new Date().toISOString(),
      messages: [],
      isActive: true
    };
    voiceSessionsFallback.set(sessionData.id, sessionData);
    return sessionData;
  }
};

// Helper function to get session from database
const getVoiceSession = async (sessionId) => {
  try {
    const [session] = await db
      .select()
      .from(voiceSessions)
      .where(eq(voiceSessions.sessionToken, sessionId));
      
    return session;
  } catch (error) {
    logger.error('Database session retrieval failed, using fallback:', error);
    return voiceSessionsFallback.get(sessionId);
  }
};

// Helper function to update session in database
const updateVoiceSession = async (sessionId, updates) => {
  try {
    const [updated] = await db
      .update(voiceSessions)
      .set(updates)
      .where(eq(voiceSessions.sessionToken, sessionId))
      .returning();
      
    return updated;
  } catch (error) {
    logger.error('Database session update failed, using fallback:', error);
    const fallbackSession = voiceSessionsFallback.get(sessionId);
    if (fallbackSession) {
      Object.assign(fallbackSession, updates);
      voiceSessionsFallback.set(sessionId, fallbackSession);
    }
    return fallbackSession;
  }
};

// Helper function to process natural language and extract intent using OpenAI
const processNaturalLanguage = async (text, _sessionId) => {
  try {
    if (openai) {
      // Use OpenAI for sophisticated NLP processing
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a travel assistant AI. Analyze the user's request and respond with JSON containing:
            - intent: one of "book_flight", "trip_creation", "expense_tracking", "general", "weather", "status_check"
            - entities: object with extracted entities (origin, destination, dates, amounts, etc.)
            - response: helpful response text
            - suggestions: array of follow-up suggestions
            - followUp: boolean indicating if more info is needed
            
            Always respond with valid JSON only.`
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const aiResponse = completion.choices[0]?.message?.content;
      if (aiResponse) {
        try {
          const parsed = JSON.parse(aiResponse);
          return {
            intent: parsed.intent || 'general',
            entities: parsed.entities || {},
            response: parsed.response || "I'm here to help with your travel needs.",
            suggestions: parsed.suggestions || [],
            followUp: parsed.followUp || false
          };
        } catch (parseError) {
          logger.warn('Failed to parse OpenAI response, falling back to pattern matching');
        }
      }
    }
  } catch (error) {
    logger.error('OpenAI API error, falling back to pattern matching:', error);
  }

  // Fallback to pattern matching when OpenAI is not available or fails
  const lowerText = text.toLowerCase();
  
  // Flight booking patterns
  if (lowerText.includes('flight') || lowerText.includes('book') || lowerText.includes('fly')) {
    const response = {
      intent: 'book_flight',
      entities: {},
      response: "I can help you book a flight. Let me gather some details.",
      suggestions: [
        "Where would you like to fly from?",
        "What's your destination?",
        "When would you like to travel?"
      ],
      followUp: true
    };
    
    // Extract locations if mentioned
    const fromMatch = text.match(/from\s+([A-Za-z\s]+?)(?:\s+to|\s*$)/i);
    const toMatch = text.match(/to\s+([A-Za-z\s]+?)(?:\s+on|\s+next|\s*$)/i);
    
    if (fromMatch) response.entities.origin = fromMatch[1].trim();
    if (toMatch) response.entities.destination = toMatch[1].trim();
    
    return response;
  }
  
  // Trip creation patterns
  if (lowerText.includes('trip') || lowerText.includes('travel')) {
    return {
      intent: 'trip_creation',
      entities: {},
      response: "I can help you create a trip. What would you like to call this trip?",
      suggestions: [
        "Business trip to London",
        "Vacation in Paris",
        "Conference in San Francisco"
      ],
      followUp: true
    };
  }
  
  // Default response
  return {
    intent: 'general',
    entities: {},
    response: "I'm here to help with your travel planning. You can ask me to book flights, create trips, or get travel information.",
    suggestions: [
      "Book a flight",
      "Create a new trip",
      "Check flight status"
    ],
    followUp: false
  };
};

// POST /api/voice/session/start
router.post('/session/start', async (req, res) => {
  try {
    const { language } = startSessionSchema.parse(req.body);
    
    const userId = (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'User authentication required' }
      });
    }
    
    // Create new voice session in database
    const session = await createVoiceSession(userId, organizationId, language);
    
    logger.info(`Voice session started: ${session.sessionToken} for user: ${userId}`);
    
    res.json({
      success: true,
      data: {
        sessionId: session.sessionToken,
        isActive: session.status === 'active',
        message: "Voice session started. How can I help you with your travel plans today?",
        capabilities: [
          "Flight booking",
          "Trip creation", 
          "Travel recommendations",
          "Flight status updates"
        ]
      }
    });
    
  } catch (error: unknown) {
    logger.error('Voice session start error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid request data', details: error.errors }
      });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Failed to start voice session', details: errorMessage }
    });
  }
});

// POST /api/voice/session/create - Simple session creation without body
router.post('/session/create', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'User authentication required' }
      });
    }
    
    // Create new voice session with default settings
    const session = await createVoiceSession(userId, organizationId, 'en');
    
    logger.info(`Voice session created: ${session.sessionToken} for user: ${userId}`);
    
    res.status(201).json({
      success: true,
      data: {
        sessionId: session.sessionToken,
        isActive: session.status === 'active',
        message: "Voice session created successfully"
      }
    });
    
  } catch (error: unknown) {
    logger.error('Voice session creation error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create voice session', details: errorMessage }
    });
  }
});

// POST /api/voice/command/text
router.post('/command/text', async (req, res) => {
  try {
    const { text, sessionId, context } = textCommandSchema.parse(req.body);
    const userId = (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId;
    
    // Get existing session
    const session = await getVoiceSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: { message: 'Voice session not found or expired' }
      });
    }
    
    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: { message: 'Voice session is not active' }
      });
    }
    
    logger.info(`Processing voice command: "${text}" for session: ${sessionId}`);
    
    const startTime = Date.now();
    
    // Process the natural language input
    const nlpResult = await processNaturalLanguage(text, sessionId);
    
    const executionTime = Date.now() - startTime;
    
    // Store the command in the database
    try {
      await db.insert(voiceCommands).values({
        sessionId: session.id,
        userId,
        organizationId,
        command: text,
        processedCommand: text.trim(),
        commandType: nlpResult.intent as any, // Map intent to command type
        intent: nlpResult.intent,
        confidence: 85, // Default confidence for pattern matching
        response: nlpResult.response,
        success: true,
        executionTime,
        metadata: {
          entities: nlpResult.entities,
          context: {
            ...context,
            suggestions: nlpResult.suggestions
          }
        }
      });
      
      // Update session command counts
      await updateVoiceSession(sessionId, {
        totalCommands: sql`${voiceSessions.totalCommands} + 1`,
        successfulCommands: sql`${voiceSessions.successfulCommands} + 1`,
        updatedAt: new Date()
      });
      
    } catch (dbError) {
      logger.error('Failed to store voice command in database:', dbError);
    }
    
    res.json({
      success: true,
      data: {
        sessionId: sessionId,
        intent: nlpResult.intent,
        entities: nlpResult.entities,
        text: nlpResult.response,
        suggestions: nlpResult.suggestions,
        followUp: nlpResult.followUp,
        actions: nlpResult.intent === 'book_flight' ? ['book_flight', 'get_weather'] : [],
        context: {
          executionTime,
          sessionActive: session.status === 'active'
        }
      }
    });
    
  } catch (error: unknown) {
    logger.error('Voice command processing error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        errors: error.errors
      });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Failed to process voice command', details: errorMessage }
    });
  }
});

// POST /api/voice/session/end
router.post('/session/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Session ID is required' }
      });
    }
    
    const session = await getVoiceSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: { message: 'Voice session not found' }
      });
    }
    
    // Update session to inactive status
    const updatedSession = await updateVoiceSession(sessionId, {
      status: 'completed',
      endedAt: new Date(),
      updatedAt: new Date()
    });
    
    logger.info(`Voice session ended: ${sessionId}`);
    
    res.json({
      success: true,
      data: {
        sessionId: sessionId,
        duration: updatedSession?.totalCommands || 0,
        message: "Voice session ended successfully."
      }
    });
    
  } catch (error: unknown) {
    logger.error('Voice session end error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Failed to end voice session', details: errorMessage }
    });
  }
});

// GET /api/voice/session/:sessionId
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await getVoiceSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: { message: 'Voice session not found' }
      });
    }
    
    res.json({
      success: true,
      data: {
        session: {
          id: session.sessionToken,
          startTime: session.startedAt,
          endTime: session.endedAt,
          isActive: session.status === 'active',
          commandCount: session.totalCommands,
          language: session.language,
          status: session.status
        }
      }
    });
    
  } catch (error: unknown) {
    logger.error('Voice session get error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get voice session', details: errorMessage }
    });
  }
});

// GET /api/voice/session/:sessionId/history
router.get('/session/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await getVoiceSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: { message: 'Voice session not found' }
      });
    }
    
    // Get command history from database
    try {
      const commands = await db
        .select({
          id: voiceCommands.id,
          command: voiceCommands.command,
          intent: voiceCommands.intent,
          response: voiceCommands.response,
          success: voiceCommands.success,
          executionTime: voiceCommands.executionTime,
          createdAt: voiceCommands.createdAt,
          metadata: voiceCommands.metadata
        })
        .from(voiceCommands)
        .where(eq(voiceCommands.sessionId, session.id))
        .orderBy(asc(voiceCommands.createdAt));
        
      res.json({
        success: true,
        data: commands
      });
    } catch (dbError) {
      logger.error('Failed to retrieve command history:', dbError);
      // Fallback to empty array
      res.json({
        success: true,
        data: []
      });
    }
    
  } catch (error: unknown) {
    logger.error('Voice session history error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get session history', details: errorMessage }
    });
  }
});

// Action execution schema
const actionExecuteSchema = z.object({
  action: z.string(),
  parameters: z.record(z.any()).optional(),
  sessionId: z.string().min(1).optional()
});

// POST /api/voice/action/execute
router.post('/action/execute', async (req, res) => {
  try {
    const { action, parameters, sessionId } = actionExecuteSchema.parse(req.body);
    const userId = (req as any).user?.id;
    
    logger.info(`Executing voice action: ${action} for user: ${userId}`);
    
    // Mock action execution based on action type
    let result: any = {};
    
    switch (action) {
      case 'book_flight':
        result = {
          action: 'book_flight',
          status: 'initiated',
          message: 'Flight booking process started. Please provide departure and destination cities.',
          nextSteps: ['Select departure city', 'Select destination city', 'Choose dates']
        };
        break;
        
      case 'get_weather':
        result = {
          action: 'get_weather',
          status: 'completed',
          message: 'Weather information retrieved successfully.',
          data: {
            location: parameters?.location || 'Current location',
            temperature: '22°C',
            condition: 'Partly cloudy',
            forecast: 'Light rain expected in the evening'
          }
        };
        break;
        
      case 'get_trip_status':
        result = {
          action: 'get_trip_status',
          status: 'completed',
          message: 'Trip status retrieved successfully.',
          data: {
            activeTrips: 1,
            upcomingTrips: 2,
            recentUpdates: ['Flight delay notification', 'Hotel confirmation received']
          }
        };
        break;
        
      default:
        result = {
          action: action,
          status: 'error',
          message: `Unknown action: ${action}`,
          availableActions: ['book_flight', 'get_weather', 'get_trip_status']
        };
    }
    
    // Store action execution if session provided
    if (sessionId) {
      try {
        const session = await getVoiceSession(sessionId);
        if (session) {
          await db.insert(voiceCommands).values({
            sessionId: session.id,
            userId,
            organizationId: (req as any).user?.organizationId,
            command: `Action: ${action}`,
            processedCommand: action,
            commandType: 'query', // Default to query type for actions
            intent: action,
            confidence: 100, // Actions have 100% confidence
            response: result.message,
            success: result.status !== 'error',
            executionTime: 0,
            metadata: {
              entities: {},
              context: {
                actionType: action,
                parameters: parameters || {},
                result
              }
            }
          });
        }
      } catch (dbError) {
        logger.error('Failed to store action execution:', dbError);
      }
    }
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error: unknown) {
    logger.error('Voice action execution error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid request data',
          details: error.errors
        }
      });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      error: { message: 'Failed to execute voice action', details: errorMessage }
    });
  }
});

export default router;
