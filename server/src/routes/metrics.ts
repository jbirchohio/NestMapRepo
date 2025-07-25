import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Apply JWT authentication to all metrics routes
router.use(authenticateJWT);

// Type for metrics data
interface MetricsData {
  status: string;
  uptime: number;
  timestamp: string;
  metrics: {
    activeUsers: number;
    requests: {
      total: number;
      lastHour: number;
    };
  };
}

// Type for API response to ensure consistency
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: Record<string, unknown> | string;
  };
}

// Handle both GET and POST /api/metrics
const handleMetricsRequest = async (_req: Request, res: Response) => {
  try {
    // Basic metrics data
    const metrics: MetricsData = {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      metrics: {
        activeUsers: 42,
        requests: {
          total: 1000,
          lastHour: 24,
        },
      },
    };

    const response: ApiResponse<MetricsData> = {
      success: true,
      data: metrics,
    };

    res.json(response);
  } catch (error) {
    logger.error('Metrics error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: {
        message: 'Failed to fetch metrics',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : String(error)) : undefined
      }
    };
    
    res.status(500).json(response);
  }
};

// Register both GET and POST handlers
router.get('/', handleMetricsRequest);
router.post('/', handleMetricsRequest);

export default router;
