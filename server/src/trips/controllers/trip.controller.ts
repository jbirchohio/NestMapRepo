import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { getDatabase } from '../../db/connection';
import { trips } from '../../db/tripSchema';
import { and, eq } from 'drizzle-orm/expressions';

const router = Router();

// Type for API response
type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: any;
  };
};

// Middleware to handle async errors
const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => 
  (req: Request, res: Response, next: (error: any) => void) => 
    Promise.resolve(fn(req, res)).catch(next);

// GET /api/trips
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    logger.info('Fetching trips');
    const user = req.user; // Assuming user is attached by auth middleware
    
    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Unauthorized' }
      };
      return res.status(401).json(response);
    }

    const db = getDatabase();
    const tripsList = await db
      .select()
      .from(trips)
      .where(
        and(
          eq(trips.organizationId, user.organizationId),
          eq(trips.isPrivate, false)
        )
      )
      .orderBy(trips.createdAt);

    const response: ApiResponse<typeof tripsList> = {
      success: true,
      data: tripsList
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error fetching trips:', error);
    const response: ApiResponse = {
      success: false,
      error: { 
        message: 'Failed to fetch trips',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
    res.status(500).json(response);
  }
}));

export default router;

