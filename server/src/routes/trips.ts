import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { and, or, desc } from 'drizzle-orm/expressions';
import { getDatabase } from '../db/connection';
import { trips } from '../db/tripSchema';
import { logger } from '../utils/logger';
import { authenticateJWT } from '../middleware/auth';

// Type for API response to ensure consistency
type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: any;
  };
};

const router = Router();

// Apply JWT authentication to all trip routes
router.use(authenticateJWT);

// Validation schemas
const createTripSchema = z.object({
  title: z.string().min(1, 'Trip title is required'),
  description: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  city: z.string().optional(),
  country: z.string().optional(),
  isPublic: z.boolean().default(false),
});

const updateTripSchema = createTripSchema.partial();

// GET /api/trips
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const user = req.user;

    // Users can see trips they created or are collaborators on, within their organization
    const tripsList = await db
      .select()
      .from(trips)
      .where(
        and(
          eq(trips.organizationId, user.organizationId),
          or(
            eq(trips.createdById, user.userId)
            // TODO: Add collaborator check when implementing collaborators table
          )
        )
      )
      .orderBy(desc(trips.createdAt));

    const response: ApiResponse<{ trips: typeof tripsList }> = {
      success: true,
      data: { trips: tripsList },
    };
    res.json(response);

  } catch (error) {
    logger.error('Get trips error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to fetch trips' },
    };
    res.status(500).json(response);
  }
});

// POST /api/trips
router.post('/', async (req: Request, res: Response) => {
  try {
    const tripData = createTripSchema.parse(req.body);
    const user = req.user;

    // Validate date range
    const startDate = new Date(tripData.startDate);
    const endDate = new Date(tripData.endDate);
    
    if (endDate < startDate) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'End date must be after start date' },
      };
      return res.status(400).json(response);
    }

    const db = getDatabase();

    // Create trip
    const [newTrip] = await db.insert(trips).values({
      title: tripData.title,
      description: tripData.description || null,
      startDate: new Date(tripData.startDate),
      endDate: new Date(tripData.endDate),
      destinationCity: tripData.city || null,
      destinationCountry: tripData.country || null,
      isPrivate: !tripData.isPublic,
      organizationId: user.organizationId,
      createdById: user.userId,
    }).returning();

    logger.info(`New trip created: ${newTrip.title} by user ${user.userId}`);

    const response: ApiResponse<typeof newTrip> = {
      success: true,
      data: newTrip,
    };
    res.status(201).json(response);

  } catch (error) {
    logger.error('Create trip error:', error);
    
    if (error instanceof z.ZodError) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Invalid trip data', details: error.errors },
      };
      return res.status(400).json(response);
    }

    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to create trip' },
    };
    res.status(500).json(response);
  }
});

// GET /api/trips/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const db = getDatabase();

    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, id))
      .limit(1);

    if (!trip) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Trip not found' },
      };
      return res.status(404).json(response);
    }

    // Check permissions
    const canView = 
      trip.createdById === user.userId ||
      trip.organizationId === user.organizationId ||
      !trip.isPrivate; // If not private, it's public

    if (!canView) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Insufficient permissions to view trip' },
      };
      return res.status(403).json(response);
    }

    const response: ApiResponse<typeof trip> = {
      success: true,
      data: trip,
    };
    res.json(response);

  } catch (error) {
    logger.error('Get trip error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to fetch trip' },
    };
    res.status(500).json(response);
  }
});

// PUT /api/trips/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = updateTripSchema.parse(req.body);
    const user = req.user;

    const db = getDatabase();

    // Check if trip exists
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, id))
      .limit(1);

    if (!trip) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Trip not found' },
      };
      return res.status(404).json(response);
    }

    // Check permissions
    const canUpdate = 
      trip.createdById === user.userId ||
      (trip.organizationId === user.organizationId && 
       (user.role === 'admin' || user.role === 'manager'));

    if (!canUpdate) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Insufficient permissions to update trip' },
      };
      return res.status(403).json(response);
    }

    // Validate date range if both dates are provided
    if (updateData.startDate && updateData.endDate) {
      const startDate = new Date(updateData.startDate);
      const endDate = new Date(updateData.endDate);
      
      if (endDate < startDate) {
        return res.status(400).json({
          success: false,
          error: { message: 'End date must be after start date' },
        });
      }
    }

    // Prepare update data with proper types
    const updatePayload: any = { ...updateData };
    if (updateData.startDate) {
      updatePayload.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updatePayload.endDate = new Date(updateData.endDate);
    }
    updatePayload.updatedAt = new Date();
    
    // Update trip
    const [updatedTrip] = await db.update(trips)
      .set(updatePayload)
      .where(eq(trips.id, id))
      .returning();

    logger.info(`Trip updated: ${updatedTrip.title} by user ${user.userId}`);

    const response: ApiResponse<typeof updatedTrip> = {
      success: true,
      data: updatedTrip,
    };
    res.json(response);

  } catch (error) {
    logger.error('Update trip error:', error);
    
    if (error instanceof z.ZodError) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Invalid update data', details: error.errors },
      };
      return res.status(400).json(response);
    }

    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to update trip' },
    };
    res.status(500).json(response);
  }
});

// DELETE /api/trips/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const db = getDatabase();

    // Check if trip exists
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, id))
      .limit(1);

    if (!trip) {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Trip not found' },
      };
      return res.status(404).json(response);
    }

    // Check if user has permission to delete this trip
    if (trip.createdById !== user.userId && user.role !== 'superadmin_owner' && user.role !== 'superadmin_staff') {
      const response: ApiResponse = {
        success: false,
        error: { message: 'Insufficient permissions to delete trip' },
      };
      return res.status(403).json(response);
    }

    // Delete trip
    await db.delete(trips).where(eq(trips.id, id));

    logger.info(`Trip deleted: ${trip.title} by user ${user.userId}`);

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Trip deleted successfully' },
    };
    res.json(response);

  } catch (error) {
    logger.error('Delete trip error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to delete trip' },
    };
    res.status(500).json(response);
  }
});

export default router;
