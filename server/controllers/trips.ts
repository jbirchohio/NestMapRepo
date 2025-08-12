import type { Request, Response } from "express";
import { storage } from "../storage";
import { insertTripSchema } from "@shared/schema";
import { z } from "zod";
import { logger } from '../utils/logger';
import {
  validateAndSanitizeBody,
  validateContentLength,
  contentCreationRateLimit,
  validationSchemas
} from "../middleware/inputValidation";
// Organization context removed for consumer app

// All demo data removed - system uses authentic database queries only

export async function getTrips(req: Request, res: Response) {
  try {
    const userId = req.query.user_id as string;

    // All demo data removed - system uses authentic database queries only

    const numericUserId = Number(userId);
    if (isNaN(numericUserId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Organization logging removed for consumer app

    const trips = await storage.getTripsByUserId(numericUserId);

    // Organization filtering removed for consumer app
    res.json(trips);
  } catch (error) {
    logger.error("Error fetching trips", { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ message: "Could not fetch trips", error: error instanceof Error ? error.message : "Unknown error" });
  }
}

export async function getTripById(req: Request, res: Response) {
  try {
    const tripIdParam = req.params.id;

    // All demo data removed - system uses authentic database queries only

    const tripId = Number(tripIdParam);
    if (isNaN(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const trip = await storage.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Verify user can access this trip
    if (trip.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied: Cannot access this trip" });
    }

    res.json(trip);
  } catch (error) {
    logger.error("Error fetching trip", { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ message: "Could not fetch trip", error: error instanceof Error ? error.message : "Unknown error" });
  }
}

export async function createTrip(req: Request, res: Response) {
  try {
    // Validate and process trip data

    // Validate user_id is numeric
    if (req.body.user_id && typeof req.body.user_id === 'string' &&
        (req.body.user_id.startsWith('demo-corp-') || req.body.user_id.startsWith('demo-agency-'))) {
      return res.status(400).json({ message: "Demo users are not supported. Please use a real user account." });
    }

    // Handle both camelCase and snake_case field names from frontend
    const normalizedBody = {
      ...req.body,
      start_date: req.body.start_date || req.body.startDate,
      end_date: req.body.end_date || req.body.endDate,
      user_id: req.body.user_id || req.body.user_id,
      sharing_enabled: req.body.sharing_enabled || req.body.sharingEnabled,
      share_permission: req.body.share_permission || req.body.sharePermission,
      city_latitude: req.body.city_latitude || req.body.cityLatitude,
      city_longitude: req.body.city_longitude || req.body.cityLongitude,
      hotel_latitude: req.body.hotel_latitude || req.body.hotelLatitude,
      hotel_longitude: req.body.hotel_longitude || req.body.hotelLongitude,
      trip_type: req.body.trip_type,
      client_name: req.body.client_name || req.body.clientName,
      project_type: req.body.project_type || req.body.projectType,
      completed_at: req.body.completed_at || req.body.completedAt,
    };

    const tripData = insertTripSchema.parse(normalizedBody);

    // Ensure the location fields are properly included
    if (req.body.city) tripData.city = req.body.city;
    if (req.body.country) tripData.country = req.body.country;
    if (req.body.location) tripData.location = req.body.location;

    // Organization context removed for consumer app

    const trip = await storage.createTrip(tripData);

    // If this trip was created through the booking workflow with hotel information,
    // automatically create a hotel activity
    if (req.body.selectedHotel) {
      const hotel = req.body.selectedHotel;
      try {
        await storage.createActivity({
          tripId: trip.id,
          title: `Stay at ${hotel.name}`,
          date: new Date(trip.start_date),
          time: '15:00', // Standard check-in time
          locationName: hotel.name,
          latitude: null, // Hotel coordinates would need to be included in hotel data
          longitude: null,
          notes: `${hotel.starRating}-star hotel • ${hotel.amenities?.slice(0, 3).join(', ') || 'Amenities available'} • ${hotel.cancellation} cancellation`,
          tag: 'Accommodation',
          completed: false,
          order: 1
        });

        // Create check-out activity for multi-day trips
        if (trip.end_date > trip.start_date) {
          await storage.createActivity({
            tripId: trip.id,
            title: `Check out from ${hotel.name}`,
            date: new Date(trip.end_date),
            time: '11:00', // Standard check-out time
            locationName: hotel.name,
            latitude: null,
            longitude: null,
            notes: 'Hotel check-out',
            tag: 'Accommodation',
            completed: false,
            order: 2
          });
        }
      } catch (activityError) {
        logger.error("Error creating hotel activities", { tripId: trip.id, error: activityError instanceof Error ? activityError.message : 'Unknown error' });
        // Don't fail the trip creation if activity creation fails
      }
    }

    res.status(201).json(trip);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid trip data", errors: error.errors });
    }
    logger.error("Error creating trip", { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ message: "Could not create trip", error: error instanceof Error ? error.message : "Unknown error" });
  }
}

export async function updateTrip(req: Request, res: Response) {
  try {
    const tripId = Number(req.params.id);
    if (isNaN(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    // CRITICAL SECURITY FIX: Verify authentication
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Get existing trip to verify access
    const existingTrip = await storage.getTrip(tripId);
    if (!existingTrip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Verify user can modify this trip
    if (existingTrip.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied: Cannot modify this trip" });
    }

    // Create a partial schema with the same date transformation
    const partialTripSchema = z.object({
      title: z.string().optional(),
      startDate: z.string().or(z.date()).optional().transform(val => val ? (val instanceof Date ? val : new Date(val)) : undefined),
      endDate: z.string().or(z.date()).optional().transform(val => val ? (val instanceof Date ? val : new Date(val)) : undefined),
      userId: z.number().optional(),
      collaborators: z.array(z.any()).optional(),
      // Sharing and collaboration settings
      isPublic: z.boolean().optional(),
      shareCode: z.string().optional(),
      sharingEnabled: z.boolean().optional(),
      sharePermission: z.enum(["read-only", "edit"]).optional(),
      // Location information
      city: z.string().optional(),
      country: z.string().optional(),
      location: z.string().optional(),
      cityLatitude: z.string().optional(),
      cityLongitude: z.string().optional(),
      hotel: z.string().optional(),
      status: z.string().optional()
    });

    const updateData = partialTripSchema.parse(req.body);

    // Filter out null values to avoid type conflicts
    const filteredUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== null)
    );

    // Organization logging removed for consumer app

    const trip = await storage.updateTrip(tripId, filteredUpdateData);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.json(trip);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid trip data", errors: error.errors });
    }
    logger.error("Error updating trip", { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ message: "Could not update trip", error: error instanceof Error ? error.message : "Unknown error" });
  }
}

export async function deleteTrip(req: Request, res: Response) {
  try {
    const tripId = Number(req.params.id);
    if (isNaN(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    // CRITICAL SECURITY FIX: Verify authentication
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Get existing trip to verify access
    const existingTrip = await storage.getTrip(tripId);
    if (!existingTrip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Verify user can delete this trip
    if (existingTrip.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied: Cannot delete this trip" });
    }

    const success = await storage.deleteTrip(tripId);
    if (!success) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.json({ message: "Trip deleted successfully" });
  } catch (error) {
    logger.error("Error deleting trip", { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ message: "Could not delete trip", error: error instanceof Error ? error.message : "Unknown error" });
  }
}