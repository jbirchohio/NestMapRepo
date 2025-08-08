import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { insertTripSchema } from '@shared/schema';
import { jwtAuthMiddleware } from '../middleware/jwtAuth';
// Organization scoping removed for consumer app
import { fieldTransformMiddleware } from '../middleware/fieldTransform';
import { storage } from '../storage';
import { generatePdfBuffer } from '../utils/pdfHelper';
import { db } from '../db-connection';
import { trips as tripsTable, users } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication and organization context to all trip routes
router.use(jwtAuthMiddleware);
// Organization context removed for consumer app
router.use(fieldTransformMiddleware);

// Get all trips for authenticated user with organization filtering
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const orgId = req.user?.organization_id;
    
    if (!userId) {
      return res.status(401).json({ message: "User ID required" });
    }

    // Use secure storage method that enforces organization isolation
    const trips = await storage.getTripsByUserId(userId, orgId);
    res.json(trips);
  } catch (error) {
    logger.error("Error fetching trips:", error);
    res.status(500).json({ message: "Could not fetch trips" });
  }
});

// Add organization-scoped trips endpoint for corporate features
router.get('/corporate', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const orgId = req.user?.organization_id;
    
    if (!userId || !orgId) {
      return res.status(400).json({ message: "User and organization context required" });
    }

    // Get all trips for the organization, not just the current user
    const trips = await storage.getTripsByOrganizationId(orgId);
    
    // Transform database field names to match frontend expectations and add user details
    const tripsWithUserDetails = await Promise.all(
      trips.map(async (trip) => {
        const user = await storage.getUser(trip.user_id);
        return {
          id: trip.id,
          title: trip.title,
          startDate: trip.start_date.toISOString(),
          endDate: trip.end_date.toISOString(),
          userId: trip.user_id,
          city: trip.city,
          country: trip.country,
          budget: trip.budget,
          completed: trip.completed,
          trip_type: trip.trip_type,
          client_name: trip.client_name,
          project_type: trip.project_type,
          userName: user?.display_name || 'Unknown User',
          userEmail: user?.email || 'No Email'
        };
      })
    );

    logger.info(`Found ${trips.length} trips for organization ${orgId}`);
    res.json(tripsWithUserDetails);
  } catch (error) {
    logger.error('Error fetching corporate trips:', error);
    res.status(500).json({ message: "Failed to fetch corporate trips" });
  }
});

// Get todos for a specific trip
router.get("/:id/todos", async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.id);
    if (isNaN(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    const userId = req.user?.id;
    const orgId = req.user?.organization_id;
    
    if (!userId) {
      return res.status(401).json({ message: "User ID required" });
    }

    // Verify trip exists and user has access
    const trip = await storage.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Verify organization access
    if (req.user?.role !== 'super_admin' && trip.organization_id !== orgId) {
      return res.status(403).json({ message: "Access denied: Cannot access this trip" });
    }

    const todos = await storage.getTodosByTripId(tripId);
    res.json(todos);
  } catch (error) {
    logger.error("Error fetching todos for trip", { tripId: req.params.id, error });
    res.status(500).json({ message: "Could not fetch todos", error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get notes for a specific trip
router.get("/:id/notes", async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.id);
    if (isNaN(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    const userId = req.user?.id;
    const orgId = req.user?.organization_id;
    
    if (!userId) {
      return res.status(401).json({ message: "User ID required" });
    }

    // Verify trip exists and user has access
    const trip = await storage.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Verify organization access
    if (req.user?.role !== 'super_admin' && trip.organization_id !== orgId) {
      return res.status(403).json({ message: "Access denied: Cannot access this trip" });
    }

    const notes = await storage.getNotesByTripId(tripId);
    res.json(notes);
  } catch (error) {
    logger.error("Error fetching notes for trip", { tripId: req.params.id, error });
    res.status(500).json({ message: "Could not fetch notes", error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get activities for a specific trip
router.get("/:id/activities", async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.id);
    if (isNaN(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    const userId = req.user?.id;
    const orgId = req.user?.organization_id;
    
    if (!userId) {
      return res.status(401).json({ message: "User ID required" });
    }

    // Verify trip exists and user has access
    const trip = await storage.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Verify organization access
    if (req.user?.role !== 'super_admin' && trip.organization_id !== orgId) {
      return res.status(403).json({ message: "Access denied: Cannot access this trip" });
    }

    const activities = await storage.getActivitiesByTripId(tripId);
    res.json(activities);
  } catch (error) {
    logger.error("Error fetching activities for trip", { tripId: req.params.id, error });
    res.status(500).json({ message: "Could not fetch activities", error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get specific trip by ID with organization access control - bypassing case conversion for dates
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  // Skip case conversion middleware for this route
  req.skipCaseConversion = true;
  try {
    const tripId = parseInt(req.params.id);
    console.log('Trip GET request:', { 
      tripId, 
      userId: req.user?.id, 
      orgId: req.user?.organization_id,
      isDemo: req.isDemo 
    });
    
    if (isNaN(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    // Direct database query to avoid case conversion middleware corrupting dates
    const [trip] = await db
      .select()
      .from(tripsTable)
      .where(eq(tripsTable.id, tripId));

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Verify organization access
    const userOrgId = req.user?.organization_id;
    if (req.user?.role !== 'super_admin' && trip.organization_id !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot access this trip" });
    }
    
    console.log('Trip from database:', {
      id: trip.id,
      city: trip.city,
      city_latitude: trip.city_latitude,
      city_longitude: trip.city_longitude
    });

    // Manual transformation to ensure dates are properly formatted as ISO date strings
    const transformedTrip = {
      id: trip.id,
      title: trip.title,
      startDate: trip.start_date ? new Date(trip.start_date).toISOString().split('T')[0] : null,
      endDate: trip.end_date ? new Date(trip.end_date).toISOString().split('T')[0] : null,
      userId: trip.user_id,
      organizationId: trip.organization_id,
      collaborators: trip.collaborators || [],
      isPublic: trip.is_public,
      shareCode: trip.share_code,
      sharingEnabled: trip.sharing_enabled,
      sharePermission: trip.share_permission,
      city: trip.city,
      country: trip.country,
      location: trip.location,
      cityLatitude: trip.city_latitude,
      cityLongitude: trip.city_longitude,
      hotel: trip.hotel,
      hotelLatitude: trip.hotel_latitude,
      hotelLongitude: trip.hotel_longitude,
      completed: trip.completed,
      completedAt: trip.completed_at,
      tripType: trip.trip_type,
      clientName: trip.client_name,
      projectType: trip.project_type,
      budget: trip.budget,
      createdAt: trip.created_at ? new Date(trip.created_at).toISOString() : null,
      updatedAt: trip.updated_at ? new Date(trip.updated_at).toISOString() : null,
    };

    res.json(transformedTrip);
  } catch (error) {
    logger.error("Error fetching trip:", error);
    res.status(500).json({ message: "Could not fetch trip" });
  }
});

// Create new trip with organization context and subscription limits
router.post("/", async (req: Request, res: Response) => {
  try {
    console.log('Trip POST request:', {
      body: req.body,
      userId: req.user?.id,
      orgId: req.user?.organization_id,
      isDemo: req.isDemo,
      // Debug coordinate fields
      cityLat: req.body.city_latitude,
      cityLng: req.body.city_longitude
    });
    
    let tripData;
    try {
      tripData = insertTripSchema.parse({
        ...req.body,
        user_id: req.user?.id
      });
      
      console.log('Parsed trip data to save:', {
        city: tripData.city,
        city_latitude: tripData.city_latitude,
        city_longitude: tripData.city_longitude,
        fullTripData: tripData
      });
    } catch (parseError) {
      console.error('Schema parsing error:', parseError);
      throw parseError;
    }

    const trip = await storage.createTrip(tripData);
    console.log('Created trip with coordinates:', {
      id: trip.id,
      city: trip.city,
      cityLat: trip.city_latitude,
      cityLng: trip.city_longitude
    });
    res.status(201).json(trip);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid trip data", errors: error.errors });
    }
    logger.error("Error creating trip:", error);
    res.status(500).json({ message: "Could not create trip" });
  }
});

// Update trip with organization access control
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.id);
    if (isNaN(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    // Verify trip exists and user has access
    const existingTrip = await storage.getTrip(tripId);
    if (!existingTrip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const userOrgId = req.user?.organization_id;
    if (req.user?.role !== 'super_admin' && existingTrip.organization_id !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot modify this trip" });
    }

    const updateData = insertTripSchema.partial().parse(req.body);
    const updatedTrip = await storage.updateTrip(tripId, updateData);

    if (!updatedTrip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.json(updatedTrip);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid trip data", errors: error.errors });
    }
    logger.error("Error updating trip:", error);
    res.status(500).json({ message: "Could not update trip" });
  }
});

// Delete trip with organization access control
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.id);
    if (isNaN(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    // Verify trip exists and user has access
    const existingTrip = await storage.getTrip(tripId);
    if (!existingTrip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const userOrgId = req.user?.organization_id;
    if (req.user?.role !== 'super_admin' && existingTrip.organization_id !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot delete this trip" });
    }

    const success = await storage.deleteTrip(tripId);
    if (!success) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.json({ message: "Trip deleted successfully" });
  } catch (error) {
    logger.error("Error deleting trip:", error);
    res.status(500).json({ message: "Could not delete trip" });
  }
});

// Export trip as PDF
router.get("/:id/export/pdf", async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.id);
    if (isNaN(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    const trip = await storage.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Verify organization access
    const userOrgId = req.user?.organization_id;
    if (req.user?.role !== 'super_admin' && trip.organization_id !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot export this trip" });
    }

    const [activities, todos, notes] = await Promise.all([
      storage.getActivitiesByTripId(tripId),
      storage.getTodosByTripId(tripId),
      storage.getNotesByTripId(tripId)
    ]);

    const pdfBuffer = await generatePdfBuffer({
      trip,
      activities,
      todos,
      notes
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${trip.title.replace(/[^a-z0-9]/gi, '_')}_itinerary.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error("Error generating PDF:", error);
    res.status(500).json({ message: "Could not generate PDF export" });
  }
});

// Generate AI-powered trip proposal
router.post("/:tripId/proposal", async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.trip_id);
    if (isNaN(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    const { clientName, contactEmail, contactPhone, contactWebsite, message } = req.body;

    if (!clientName || !contactEmail) {
      return res.status(400).json({ message: "Client name and contact email are required" });
    }

    const trip = await storage.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Verify organization access
    const userOrgId = req.user?.organization_id;
    if (req.user?.role !== 'super_admin' && trip.organization_id !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot generate proposal for this trip" });
    }

    const activities = await storage.getActivitiesByTripId(tripId);

    const proposalData = {
      trip,
      activities,
      clientName,
      agentName: (req.user as any)?.displayName || req.user?.username || "Travel Agent",
      companyName: "Remvana Travel Services",
      estimatedCost: trip.budget || 0,
      costBreakdown: {
        flights: Math.round((trip.budget || 0) * 0.4),
        hotels: Math.round((trip.budget || 0) * 0.3),
        activities: Math.round((trip.budget || 0) * 0.15),
        meals: Math.round((trip.budget || 0) * 0.1),
        transportation: Math.round((trip.budget || 0) * 0.03),
        miscellaneous: Math.round((trip.budget || 0) * 0.02)
      },
      proposalNotes: message || "We're excited to present this customized travel itinerary tailored specifically for your needs.",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      contactInfo: {
        email: contactEmail,
        phone: contactPhone,
        website: contactWebsite
      }
    };

    // Proposal generation removed - not needed for consumer app
    return res.status(400).json({ message: "Proposal generation not available" });
  } catch (error: any) {
    logger.error("Error generating proposal:", error);
    res.status(500).json({ message: "Error generating proposal: " + error.message });
  }
});

// Trip sharing endpoints
router.get("/:tripId/share", async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.trip_id);
    if (isNaN(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    const trip = await storage.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Verify organization access
    const userOrgId = req.user?.organization_id;
    if (req.user?.role !== 'super_admin' && trip.organization_id !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot access this trip" });
    }

    res.json({
      sharing_enabled: trip.sharing_enabled,
      share_permission: trip.share_permission,
      shareCode: trip.share_code
    });
  } catch (error) {
    logger.error("Error fetching sharing settings:", error);
    res.status(500).json({ message: "Could not fetch sharing settings" });
  }
});

router.put("/:tripId/share", async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.trip_id);
    if (isNaN(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    const trip = await storage.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Verify organization access
    const userOrgId = req.user?.organization_id;
    if (req.user?.role !== 'super_admin' && trip.organization_id !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot modify this trip" });
    }

    const { sharing_enabled, share_permission } = req.body;

    let shareCode = trip.share_code;
    if (sharing_enabled && !shareCode) {
      shareCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    const updatedTrip = await storage.updateTrip(tripId, {
      sharingEnabled: sharing_enabled ?? trip.sharing_enabled,
      sharePermission: share_permission ?? trip.share_permission,
      shareCode: shareCode || undefined
    });

    if (!updatedTrip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.json({
      sharing_enabled: updatedTrip.sharing_enabled,
      share_permission: updatedTrip.share_permission,
      shareCode: updatedTrip.share_code
    });
  } catch (error) {
    logger.error("Error updating sharing settings:", error);
    res.status(500).json({ message: "Could not update sharing settings" });
  }
});

// Add hotel to trip
router.post("/:id/add-hotel", async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.id);
    if (isNaN(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    const trip = await storage.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Verify user owns this trip
    if (trip.user_id !== req.user?.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { hotel, checkIn, checkOut, trackingId, confirmed } = req.body;

    // Update trip with hotel information
    const updatedTrip = await storage.updateTrip(tripId, {
      hotel: hotel.name,
      hotelLatitude: hotel.latitude || null,
      hotelLongitude: hotel.longitude || null,
      hotelCheckIn: checkIn,
      hotelCheckOut: checkOut,
      hotelBookingUrl: hotel.bookingUrl,
      hotelPrice: hotel.price,
      hotelConfirmed: confirmed || false,
      hotelTrackingId: trackingId
    });

    // Also create an activity for the hotel stay
    await storage.createActivity({
      trip_id: tripId,
      title: `Check-in: ${hotel.name}`,
      description: `Hotel stay at ${hotel.name}`,
      date: new Date(checkIn),
      time: "15:00", // Standard check-in time
      type: "accommodation",
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      address: hotel.address,
      booking_reference: trackingId
    });

    // Create check-out activity
    await storage.createActivity({
      trip_id: tripId,
      title: `Check-out: ${hotel.name}`,
      description: `Check out from ${hotel.name}`,
      date: new Date(checkOut),
      time: "11:00", // Standard check-out time
      type: "accommodation",
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      address: hotel.address,
      booking_reference: trackingId
    });

    res.json({ 
      success: true, 
      trip: updatedTrip,
      message: "Hotel added to your trip!" 
    });
  } catch (error) {
    logger.error("Error adding hotel to trip:", error);
    res.status(500).json({ message: "Could not add hotel to trip" });
  }
});

// Export the router
// Trip Travelers Routes - Team member management for corporate trips

// Get all travelers for a specific trip
router.get("/:id/travelers", async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.id);
    if (isNaN(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    const travelers = await storage.getTripTravelers(tripId);
    res.json(travelers);
  } catch (error) {
    logger.error("Error fetching trip travelers:", error);
    res.status(500).json({ message: "Could not fetch trip travelers" });
  }
});

// Add a traveler to a trip
router.post("/:id/travelers", async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.id);
    if (isNaN(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    const travelerData = {
      trip_id: tripId,
      ...req.body
    };

    const newTraveler = await storage.addTripTraveler(travelerData);
    res.status(201).json(newTraveler);
  } catch (error) {
    logger.error("Error adding trip traveler:", error);
    res.status(500).json({ message: "Could not add trip traveler" });
  }
});

// Update a traveler's information
router.put("/:id/travelers/:travelerId", async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.id);
    const travelerId = parseInt(req.params.travelerId);
    
    if (isNaN(tripId) || isNaN(travelerId)) {
      return res.status(400).json({ message: "Invalid trip or traveler ID" });
    }

    const updatedTraveler = await storage.updateTripTraveler(travelerId, req.body);
    if (!updatedTraveler) {
      return res.status(404).json({ message: "Traveler not found" });
    }
    
    res.json(updatedTraveler);
  } catch (error) {
    logger.error("Error updating trip traveler:", error);
    res.status(500).json({ message: "Could not update trip traveler" });
  }
});

// Remove a traveler from a trip
router.delete("/:id/travelers/:travelerId", async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.id);
    const travelerId = parseInt(req.params.travelerId);
    
    if (isNaN(tripId) || isNaN(travelerId)) {
      return res.status(400).json({ message: "Invalid trip or traveler ID" });
    }

    await storage.removeTripTraveler(travelerId);
    res.status(204).send();
  } catch (error) {
    logger.error("Error removing trip traveler:", error);
    res.status(500).json({ message: "Could not remove trip traveler" });
  }
});

export default router;