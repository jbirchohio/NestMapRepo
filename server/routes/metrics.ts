import express from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Performance metrics schema for validation
const performanceMetricsSchema = z.object({
  timestamp: z.string(),
  requestTime: z.number(),
  responseTime: z.number(),
  totalDuration: z.number(),
  method: z.string(),
  url: z.string(),
  status: z.number().nullable(),
  size: z.number(),
  userId: z.string().nullable(),
  sessionId: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  success: z.boolean(),
  errorType: z.string().nullable(),
  errorMessage: z.string().nullable(),
});

/**
 * POST /api/metrics
 * @desc Store performance metrics from frontend
 * @access Private (requires JWT)
 */
router.post('/', async (req, res) => {
  try {
    // Validate the metrics data
    const metrics = performanceMetricsSchema.parse(req.body);
    
    // Log the metrics (in production, you might want to store in database or send to monitoring service)
    logger.info('Performance metrics received', {
      userId: metrics.userId,
      method: metrics.method,
      url: metrics.url,
      duration: metrics.totalDuration,
      status: metrics.status,
      success: metrics.success,
      timestamp: metrics.timestamp
    });

    // In production, you might want to:
    // 1. Store metrics in a time-series database like InfluxDB
    // 2. Send to monitoring services like DataDog, New Relic, etc.
    // 3. Aggregate metrics for dashboard display
    // 4. Set up alerts based on performance thresholds

    // For now, just acknowledge receipt
    res.json({
      success: true,
      message: 'Metrics received successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error processing metrics:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid metrics data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process metrics'
    });
  }
});

/**
 * GET /api/metrics/health
 * @desc Health check for metrics endpoint
 * @access Private (requires JWT)
 */
router.get('/health', (_req, res) => {
  console.log('Health check endpoint hit');
  res.json({
    status: 'healthy',
    service: 'metrics',
    timestamp: new Date().toISOString()
  });
});

export default router;
