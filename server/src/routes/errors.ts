import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

const router = Router();

// POST /api/errors - Log client-side errors
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      message,
      stack,
      url,
      line,
      column,
      userAgent,
      timestamp,
      userId,
      additionalInfo
    } = req.body;

    // Log the client-side error
    logger.error('Client-side error reported:', {
      message,
      stack,
      url,
      line,
      column,
      userAgent,
      timestamp: timestamp || new Date().toISOString(),
      userId,
      additionalInfo,
      ip: req.ip,
      referer: req.headers.referer
    });

    // Respond with success
    res.status(200).json({
      success: true,
      message: 'Error logged successfully'
    });
  } catch (error) {
    logger.error('Failed to log client error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log error',
      message: 'Internal server error'
    });
  }
});

export default router;

