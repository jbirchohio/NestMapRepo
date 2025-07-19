import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { voiceInterfaceService } from '../services/voiceInterface.js';
import { authenticate } from '../middleware/secureAuth.js';
import { addOrganizationScope } from '../middleware/organizationScoping.js';

const router = Router();

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// Validation schemas
const textCommandSchema = z.object({
  text: z.string().min(1).max(500),
  sessionId: z.string().optional(),
  context: z.record(z.any()).optional()
});

const voiceSessionSchema = z.object({
  sessionId: z.string().optional(),
  context: z.record(z.any()).optional()
});

// Apply authentication and organization scoping to all routes
router.use(authenticate);
router.use(addOrganizationScope);

/**
 * @route POST /api/voice/command/audio
 * @desc Process voice command from audio
 * @access Private
 */
router.post('/command/audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Audio file is required'
      });
    }

    const { sessionId } = req.body;
    const userId = req.user!.id;

    // Process voice command
    const response = await voiceInterfaceService.processVoiceCommand(
      req.file.buffer,
      userId,
      sessionId
    );

    res.json({
      success: true,
      data: {
        response: {
          id: response.id,
          text: response.text,
          actions: response.actions,
          followUp: response.followUp
        },
        // Convert audio buffer to base64 for client
        audio: response.audio ? response.audio.toString('base64') : null
      }
    });

  } catch (error) {
    console.error('Voice command processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process voice command',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/voice/command/text
 * @desc Process text command (for testing or fallback)
 * @access Private
 */
router.post('/command/text', async (req, res) => {
  try {
    const { text, sessionId, context } = textCommandSchema.parse(req.body);
    const userId = req.user!.id;

    // Process text command
    const response = await voiceInterfaceService.processTextCommand(
      text,
      userId,
      sessionId,
      context
    );

    res.json({
      success: true,
      data: {
        response: {
          id: response.id,
          text: response.text,
          actions: response.actions,
          followUp: response.followUp
        },
        audio: response.audio ? response.audio.toString('base64') : null
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

    console.error('Text command processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process text command',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/voice/session/start
 * @desc Start a new voice session
 * @access Private
 */
router.post('/session/start', async (req, res) => {
  try {
    const { context } = voiceSessionSchema.parse(req.body);
    const userId = req.user!.id;

    const session = await voiceInterfaceService.startSession(userId, context);

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        context: session.context,
        startTime: session.startTime
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

    console.error('Session start error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start voice session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/voice/session/:sessionId
 * @desc Get voice session details
 * @access Private
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    const session = await voiceInterfaceService.getSession(sessionId, userId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        context: session.context,
        isActive: session.isActive,
        startTime: session.startTime,
        lastActivity: session.lastActivity,
        commandCount: session.history.length
      }
    });

  } catch (error) {
    console.error('Session retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route PUT /api/voice/session/:sessionId/context
 * @desc Update session context
 * @access Private
 */
router.put('/session/:sessionId/context', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { context } = z.object({
      context: z.record(z.any())
    }).parse(req.body);
    const userId = req.user!.id;

    const updated = await voiceInterfaceService.updateSessionContext(sessionId, userId, context);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      data: {
        sessionId,
        context
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

    console.error('Session context update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update session context',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route DELETE /api/voice/session/:sessionId
 * @desc End voice session
 * @access Private
 */
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    const ended = await voiceInterfaceService.endSession(sessionId, userId);

    if (!ended) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      message: 'Session ended successfully'
    });

  } catch (error) {
    console.error('Session end error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/voice/session/:sessionId/history
 * @desc Get session command history
 * @access Private
 */
router.get('/session/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const history = await voiceInterfaceService.getSessionHistory(sessionId, userId, limit, offset);

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          limit,
          offset,
          total: history.length
        }
      }
    });

  } catch (error) {
    console.error('Session history retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve session history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/voice/capabilities
 * @desc Get voice interface capabilities
 * @access Private
 */
router.get('/capabilities', async (req, res) => {
  try {
    const capabilities = await voiceInterfaceService.getCapabilities();

    res.json({
      success: true,
      data: capabilities
    });

  } catch (error) {
    console.error('Capabilities retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve capabilities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/voice/action/execute
 * @desc Execute a voice action
 * @access Private
 */
router.post('/action/execute', async (req, res) => {
  try {
    const { actionId, parameters, sessionId } = z.object({
      actionId: z.string(),
      parameters: z.record(z.any()).optional(),
      sessionId: z.string().optional()
    }).parse(req.body);

    const userId = req.user!.id;
    const organizationId = req.organization!.id;

    const result = await voiceInterfaceService.executeAction(
      actionId,
      parameters || {},
      userId,
      organizationId,
      sessionId
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      });
    }

    console.error('Action execution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute action',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/voice/stats
 * @desc Get voice interface usage statistics
 * @access Private
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organization!.id;
    const timeframe = req.query.timeframe as string || '7d';

    const stats = await voiceInterfaceService.getUsageStats(userId, organizationId, timeframe);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Stats retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/voice/feedback
 * @desc Submit feedback for voice interaction
 * @access Private
 */
router.post('/feedback', async (req, res) => {
  try {
    const { commandId, rating, feedback, sessionId } = z.object({
      commandId: z.string(),
      rating: z.number().min(1).max(5),
      feedback: z.string().optional(),
      sessionId: z.string().optional()
    }).parse(req.body);

    const userId = req.user!.id;

    await voiceInterfaceService.submitFeedback(commandId, rating, feedback, userId, sessionId);

    res.json({
      success: true,
      message: 'Feedback submitted successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      });
    }

    console.error('Feedback submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
