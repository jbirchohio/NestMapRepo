import { Router, type Response, type NextFunction, type Request, type RequestHandler } from 'express';
import type { ParamsDictionary, Query } from 'express-serve-static-core';
import { getAuthContext, requireAuth } from '../utils/authContext.js';
import { logUserActivity } from '../utils/activityLogger.js';
import type { JWTUser, AuthUser } from '../utils/authContext.js';
import { z } from 'zod';
import type { 
  Activity as SharedActivity,
  ClientActivity, 
  ActivityFormValues,
  ActivityStatus,
  ActivityType,
  Activity as SharedActivityType
} from '@shared/src/types/activity/index.js';

/**
 * Extended Activity type that includes server-specific fields
 */
export type Activity = SharedActivityType & {
  /** The ID of the trip this activity belongs to */
  tripId: string;
  
  /** The ID of the user who created this activity */
  createdBy: string;
  
  /** Optional user ID this activity is assigned to */
  assignedTo?: string;
  
  /** The organization this activity belongs to */
  organizationId?: string;
  
  /** When the activity was created */
  createdAt?: Date;
  
  /** When the activity was last updated */
  updatedAt?: Date;
};

import { activityFormSchema } from '@shared/src/types/activity/index.js';
import activityService from '../services/activity.service.js';
import { validateOrganizationAccess } from '../middleware/organization.js';

// Import the extended Request type from auth context
import type { Request as AuthRequest } from 'express';

// Extend the Express Request type to include our custom properties
type ActivitiesRequest = AuthRequest & {
  organizationId?: string;
  ip?: string;
  user?: {
    id: string | number;
    email: string;
    role?: string;
    organizationId?: string | null;
  };
};

// Type guard to check if user is valid with required properties
function isValidUser(user: unknown): user is { id: string | number; email: string } {
  return (
    typeof user === 'object' && 
    user !== null &&
    'id' in user &&
    'email' in user
  );
}



// Helper to validate and parse UUID
function validateUuid(id: unknown): string | null {
  if (typeof id !== 'string') return null;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id) ? id : null;
}

// Define types for request parameters
type ActivityIdParam = {
  activityId: string;
};

type TripIdParam = {
  tripId: string;
};

// Request type with our custom properties

// Custom request handler type with proper response typing
type AsyncRequestHandler<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = Query
> = (
  req: Request<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction
) => Promise<Response | void> | void;

// Helper to create typed route handlers with proper error handling
const createHandler = <
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = Query
>(
  handler: AsyncRequestHandler<P, ResBody, ReqBody, ReqQuery>
): RequestHandler<P, ResBody, ReqBody, ReqQuery> => {
  return (req, res, next) => {
    try {
      const result = handler(req, res, next);
      if (result instanceof Promise) {
        return result.catch(next);
      }
      return result;
    } catch (error) {
      return next(error);
    }
  };
};

// Field transforms
function transformActivityToFrontend(activity: Activity): ClientActivity {
  return {
    ...activity,
    // Convert any fields as needed for frontend
    latitude: activity.latitude,
    longitude: activity.longitude,
    // Add client-specific fields with defaults
    conflict: false,
    timeConflict: false
  };
}

// Validation schemas
const uuidSchema = z.string().uuid({ message: 'Invalid UUID format' });
const activityIdParamSchema = z.object({
  activityId: uuidSchema
});

const tripIdParamSchema = z.object({
  tripId: uuidSchema
});

// Helper function to ensure user has access to the activity
async function ensureActivityAccess(req: Request, activityId: string): Promise<Activity | null> {
  const { userId, organizationId } = getAuthContext(req);
  if (!userId || !organizationId) return null;

  // Validate activityId is a valid UUID
  if (!validateUuid(activityId)) {
    return null;
  }

  const activity = await activityService.findById(activityId);
  if (!activity) return null;

  // Check if activity belongs to user's organization
  if (activity.organizationId !== organizationId) {
    return null;
  }

  return activity;
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
};

// Get all activities for a trip
router.get<{ tripId: string }>(
  '/trip/:tripId',
  createHandler<{ tripId: string }, any, any>(async (req: ActivitiesRequest, res) => {
    const { tripId } = req.params;
    const validationResult = tripIdParamSchema.safeParse({ tripId });
    
    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Invalid trip ID format',
        errors: validationResult.error.format()
      });
    }
    
    const authContext = getAuthContext(req);
    const userId = authContext.userId ? String(authContext.userId) : null;
    const organizationId = authContext.organizationId;

    if (!userId || !organizationId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const activities = await activityService.findByTripId(tripId, { organizationId });
    
    // Log the activity
    await logUserActivity(
      userId,
      organizationId,
      'view_trip_activities',
      { tripId },
      req.ip || 'unknown',
      req.get('user-agent') || 'unknown'
    );

    return res.json({
      data: activities.map(transformActivityToFrontend),
    });
  })
);

// Create a new activity
router.post<ParamsDictionary, any, ActivityFormValues>(
  '/',
  createHandler<ParamsDictionary, any, ActivityFormValues>(
    async (req: Request, res) => {
      const authContext = getAuthContext(req);
      const userId = authContext.userId ? String(authContext.userId) : null;
      const organizationId = authContext.organizationId;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Ensure tripId is a string and validate it
      const tripId = req.body?.tripId ? String(req.body.tripId) : null;
      if (!tripId || !validateUuid(tripId)) {
        return res.status(400).json({ error: 'Valid trip ID is required' });
      }
      
      // Type assertion for the request body
      const body = req.body as ActivityFormValues;

      // Prepare the base activity data with required fields
      const now = new Date();
      const baseActivity = {
        title: body.title || 'New Activity',
        date: (body.date ? new Date(body.date) : now).toISOString().split('T')[0],
        time: body.time || now.toTimeString().slice(0, 5),
        locationName: body.locationName || '',
        travelMode: body.travelMode || 'driving',
        tripId,
        createdBy: userId,
        // Optional fields with proper defaults
        notes: body.notes || undefined,
        tag: body.tag || undefined,
        assignedTo: body.assignedTo || undefined,
        status: body.status || 'pending',
        type: body.type || 'other',
        latitude: body.latitude ? String(body.latitude) : undefined,
        longitude: body.longitude ? String(body.longitude) : undefined
      };
      
      // Validate the request body against the schema
      const result = activityFormSchema.safeParse(baseActivity);

      if (!result.success) {
        return res.status(400).json({
          error: 'Invalid activity data',
          details: result.error.format(),
        });
      }

      try {
        // Create the activity with validated data
        const activityData: Omit<Activity, 'id'> = {
          // Required fields with proper type casting
          title: String(result.data.title),
          date: new Date(result.data.date).toISOString().split('T')[0],
          time: String(result.data.time),
          locationName: String(result.data.locationName),
          travelMode: result.data.travelMode || 'driving',
          tripId: String(result.data.tripId),
          createdBy: String(result.data.createdBy),
          
          // Optional fields with proper type conversion
          ...(result.data.latitude && { latitude: String(result.data.latitude) }),
          ...(result.data.longitude && { longitude: String(result.data.longitude) }),
          ...(result.data.notes && { notes: result.data.notes }),
          ...(result.data.tag && { tag: result.data.tag }),
          ...(result.data.assignedTo && { assignedTo: result.data.assignedTo }),
          
          // Timestamps
          createdAt: now,
          updatedAt: now
        };
        
        const activity = await activityService.create(activityData);
        return res.status(201).json(transformActivityToFrontend(activity));
      } catch (error) {
        console.error('Error creating activity:', error);
        return res.status(500).json({ error: 'Failed to create activity' });
      }
    }
  )
);

// Get activity by ID
router.get<{ activityId: string }>(
  '/:activityId',
  createHandler<{ activityId: string }>(async (req: ActivitiesRequest, res) => {
    const { activityId } = req.params;
    const authContext = getAuthContext(req);
    const userId = authContext.userId ? String(authContext.userId) : null;
    const organizationId = authContext.organizationId;
    
    if (!userId || !organizationId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Validate activityId is a valid UUID
    if (!validateUuid(activityId)) {
      return res.status(400).json({ message: 'Invalid activity ID format' });
    }

    const activity = await ensureActivityAccess(req, activityId);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    return res.json(transformActivityToFrontend(activity));
  })
);

// Type for updating an activity
type UpdateActivityBody = Partial<Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>> & {
  date?: string | Date;
};

// Update activity
router.put<{ activityId: string }, any, UpdateActivityBody>(
  '/:activityId',
  createHandler<{ activityId: string }, any, UpdateActivityBody>(
    async (req: ActivitiesRequest, res) => {
      const { activityId } = req.params;
      const authContext = getAuthContext(req);
      const userId = authContext.userId ? String(authContext.userId) : null;
      const organizationId = authContext.organizationId;
      
      if (!userId || !organizationId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Validate activityId is a valid UUID
      if (!validateUuid(activityId)) {
        return res.status(400).json({ message: 'Invalid activity ID format' });
      }

      const activity = await ensureActivityAccess(req, activityId);
      if (!activity) {
        return res.status(404).json({ message: 'Activity not found' });
      }

      // Validate the update data
      const updateSchema = activityFormSchema.partial();
      const result = updateSchema.safeParse({
        ...req.body,
        // Ensure required fields are present with proper types
        date: req.body.date ? new Date(req.body.date).toISOString().split('T')[0] : activity.date,
        time: req.body.time || activity.time || new Date().toTimeString().slice(0, 5),
        locationName: req.body.locationName || activity.locationName,
        travelMode: req.body.travelMode || activity.travelMode || 'driving',
        title: req.body.title || activity.title
      });
      
      if (!result.success) {
        return res.status(400).json({
          message: 'Invalid activity data',
          errors: result.error.format(),
        });
      }

      try {
        // Prepare update data with proper types
        const updateData: Record<string, any> = {
          ...result.data,
          updatedAt: new Date().toISOString(),
          organizationId, // Ensure organization ID is always set
        };
        
        // Handle date conversion if present
        if (result.data.date) {
          const dateValue = new Date(result.data.date);
          updateData.date = isNaN(dateValue.getTime()) 
            ? new Date().toISOString().split('T')[0] 
            : dateValue.toISOString().split('T')[0];
        }
        
        // Remove undefined values to avoid overwriting with undefined
        Object.keys(updateData).forEach(key => 
          updateData[key as keyof Activity] === undefined && delete updateData[key as keyof Activity]
        );
        
        const updatedActivity = await activityService.update(activityId, updateData);
        
        if (!updatedActivity) {
          return res.status(404).json({ message: 'Activity not found or update failed' });
        }
        
        // Log the activity update
        if (userId && organizationId) {
          await logUserActivity(
            userId.toString(), 
            organizationId.toString(), 
            'update_activity', 
            {
              activityId: updatedActivity.id.toString(),
              tripId: updatedActivity.tripId.toString(),
              title: updatedActivity.title,
              updatedFields: Object.keys(result.data)
            }, 
            req.ip || 'unknown', 
            req.get('user-agent') || 'unknown'
          );
        }
        
        return res.json({
          success: true,
          data: transformActivityToFrontend(updatedActivity)
        });
      } catch (error) {
        console.error('Error updating activity:', error);
        return res.status(500).json({ error: 'Failed to update activity' });
      }
    })
  );
// Delete activity by ID
router.delete<{ activityId: string }>(
  '/:activityId',
  createHandler<{ activityId: string }>(async (req: ActivitiesRequest, res) => {
    const { activityId } = req.params;
    const authContext = getAuthContext(req);
    const userId = authContext.userId ? String(authContext.userId) : null;
    const organizationId = authContext.organizationId;
    
    if (!userId || !organizationId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Validate activityId is a valid UUID
    if (!validateUuid(activityId)) {
      return res.status(400).json({ message: 'Invalid activity ID format' });
    }

    // Check if activity exists and user has access
    const activity = await ensureActivityAccess(req, activityId);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    try {
      // Delete the activity
      const deleted = await activityService.delete(activityId);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Activity not found or already deleted' });
      }

      // Log the activity deletion
      await logUserActivity(
        userId,
        organizationId,
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
      return res.status(500).json({ message: 'Failed to delete activity' });
    }
  })
);
export default router;
