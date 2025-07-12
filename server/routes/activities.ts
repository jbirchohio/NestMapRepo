import { Router, type Response, type NextFunction, type RequestHandler, type Request } from 'express';
import { ParamsDictionary } from 'express-serve-static-core.js';
import { getAuthContext, requireAuth } from '../utils/authContext.js';
import { logUserActivity } from '../utils/activityLogger.js';

// Re-export types for backward compatibility
export type { AuthUser, JWTUser } from '../utils/authContext.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid.js';

// Import types and schemas
import type { Activity, ActivityStatus, ActivityType } from '../types/activity.js';
import { activitySchema, createActivitySchema, updateActivitySchema } from '../types/activity.js';
import { User } from '../db/schema.js';

// Import services
import activityService from '../services/activity.service.js';
import { validateOrganizationAccess } from '../middleware/organization.js';

// Define JWTUser interface for this file
interface JWTUser {
  id: string;
  userId?: string; // For backward compatibility
  email: string;
  role: string;
  organizationId?: string;
}

// Type for authenticated user (either JWTUser or DB User)
type AuthenticatedUser = JWTUser | User;

// Type guard to check if user is JWTUser
function isJWTUser(user: unknown): user is JWTUser {
  return typeof user === 'object' && user !== null && 
    'id' in user && typeof (user as JWTUser).id === 'string' && 
    'email' in user && typeof (user as JWTUser).email === 'string' && 
    'role' in user && typeof (user as JWTUser).role === 'string.js';
}

// Define types for request parameters, body, and query
type ActivityIdParam = { activityId: string };
type TripIdParam = { tripId: string };

// Field transforms
function transformActivityToFrontend(activity: Activity): any {
  return {
    ...activity,
    // Convert any fields as needed for frontend
    latitude: activity.latitude !== undefined ? Number(activity.latitude) : null,
    longitude: activity.longitude !== undefined ? Number(activity.longitude) : null
  };
}

// Validation schemas
const activityIdParamSchema = z.object({
  activityId: z.string().uuid()
});

const tripIdParamSchema = z.object({
  tripId: z.string().uuid()
});

// Authentication and user ID retrieval is now handled by getAuthContext utility

// Helper function to ensure user has access to the activity
async function ensureActivityAccess(
  req: Request, 
  activityId: string
): Promise<Activity | null> {
  try {
    const activity = await activityService.findById(activityId);
    if (!activity) return null;
    
    // Get organization ID from auth context
    const { organizationId } = getAuthContext(req);
    
    // Check if activity belongs to the user's organization
    if (!organizationId || activity.organizationId !== organizationId) {
      return null;
    }
    
    return activity;
  } catch (error) {
    console.error('Error ensuring activity access:', error);
    return null;
  }
}

const router = Router();

// Apply organization context to all routes
router.use(validateOrganizationAccess());

// Apply authentication to all routes
router.use((req, res, next) => {
  try {
    requireAuth(req);
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication required' });
  }
});

// Extend the Express Request type to include ip and other common properties
type ExtendedRequest<P = {}, ResBody = any, ReqBody = any> = Request<P, ResBody, ReqBody> & {
  ip?: string;
  get(header: string): string | undefined;
}

// Get all activities for a trip
router.get<{ tripId: string }>(
  '/trip/:tripId',
  async (req: ExtendedRequest<{ tripId: string }> & { params: { tripId: string } }, res: Response, next: NextFunction) => {
    try {
      const result = tripIdParamSchema.safeParse({ tripId: req.params.tripId });
      if (!result.success) {
        return res.status(400).json({
          message: 'Validation error',
          errors: result.error.format()
        });
      }

      // Get auth context
      const { userId, organizationId } = getAuthContext(req);
      if (!organizationId || !userId) {
        return res.status(403).json({ message: 'Organization access denied' });
      }

      // Log the activity
      await logUserActivity(
        userId.toString(),
        organizationId.toString(),
        'view_trip_activities',
        { tripId: req.params.tripId },
        req.ip || 'unknown',
        req.get('user-agent') || 'unknown'
      );

      const activities = await activityService.findByTripId(req.params.tripId);
      
      // Filter activities by organization for multi-tenant security
      const filteredActivities = activities.filter(
        activity => activity.organizationId === organizationId
      );
      
      return res.json({
        success: true,
        data: filteredActivities.map(transformActivityToFrontend)
      });
    } catch (error) {
      console.error('Error fetching activities by trip:', error);
      return next(error);
    }
  }
);

// Create activity
router.post<ParamsDictionary, any, Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>>(
  '/create', 
  async (req: ExtendedRequest<ParamsDictionary, any, Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>> & { 
    body: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'> 
  }, res: Response, next: NextFunction) => {
  try {
    const result = createActivitySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: result.error.format()
      });
    }

    // Get auth context
    const { userId, organizationId } = getAuthContext(req);
    if (!userId || !organizationId) {
      return res.status(403).json({ message: 'Authentication required' });
    }

    // Ensure the trip belongs to the user's organization
    // Note: You might want to add a separate check here if needed

    const activityData = {
      ...req.body,
      createdBy: userId,
      organizationId,
      status: req.body.status || 'pending',
      ...(result.data.description ? { description: result.data.description } : { description: null }),
      ...(result.data.notes ? { notes: result.data.notes } : { notes: null }),
      locationName: result.data.locationName || null,
      // Convert coordinates
      latitude: result.data.latitude !== undefined ? String(result.data.latitude) : null,
      longitude: result.data.longitude !== undefined ? String(result.data.longitude) : null,
      // Required fields with defaults
      date: result.data.startDate ? new Date(result.data.startDate) : new Date(),
      completed: false,
      time: null,
      tag: null,
      location: null,
      travelMode: null,
      assignedTo: null,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
      
    const activity = await activityService.create(activityData);
    
    // Log the activity creation
    await logUserActivity(
      userId.toString(),
      organizationId.toString(),
      'create_activity',
      { 
        activityId: activity.id.toString(),
        tripId: activity.tripId.toString(),
        title: activity.title
      },
      req.ip || 'unknown',
      req.get('user-agent') || 'unknown'
    );

    return res.status(201).json({
      success: true,
      data: transformActivityToFrontend(activity)
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    return next(error);
  }
});

// Get activity by ID
router.get<{ activityId: string }>(
  '/:activityId', 
  async (req: ExtendedRequest<{ activityId: string }> & { params: { activityId: string } }, res: Response, next: NextFunction) => {
  try {
    const result = activityIdParamSchema.safeParse({ activityId: req.params.activityId });
    if (!result.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: result.error.format()
      });
    }

    const activity = await ensureActivityAccess(req, req.params.activityId);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    // Log the activity view
    const { userId, organizationId } = getAuthContext(req);
    if (userId && organizationId) {
      await logUserActivity(
        userId.toString(),
        organizationId.toString(),
        'view_activity',
        { 
          activityId: activity.id.toString(),
          tripId: activity.tripId.toString(),
          title: activity.title
        },
        req.ip || 'unknown',
        req.get('user-agent') || 'unknown'
      );
    }

    return res.json({
      success: true,
      data: transformActivityToFrontend(activity)
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return next(error);
  }
});

// Update activity
type UpdateActivityBody = {
  name?: string;
  description?: string;
  status?: string;
  type?: ActivityType;
  startTime?: string;
  endTime?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  cost?: number;
  currency?: string;
  notes?: string;
  tripId?: string;
};

router.put<{ activityId: string }, any, UpdateActivityBody>(
  '/:activityId', 
  async (req: ExtendedRequest<{ activityId: string }, any, UpdateActivityBody> & { 
    params: { activityId: string };
    body: UpdateActivityBody;
  }, res: Response, next: NextFunction) => {
  try {
    const paramResult = activityIdParamSchema.safeParse({ activityId: req.params.activityId });
    if (!paramResult.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: paramResult.error.format()
      });
    }

    const bodyResult = updateActivitySchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: bodyResult.error.format()
      });
    }

    const activity = await ensureActivityAccess(req, req.params.activityId);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    // Prepare update data with proper types
    const updateData: Partial<Activity> = {
      ...bodyResult.data,
      updatedAt: new Date()
    };
      
    // Convert latitude and longitude to numbers for the Activity type
    if ('latitude' in bodyResult.data) {
      updateData.latitude = bodyResult.data.latitude !== undefined && bodyResult.data.latitude !== null
        ? parseFloat(String(bodyResult.data.latitude))
        : undefined;
    }
    
    if ('longitude' in bodyResult.data) {
      updateData.longitude = bodyResult.data.longitude !== undefined && bodyResult.data.longitude !== null
        ? parseFloat(String(bodyResult.data.longitude))
        : undefined;
    }

    const { userId, organizationId } = getAuthContext(req);
    if (!userId || !organizationId) {
      return res.status(403).json({ message: 'Authentication required' });
    }

    const updatedActivity = await activityService.update(
      req.params.activityId,
      updateData as unknown as Partial<Omit<{ date: Date; id: string; createdAt: Date; updatedAt: Date; organizationId: string | null; tripId: string; title: string; completed: boolean | null; time: string | null; location: string | null; latitude: string | null; longitude: string | null; description: string | null; notes: string | null; travelMode: string | null; }, 'id' | 'createdAt' | 'updatedAt'>> & { updatedAt: Date }
    );

    if (!updatedActivity) {
      return res.status(404).json({ message: 'Failed to update activity' });
    }

    // Log the activity update
    await logUserActivity(
      userId.toString(),
      organizationId.toString(),
      'update_activity',
      { 
        activityId: updatedActivity.id.toString(),
        tripId: updatedActivity.tripId.toString(),
        title: updatedActivity.title,
        updatedFields: Object.keys(updateData)
      },
      req.ip || 'unknown',
      req.get('user-agent') || 'unknown'
    );

    return res.json({
      success: true,
      data: transformActivityToFrontend(updatedActivity)
    });
  } catch (error) {
    console.error('Error updating activity:', error);
    return next(error);
  }
});

// Delete activity by ID
router.delete<{ activityId: string }>(
  '/:activityId', 
  async (req: ExtendedRequest<{ activityId: string }> & { params: { activityId: string } }, res: Response, next: NextFunction) => {
  try {
    const result = activityIdParamSchema.safeParse({ activityId: req.params.activityId });
    if (!result.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: result.error.format()
      });
    }

    const activity = await ensureActivityAccess(req, req.params.activityId);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    const { userId, organizationId } = getAuthContext(req);
    if (!userId || !organizationId) {
      return res.status(403).json({ message: 'Authentication required' });
    }

    await activityService.delete(req.params.activityId);
    
    // Log the activity deletion
    await logUserActivity(
      userId.toString(),
      organizationId.toString(),
      'delete_activity',
      { 
        activityId: activity.id.toString(),
        tripId: activity.tripId.toString(),
        title: activity.title
      },
      req.ip || 'unknown',
      req.get('user-agent') || 'unknown'
    );
      
    return res.json({
      success: true,
      message: 'Activity deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting activity:', error);
    return next(error);
  }
});

export default router;
