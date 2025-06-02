import type { Request, Response } from "express";
import { storage } from "../storage";
import { insertTripSchema } from "@shared/schema";
import { z } from "zod";
import { 
  validateAndSanitizeBody, 
  validateContentLength,
  contentCreationRateLimit,
  validationSchemas
} from "../middleware/inputValidation";
import {
  logOrganizationAccess,
  setOrganizationId
} from "../organizationContext";

// Demo data for testing role-based features
const getDemoTrips = (roleType: string) => {
  const baseTrips = [
    {
      id: 'demo-1',
      title: roleType === 'corporate' ? 'Q2 Team Offsite - Austin' : 'Johnson Family Vacation',
      description: roleType === 'corporate' ? 'Quarterly team meeting and strategy session' : 'Custom family vacation package',
      startDate: '2025-06-15',
      endDate: '2025-06-18',
      destination: 'Austin, TX',
      status: 'planning',
      created_at: new Date().toISOString(),
      user_id: roleType === 'corporate' ? 'demo-corp-1' : 'demo-agency-1'
    },
    {
      id: 'demo-2', 
      title: roleType === 'corporate' ? 'Client Meeting - San Francisco' : 'Miller Wedding Proposal',
      description: roleType === 'corporate' ? 'Important client presentation meeting' : 'Romantic honeymoon package proposal',
      startDate: '2025-07-01',
      endDate: '2025-07-03',
      destination: 'San Francisco, CA',
      status: 'approved',
      created_at: new Date().toISOString(),
      user_id: roleType === 'corporate' ? 'demo-corp-1' : 'demo-agency-1'
    }
  ];
  return baseTrips;
};

export async function getTrips(req: Request, res: Response) {
  try {
    const userId = req.query.userId as string;
    
    // Handle demo users
    if (userId && (userId.startsWith('demo-corp-') || userId.startsWith('demo-agency-'))) {
      const roleType = userId.startsWith('demo-corp-') ? 'corporate' : 'agency';
      const demoTrips = getDemoTrips(roleType);
      return res.json(demoTrips);
    }
    
    const numericUserId = Number(userId);
    if (isNaN(numericUserId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    // Log organization access for audit
    logOrganizationAccess(req, 'fetch', 'trips');
    
    console.log("Attempting to fetch trips for user ID:", numericUserId);
    const trips = await storage.getTripsByUserId(numericUserId);
    
    // Filter trips by organization context for multi-tenant security
    const filteredTrips = trips.filter(trip => {
      if (!req.organizationContext) return true; // Skip filtering for non-authenticated requests
      return req.organizationContext.canAccessOrganization(trip.organization_id);
    });
    
    console.log("Trips fetched successfully:", filteredTrips.length);
    res.json(filteredTrips);
  } catch (error) {
    console.error("Error fetching trips:", error);
    res.status(500).json({ message: "Could not fetch trips", error: error instanceof Error ? error.message : "Unknown error" });
  }
}

export async function getTripById(req: Request, res: Response) {
  try {
    const tripIdParam = req.params.id;
    
    // Handle demo trips
    if (tripIdParam.startsWith('demo-trip-')) {
      const mockTrip = {
        id: tripIdParam,
        title: 'Demo Trip',
        description: 'Demo trip for testing',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        city: 'Demo City',
        country: 'Demo Country',
        userId: 'demo-user',
        status: 'confirmed',
        created_at: new Date().toISOString()
      };
      return res.json(mockTrip);
    }
    
    const tripId = Number(tripIdParam);
    if (isNaN(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }
    
    // CRITICAL SECURITY FIX: Add organization filtering to prevent cross-tenant data access
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const trip = await storage.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }
    
    // CRITICAL: Verify user can access this trip's organization
    const userOrgId = req.user.organizationId || null;
    if (req.user.role !== 'super_admin' && trip.organization_id !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot access this trip" });
    }
    
    res.json(trip);
  } catch (error) {
    console.error("Error fetching trip:", error);
    res.status(500).json({ message: "Could not fetch trip", error: error instanceof Error ? error.message : "Unknown error" });
  }
}

export async function createTrip(req: Request, res: Response) {
  try {
    // Log the incoming data to help with debugging
    console.log("Creating trip with validated data:", req.body);
    
    // Handle demo users - return mock success response
    if (req.body.userId && typeof req.body.userId === 'string' && 
        (req.body.userId.startsWith('demo-corp-') || req.body.userId.startsWith('demo-agency-'))) {
      
      const mockTrip = {
        id: `demo-trip-${Date.now()}`,
        title: req.body.title || 'Demo Trip',
        description: req.body.description || 'Demo trip created successfully',
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        city: req.body.city,
        country: req.body.country,
        userId: req.body.userId,
        status: 'confirmed',
        created_at: new Date().toISOString(),
        hasHotelButton: !!req.body.selectedHotel // Track if hotel was selected
      };
      
      // Store the trip data in demo storage for later retrieval
      if (!(global as any).demoTrips) {
        (global as any).demoTrips = {};
      }
      (global as any).demoTrips[mockTrip.id] = {
        ...mockTrip,
        selectedHotel: req.body.selectedHotel,
        selectedFlights: req.body.selectedFlights
      };
      
      return res.status(201).json(mockTrip);
    }
    
    // Handle both camelCase and snake_case field names from frontend
    const normalizedBody = {
      ...req.body,
      start_date: req.body.start_date || req.body.startDate,
      end_date: req.body.end_date || req.body.endDate,
      user_id: req.body.user_id || req.body.userId,
      organization_id: req.body.organization_id || req.body.organizationId,
      sharing_enabled: req.body.sharing_enabled || req.body.sharingEnabled,
      share_permission: req.body.share_permission || req.body.sharePermission,
      city_latitude: req.body.city_latitude || req.body.cityLatitude,
      city_longitude: req.body.city_longitude || req.body.cityLongitude,
      hotel_latitude: req.body.hotel_latitude || req.body.hotelLatitude,
      hotel_longitude: req.body.hotel_longitude || req.body.hotelLongitude,
      trip_type: req.body.trip_type || req.body.tripType,
      client_name: req.body.client_name || req.body.clientName,
      project_type: req.body.project_type || req.body.projectType,
      completed_at: req.body.completed_at || req.body.completedAt,
    };

    const tripData = insertTripSchema.parse(normalizedBody);
    
    // Ensure the location fields are properly included
    if (req.body.city) tripData.city = req.body.city;
    if (req.body.country) tripData.country = req.body.country;
    if (req.body.location) tripData.location = req.body.location;
    
    // Enforce organization context for multi-tenant security
    const tripDataWithOrg = setOrganizationId(req, tripData);
    
    console.log("Processed trip data:", tripDataWithOrg);
    
    // Log organization access for audit
    logOrganizationAccess(req, 'create', 'trip');
    
    const trip = await storage.createTrip(tripDataWithOrg);
    
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
        console.error("Error creating hotel activities:", activityError);
        // Don't fail the trip creation if activity creation fails
      }
    }
    
    res.status(201).json(trip);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid trip data", errors: error.errors });
    }
    console.error("Error creating trip:", error);
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
    
    // CRITICAL: Get existing trip to verify organization access
    const existingTrip = await storage.getTrip(tripId);
    if (!existingTrip) {
      return res.status(404).json({ message: "Trip not found" });
    }
    
    // CRITICAL: Verify user can access this trip's organization
    const userOrgId = req.user.organizationId || null;
    if (req.user.role !== 'super_admin' && existingTrip.organization_id !== userOrgId) {
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
      shareCode: z.string().nullable().optional(),
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
    
    // Log organization access for audit
    logOrganizationAccess(req, 'update', 'trip');
    
    const trip = await storage.updateTrip(tripId, updateData);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }
    
    res.json(trip);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid trip data", errors: error.errors });
    }
    console.error("Error updating trip:", error);
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
    
    // CRITICAL: Get existing trip to verify organization access
    const existingTrip = await storage.getTrip(tripId);
    if (!existingTrip) {
      return res.status(404).json({ message: "Trip not found" });
    }
    
    // CRITICAL: Verify user can access this trip's organization
    const userOrgId = req.user.organizationId || null;
    if (req.user.role !== 'super_admin' && existingTrip.organization_id !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot delete this trip" });
    }
    
    // Log organization access for audit
    logOrganizationAccess(req, 'delete', 'trip');
    
    const success = await storage.deleteTrip(tripId);
    if (!success) {
      return res.status(404).json({ message: "Trip not found" });
    }
    
    res.json({ message: "Trip deleted successfully" });
  } catch (error) {
    console.error("Error deleting trip:", error);
    res.status(500).json({ message: "Could not delete trip", error: error instanceof Error ? error.message : "Unknown error" });
  }
}