import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { insertActivitySchema, transformActivityToFrontend } from '@shared/schema';
import { transformActivityToDatabase } from '@shared/fieldTransforms';
import { validateJWT } from '../middleware/jwtAuth';
import { injectOrganizationContext } from '../middleware/organizationScoping';
import { storage } from '../storage';
import { validateAndSanitizeRequest } from '../middleware/inputValidation';

const router = Router();

// Apply authentication and organization context to all activity routes
router.use(validateJWT);
router.use(injectOrganizationContext);

// Zod schemas for route parameters
const tripIdParamSchema = z.object({
  trip_id: z.coerce.number().int().positive("Invalid Trip ID"),
});

const activityIdParamSchema = z.object({
  id: z.coerce.number().int().positive("Invalid Activity ID"),
});

const activityOrderSchema = z.object({
  order: z.number().int(),
});

// Get activities for a specific trip
router.get("/trip/:trip_id", validateAndSanitizeRequest({ params: tripIdParamSchema }), async (req: Request, res: Response) => {
  try {
    const tripId = req.params.trip_id as number;

    // Verify trip exists and user has access
    const trip = await storage.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const userOrgId = req.user?.organizationId;
    if (req.user?.role !== 'super_admin' && trip.organization_id !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot access this trip's activities" });
    }

    const activities = await storage.getActivitiesByTripId(tripId);
    res.json(activities);
  } catch (error) {
    console.error("Error fetching activities:", error);
    res.status(500).json({ message: "Could not fetch activities" });
  }
});

// Create new activity
router.post("/", validateAndSanitizeRequest({ body: insertActivitySchema }), async (req: Request, res: Response) => {
  try {
    const validatedBody = req.body as z.infer<typeof insertActivitySchema>;
    const activityData = {
      ...validatedBody,
      organizationId: req.user?.organizationId === null ? undefined : req.user?.organizationId
    };

    // Verify trip exists and user has access
    const trip = await storage.getTrip(activityData.tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const userOrgId = req.user?.organizationId;
    if (req.user?.role !== 'super_admin' && trip.organization_id !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot add activities to this trip" });
    }

    const activity = await storage.createActivity(activityData);
    res.status(201).json(activity);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid activity data", errors: error.errors });
    }
    console.error("Error creating activity:", error);
    res.status(500).json({ message: "Could not create activity" });
  }
});

// Update activity
router.put("/:id", validateAndSanitizeRequest({ params: activityIdParamSchema, body: insertActivitySchema.partial() }), async (req: Request, res: Response) => {
  try {
    const activityId = req.params.id as number;

    // Verify activity exists
    const existingActivity = await storage.getActivity(activityId);
    if (!existingActivity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    // Verify trip access
    const trip = await storage.getTrip(existingActivity.trip_id);
    if (!trip) {
      return res.status(404).json({ message: "Associated trip not found" });
    }

    const userOrgId = req.user?.organizationId;
    if (req.user?.role !== 'super_admin' && trip.organization_id !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot modify this activity" });
    }

    const updateData = req.body as Partial<z.infer<typeof insertActivitySchema>>;
    const updatedActivity = await storage.updateActivity(activityId, updateData);
    
    if (!updatedActivity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    res.json(updatedActivity);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid activity data", errors: error.errors });
    }
    console.error("Error updating activity:", error);
    res.status(500).json({ message: "Could not update activity" });
  }
});

// Delete activity
router.delete("/:id", validateAndSanitizeRequest({ params: activityIdParamSchema }), async (req: Request, res: Response) => {
  try {
    const activityId = req.params.id as number;

    // Verify activity exists
    const existingActivity = await storage.getActivity(activityId);
    if (!existingActivity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    // Verify trip access
    const trip = await storage.getTrip(existingActivity.trip_id);
    if (!trip) {
      return res.status(404).json({ message: "Associated trip not found" });
    }

    const userOrgId = req.user?.organizationId;
    if (req.user?.role !== 'super_admin' && trip.organization_id !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot delete this activity" });
    }

    const success = await storage.deleteActivity(activityId);
    if (!success) {
      return res.status(404).json({ message: "Activity not found" });
    }

    res.json({ message: "Activity deleted successfully" });
  } catch (error) {
    console.error("Error deleting activity:", error);
    res.status(500).json({ message: "Could not delete activity" });
  }
});

// Update activity order (for drag-and-drop reordering)
router.put("/:id/order", validateAndSanitizeRequest({ params: activityIdParamSchema, body: activityOrderSchema }), async (req: Request, res: Response) => {
  try {
    const activityId = req.params.id as number;
    const { order } = req.body as { order: number };

    // Verify activity exists
    const existingActivity = await storage.getActivity(activityId);
    if (!existingActivity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    // Verify trip access
    const trip = await storage.getTrip(existingActivity.trip_id);
    if (!trip) {
      return res.status(404).json({ message: "Associated trip not found" });
    }

    const userOrgId = req.user?.organizationId;
    if (req.user?.role !== 'super_admin' && trip.organization_id !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot reorder this activity" });
    }

    const updatedActivity = await storage.updateActivity(activityId, { order });
    
    if (!updatedActivity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    res.json(updatedActivity);
  } catch (error) {
    console.error("Error updating activity order:", error);
    res.status(500).json({ message: "Could not update activity order" });
  }
});

// Toggle activity completion status
router.patch("/:id/complete", validateAndSanitizeRequest({ params: activityIdParamSchema }), async (req: Request, res: Response) => {
  try {
    const activityId = Number(req.params.id);

    // Verify activity exists
    const existingActivity = await storage.getActivity(activityId);
    if (!existingActivity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    // Verify trip access
    const trip = await storage.getTrip(existingActivity.trip_id);
    if (!trip) {
      return res.status(404).json({ message: "Associated trip not found" });
    }

    const userOrgId = req.user?.organizationId;
    if (req.user?.role !== 'super_admin' && trip.organization_id !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot modify this activity" });
    }

    const updatedActivity = await storage.updateActivity(activityId, { 
      completed: !existingActivity.completed 
    });
    
    if (!updatedActivity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    res.json(updatedActivity);
  } catch (error) {
    console.error("Error toggling activity completion:", error);
    res.status(500).json({ message: "Could not update activity completion status" });
  }
});

export default router;