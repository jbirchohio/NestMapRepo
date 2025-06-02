import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { insertActivitySchema, transformActivityToFrontend } from '@shared/schema';
import { transformActivityToDatabase } from '@shared/fieldTransforms';
import { unifiedAuthMiddleware } from '../middleware/unifiedAuth';
import { injectOrganizationContext } from '../middleware/organizationScoping';
import { storage } from '../storage';

const router = Router();

// Apply authentication and organization context to all activity routes
router.use(unifiedAuthMiddleware);
router.use(injectOrganizationContext);

// Get activities for a specific trip
router.get("/trip/:tripId", async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.trip_id);
    if (isNaN(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    // Verify trip exists and user has access
    const trip = await storage.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const userOrgId = req.user?.organization_id || req.user?.organization_id;
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
router.post("/", async (req: Request, res: Response) => {
  try {
    const activityData = insertActivitySchema.parse({
      ...req.body,
      organization_id: req.user?.organization_id || req.user?.organization_id
    });

    // Verify trip exists and user has access
    const trip = await storage.getTrip(activityData.trip_id);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const userOrgId = req.user?.organization_id || req.user?.organization_id;
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
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const activityId = parseInt(req.params.id);
    if (isNaN(activityId)) {
      return res.status(400).json({ message: "Invalid activity ID" });
    }

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

    const userOrgId = req.user?.organization_id || req.user?.organization_id;
    if (req.user?.role !== 'super_admin' && trip.organization_id !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot modify this activity" });
    }

    const updateData = insertActivitySchema.partial().parse(req.body);
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
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const activityId = parseInt(req.params.id);
    if (isNaN(activityId)) {
      return res.status(400).json({ message: "Invalid activity ID" });
    }

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

    const userOrgId = req.user?.organization_id || req.user?.organization_id;
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
router.put("/:id/order", async (req: Request, res: Response) => {
  try {
    const activityId = parseInt(req.params.id);
    const { order } = req.body;
    
    if (isNaN(activityId) || typeof order !== 'number') {
      return res.status(400).json({ message: "Invalid activity ID or order" });
    }

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

    const userOrgId = req.user?.organization_id || req.user?.organization_id;
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
router.patch("/:id/complete", async (req: Request, res: Response) => {
  try {
    const activityId = parseInt(req.params.id);
    if (isNaN(activityId)) {
      return res.status(400).json({ message: "Invalid activity ID" });
    }

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

    const userOrgId = req.user?.organization_id || req.user?.organization_id;
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