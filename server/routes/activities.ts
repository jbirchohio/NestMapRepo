import { Router, type Response, type NextFunction, type Request, type RequestHandler } from 'express';
import type { ParamsDictionary, Query } from 'express-serve-static-core';
import { getAuthContext, requireAuth } from '../utils/authContext.js';
import { logUserActivity } from '../utils/activityLogger.js';
import type { JWTUser } from '../utils/authContext.js';
import { z } from 'zod';
import type { Activity, ActivityType, ActivityStatus } from '@shared/types/activity';
import { createActivitySchema, updateActivitySchema } from '../types/activity.js';
import activityService from '../services/activity.service.js';
import { validateOrganizationAccess } from '../middleware/organization.js';

// Type for authenticated user
type AuthenticatedUser = JWTUser & { id: string };

// Type guard to check if user is valid with string ID
function isValidUser(user: unknown): user is AuthenticatedUser {
  return (
    typeof user === 'object' && 
    user !== null &&
    'id' in user && 
    typeof (user as { id: unknown }).id === 'string' &&
    'email' in user && 
    'role' in user &&
    'organizationId' in user
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

// Extend the Express Request type with our custom properties
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

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
function transformActivityToFrontend(activity: Activity): any {
  return {
    ...activity,
    // Convert any fields as needed for frontend
    latitude: activity.latitude !== undefined ? Number(activity.latitude) : null,
    longitude: activity.longitude !== undefined ? Number(activity.longitude) : null
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
  createHandler<{ tripId: string }, any, any>(async (req, res) => {
    const result = tripIdParamSchema.safeParse({ tripId: req.params.tripId });
    if (!result.success) {
      return res.status(400).json({
        message: 'Invalid trip ID',
        errors: result.error.errors,
      });
    }
        const result = tripIdParamSchema.safeParse({ tripId: req.params.tripId });
        if (!result.success) {
            return res.status(400).json({
                message: 'Invalid trip ID',
                errors: result.error.errors,
            });
        }

        const { tripId } = result.data;
        const { userId, organizationId } = getAuthContext(req);

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
router.post<ParamsDictionary, any, Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>>(
  '/',
  createHandler<ParamsDictionary, any, Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>>(
    async (req, res) => {
      const { userId, organizationId } = getAuthContext(req);
      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validate UUIDs
      const tripId = validateUuid(req.body.tripId);
      if (!tripId) {
        return res.status(400).json({ error: 'Invalid trip ID format' });
      }

      // Prepare activity data with required fields matching the Activity interface
      const now = new Date();
      const activityData: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'> = {
        // Required fields with defaults
        title: req.body.title || 'New Activity',
        status: (req.body.status as ActivityStatus) || 'pending',
        type: (req.body.type as ActivityType) || 'other',
        startDate: req.body.startDate ? new Date(req.body.startDate).toISOString() : now.toISOString(),
        
        // Optional fields
        description: req.body.description,
        endDate: req.body.endDate ? new Date(req.body.endDate).toISOString() : undefined,
        locationName: req.body.locationName,
        location: req.body.location,
        latitude: req.body.latitude !== undefined ? Number(req.body.latitude) : undefined,
        longitude: req.body.longitude !== undefined ? Number(req.body.longitude) : undefined,
        notes: req.body.notes,
        
        // System fields
        tripId,
        organizationId,
        createdBy: userId
      };

      const result = createActivitySchema.safeParse(activityData);

      if (!result.success) {
        return res.status(400).json({
          error: 'Invalid activity data',
          details: result.error.format(),
        });
      }

      try {
        // Create the activity with validated data
        const now = new Date();
        const activityData: Omit<Activity, 'id'> = {
          // Required fields with defaults
          title: result.data.title || 'New Activity',
          status: (result.data.status as ActivityStatus) || 'pending',
          type: (result.data.type as ActivityType) || 'other',
          startDate: result.data.startDate ? new Date(result.data.startDate).toISOString() : now.toISOString(),
          
          // Optional fields
          ...(result.data.description && { description: result.data.description }),
          ...(result.data.endDate && { endDate: new Date(result.data.endDate).toISOString() }),
          ...(result.data.locationName && { locationName: result.data.locationName }),
          ...(result.data.location && { location: result.data.location }),
          ...(result.data.latitude !== undefined && { latitude: Number(result.data.latitude) }),
          ...(result.data.longitude !== undefined && { longitude: Number(result.data.longitude) }),
          ...(result.data.notes && { notes: result.data.notes }),
          
          // System fields
          tripId,
          organizationId,
          createdBy: userId,
          
          // Timestamps
          createdAt: now,
          updatedAt: now
        };
        
        const activity = await activityService.create(activityData);
          startDate: result.data.startDate ? new Date(result.data.startDate).toISOString() : now.toISOString(),
          
          // Set system fields
          tripId,
          organizationId,
          createdBy: userId,
          
          // Convert optional fields if they exist
          ...(result.data.endDate && { endDate: new Date(result.data.endDate).toISOString() }),
          ...(result.data.latitude !== undefined && { latitude: Number(result.data.latitude) }),
          ...(result.data.longitude !== undefined && { longitude: Number(result.data.longitude) }),
          
          // Set timestamps
          createdAt: now,
          updatedAt: now
        });
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
  createHandler<{ activityId: string }>(async (req, res) => {
    const { activityId } = req.params;
    const { userId, organizationId } = getAuthContext(req);
    
    if (!userId || !organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate activityId is a valid UUID
    if (!validateUuid(activityId)) {
      return res.status(400).json({ error: 'Invalid activity ID format' });
    }

    const activity = await ensureActivityAccess(req, activityId);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    return res.json(transformActivityToFrontend(activity));
  })
);
// Update activity
router.put<{ activityId: string }, any, UpdateActivityBody>(
  '/:activityId',
  createHandler<{ activityId: string }, any, UpdateActivityBody>(
    async (req, res) => {
      const { activityId } = req.params;
      const { userId, organizationId } = getAuthContext(req);
      
      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validate activityId is a valid UUID
      if (!validateUuid(activityId)) {
        return res.status(400).json({ error: 'Invalid activity ID format' });
      }

      const activity = await ensureActivityAccess(req, activityId);
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      const result = updateActivitySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: 'Invalid activity data',
          details: result.error.format(),
        });
      }

      try {
        // Prepare update data with proper types
        const updateData: Record<string, unknown> = {
          ...result.data
        };
        
        // Convert date fields to proper format if they exist
        if ('startDate' in updateData && updateData.startDate) {
          updateData.startDate = new Date(updateData.startDate as string).toISOString();
        }
        if ('endDate' in updateData && updateData.endDate) {
          updateData.endDate = new Date(updateData.endDate as string).toISOString();
        }
        
        // Convert numeric fields if they exist
        if ('latitude' in updateData && updateData.latitude !== undefined) {
          updateData.latitude = Number(updateData.latitude);
        }
        if ('longitude' in updateData && updateData.longitude !== undefined) {
          updateData.longitude = Number(updateData.longitude);
        }
        
        // Set updatedAt timestamp
        updateData.updatedAt = new Date();
        
        // Ensure organization ID is set if not provided
        if (organizationId && !updateData.organizationId) {
          updateData.organizationId = organizationId;
        }
        
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
});
// Delete activity by ID
router.delete<{
    activityId: string;
}>('/:activityId', async (req: ExtendedRequest<{
    activityId: string;
}> & {
    params: {
        activityId: string;
    };
}, res: Response, next: NextFunction) => {
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
        await logUserActivity(userId.toString(), organizationId.toString(), 'delete_activity', {
            activityId: activity.id.toString(),
            tripId: activity.tripId.toString(),
            title: activity.title
        }, req.ip || 'unknown', req.get('user-agent') || 'unknown');
        return res.json({
            success: true,
            message: 'Activity deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting activity:', error);
        return next(error);
    }
});
export default router;
