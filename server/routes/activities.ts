import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { insertActivitySchema, transformActivityToFrontend } from '@shared/schema';
import { transformActivityToDatabase } from '@shared/fieldTransforms';
import { jwtAuthMiddleware } from '../middleware/jwtAuth';
// Organization scoping removed for consumer app
import { storage } from '../storage';
import { logger } from '../utils/logger';
import { geocodeLocation } from '../geocoding';

const router = Router();

// Apply authentication to all activity routes
router.use(jwtAuthMiddleware);

// Get activities for a specific trip
router.get("/trip/:trip_id", async (req: Request, res: Response) => {
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

    // For consumer app, just verify user owns the trip
    if (trip.user_id !== req.user?.id) {
      return res.status(403).json({ message: "Access denied: Cannot access this trip's activities" });
    }

    const activities = await storage.getActivitiesByTripId(tripId);
    res.json(activities);
  } catch (error) {
    logger.error("Error fetching activities:", error);
    res.status(500).json({ message: "Could not fetch activities" });
  }
});

// Create new activity
router.post("/", async (req: Request, res: Response) => {
  try {
    // After case conversion middleware, req.body already has snake_case fields
    // The insertActivitySchema expects snake_case (matching the database schema)
    const activityData = insertActivitySchema.parse({
      trip_id: req.body.trip_id,
      title: req.body.title,
      date: req.body.date,
      time: req.body.time,
      location_name: req.body.location_name,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      notes: req.body.notes,
      tag: req.body.tag,
      assigned_to: req.body.assigned_to,
      order: req.body.order,
      travel_mode: req.body.travel_mode,
      organization_id: req.user?.organization_id
    });

    // Verify trip exists and user has access
    const trip = await storage.getTrip(activityData.trip_id);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // For consumer app, just verify user owns the trip
    if (trip.user_id !== req.user?.id) {
      return res.status(403).json({ message: "Access denied: Cannot add activities to this trip" });
    }

    // Geocode location if coordinates are not provided
    if (activityData.location_name && (!activityData.latitude || !activityData.longitude)) {
      const geocodeResult = await geocodeLocation(activityData.location_name, trip.city || trip.location);
      
      if (geocodeResult) {
        activityData.latitude = geocodeResult.latitude;
        activityData.longitude = geocodeResult.longitude;
        console.log(`Geocoded "${activityData.location_name}" to ${geocodeResult.latitude}, ${geocodeResult.longitude}`);
      } else {
        console.log(`Failed to geocode "${activityData.location_name}"`);
      }
    }

    const activity = await storage.createActivity(activityData);
    res.status(201).json(activity);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid activity data", errors: error.errors });
    }
    logger.error("Error creating activity:", error);
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

    // For consumer app, just verify user owns the trip
    if (trip.user_id !== req.user?.id) {
      return res.status(403).json({ message: "Access denied: Cannot modify this activity" });
    }

    // After case conversion middleware, req.body already has snake_case fields
    // The insertActivitySchema expects snake_case (matching the database schema)
    const updateData = insertActivitySchema.partial().parse({
      trip_id: req.body.trip_id,
      title: req.body.title,
      date: req.body.date,
      time: req.body.time,
      location_name: req.body.location_name,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      notes: req.body.notes,
      tag: req.body.tag,
      assigned_to: req.body.assigned_to,
      order: req.body.order,
      travel_mode: req.body.travel_mode
    });
    
    // If location name changed but no new coordinates, geocode the new location
    if (updateData.location_name && 
        (!updateData.latitude || !updateData.longitude) &&
        updateData.location_name !== existingActivity.location_name) {
      
      // Get trip to use city as context
      const trip = await storage.getTrip(existingActivity.trip_id);
      const geocodeResult = await geocodeLocation(updateData.location_name, trip?.city || trip?.location);
      
      if (geocodeResult) {
        updateData.latitude = geocodeResult.latitude;
        updateData.longitude = geocodeResult.longitude;
        console.log(`Geocoded updated location "${updateData.location_name}" to ${geocodeResult.latitude}, ${geocodeResult.longitude}`);
      }
    }
    
    const updatedActivity = await storage.updateActivity(activityId, updateData);
    
    if (!updatedActivity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    res.json(updatedActivity);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid activity data", errors: error.errors });
    }
    logger.error("Error updating activity:", error);
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
    logger.error("Error deleting activity:", error);
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
    logger.error("Error updating activity order:", error);
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

    // For consumer app, just verify user owns the trip
    if (trip.user_id !== req.user?.id) {
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
    logger.error("Error toggling activity completion:", error);
    res.status(500).json({ message: "Could not update activity completion status" });
  }
});

export default router;