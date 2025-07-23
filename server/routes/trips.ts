import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db-connection';
import { trips, insertTripSchema } from '../db/schema';
import { authenticate } from '../middleware/secureAuth';
import { injectOrganizationContext } from '../middleware/organizationScoping';
import { eq, and, desc } from 'drizzle-orm';
import { logUserActivity } from '../utils/activityLogger';
import tripController from '../src/trips/controllers/trip.controller';

// Zod schema for validating numeric ID parameters
const idParamSchema = z.object({
  id: z.string().uuid({ message: "Trip ID must be a valid UUID" }),
});

const tripIdParamSchema = z.object({
  tripId: z.string().uuid({ message: "Trip ID must be a valid UUID" }),
});

const proposalBodySchema = z.object({
  clientName: z.string().min(1, { message: "Client name is required" }),
  contactEmail: z.string().email({ message: "Invalid contact email format" }),
  contactPhone: z.string().optional(),
  contactWebsite: z.string().url().optional(),
  message: z.string().optional(),
});

const tripIdSnakeParamSchema = z.object({
  trip_id: z.string().uuid({ message: "Trip ID must be a valid UUID" }),
});

const shareBodySchema = z.object({
  sharing_enabled: z.boolean(),
  share_permission: z.enum(['view', 'edit']),
});

const travelerBodySchema = z.object({
  userId: z.string().uuid({ message: "User ID must be a valid UUID" }),
  role: z.string().min(1, { message: "Traveler role is required" }), // e.g., 'organizer', 'participant'
});

const tripAndTravelerIdParamsSchema = z.object({
  id: z.string().uuid({ message: "Trip ID must be a valid UUID" }),
  travelerId: z.string().uuid({ message: "Traveler ID must be a valid UUID" }),
});

const router = Router();

// Apply authentication and organization context to all trip routes
router.use(validateJWT);
router.use(injectOrganizationContext);

// Get all trips for authenticated user with organization filtering
router.get('/', (req: Request, res: Response) => tripController.getTrips(req, res));

// Add organization-scoped trips endpoint for corporate features
router.get('/corporate', (req: Request, res: Response) => tripController.getCorporateTrips(req, res));

// Get todos for a specific trip
router.get("/:id/todos", validateAndSanitizeRequest({ params: idParamSchema }), async (req: Request, res: Response) => {
  try {
    const tripId = (req as any).params.id;
    const userId = (req as any).user?.id;
    const orgId = (req as any).user?.organizationId;
    
    if (!userId) {
      return res.status(401).json({ message: "User ID required" });
    }

    // Verify trip exists and user has access
    const trip = await storage.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Verify organization access
    if (req.user.role !== 'super_admin' && trip.organizationId !== orgId) {
      return res.status(403).json({ message: "Access denied: Cannot access this trip" });
    }

    const todos = await storage.getTodosByTripId(tripId);
    return res.json(todos);
  } catch (error) {
    console.error("Error fetching todos for trip", req.params.id, ":", error);
    return res.status(500).json({ message: "Could not fetch todos", error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get notes for a specific trip
router.get("/:id/notes", validateAndSanitizeRequest({ params: idParamSchema }), async (req: Request, res: Response) => {
  try {
    const tripId = req.params.id;
    const userId = req.user.userId;
    const orgId = req.user.organizationId;
    
    if (!userId) {
      return res.status(401).json({ message: "User ID required" });
    }

    // Verify trip exists and user has access
    const trip = await storage.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Verify organization access
    if (req.user.role !== 'super_admin' && trip.organization_id !== orgId) {
      return res.status(403).json({ message: "Access denied: Cannot access this trip" });
    }

    const notes = await storage.getNotesByTripId(tripId);
    return res.json(notes);
  } catch (error) {
    console.error("Error fetching notes for trip", req.params.id, ":", error);
    return res.status(500).json({ message: "Could not fetch notes", error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get activities for a specific trip
router.get("/:id/activities", validateAndSanitizeRequest({ params: idParamSchema }), async (req: Request, res: Response) => {
  try {
    const tripId = req.params.id;
    const userId = req.user.userId;
    const orgId = req.user.organizationId;
    
    if (!userId) {
      return res.status(401).json({ message: "User ID required" });
    }

    // Verify trip exists and user has access
    const trip = await storage.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Verify organization access
    if (req.user.role !== 'super_admin' && trip.organization_id !== orgId) {
      return res.status(403).json({ message: "Access denied: Cannot access this trip" });
    }

    const activities = await storage.getActivitiesByTripId(tripId);
    return res.json(activities);
  } catch (error) {
    console.error("Error fetching activities for trip", req.params.id, ":", error);
    return res.status(500).json({ message: "Could not fetch activities", error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get specific trip by ID with organization access control
router.get('/:id', (req: Request, res: Response) => tripController.getTripById(req, res));

// Create new trip with organization context and subscription limits
router.post("/", enforceTripLimit(), validateAndSanitizeRequest({ body: insertTripSchema }), async (req: Request, res: Response) => {
  try {
    const tripData = {
      ...req.body,
      user_id: req.user.userId,
      organization_id: req.user.organizationId
    };

    const newTrip = await storage.createTrip(tripData);

    // Log this activity
    await logUserActivity(
      req.user.userId,
      'create_trip',
      req.user.organizationId,
      { tripId: newTrip.id, tripTitle: newTrip.title },
      req.ip,
      req.headers['user-agent']
    );

    return res.status(201).json(newTrip);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid trip data", errors: error.errors });
    }
    console.error("Error creating trip:", error);
    return res.status(500).json({ message: "Could not create trip" });
  }
});

// Update trip with organization access control
router.put("/:id", validateAndSanitizeRequest({ params: idParamSchema, body: insertTripSchema.partial() }), async (req: Request, res: Response) => {
  try {
    const tripId = req.params.id;

    // Verify trip exists and user has access
    const existingTrip = await storage.getTrip(tripId);
    if (!existingTrip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const userOrgId = req.user.organizationId;
    if (req.user.role !== 'super_admin' && existingTrip.organization_id !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot modify this trip" });
    }

    const updateData = req.body;
    const updatedTrip = await storage.updateTrip(tripId, updateData);

    if (!updatedTrip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Log this activity
    await logUserActivity(
      req.user.userId,
      'update_trip',
      req.user.organizationId,
      { tripId: updatedTrip.id, tripTitle: updatedTrip.title, changes: updateData },
      req.ip,
      req.headers['user-agent']
    );

    return res.json(updatedTrip);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid trip data", errors: error.errors });
    }
    console.error("Error updating trip:", error);
    return res.status(500).json({ message: "Could not update trip" });
  }
});

// Delete trip with organization access control
router.delete("/:id", validateAndSanitizeRequest({ params: idParamSchema }), async (req: Request, res: Response) => {
  try {
    const tripId = req.params.id;

    // Verify trip exists and user has access
    const existingTrip = await storage.getTrip(tripId);
    if (!existingTrip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const userOrgId = req.user.organizationId;
    if (req.user.role !== 'super_admin' && existingTrip.organization_id !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot delete this trip" });
    }

    const success = await storage.deleteTrip(tripId);
    if (!success) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Log this activity
    await logUserActivity(
      req.user.userId,
      'delete_trip',
      req.user.organizationId,
      { tripId: existingTrip.id, tripTitle: existingTrip.title },
      req.ip,
      req.headers['user-agent']
    );

    return res.json({ message: "Trip deleted successfully" });
  } catch (error) {
    console.error("Error deleting trip:", error);
    return res.status(500).json({ message: "Could not delete trip" });
  }
});

// Export trip as PDF
router.get("/:id/export/pdf", validateAndSanitizeRequest({ params: idParamSchema }), async (req: Request, res: Response) => {
  try {
    const tripId = req.params.id;

    const trip = await storage.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Verify organization access
    const userOrgId = req.user.organizationId;
    if (req.user.role !== 'super_admin' && trip.organization_id !== userOrgId) {
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
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    return res.status(500).json({ message: "Could not generate PDF export" });
  }
});

// Generate AI-powered trip proposal
router.post("/:tripId/proposal", validateAndSanitizeRequest({ params: tripIdParamSchema, body: proposalBodySchema }), async (req: Request, res: Response) => {
  try {
    const tripId = req.params.tripId; // Validated and coerced by middleware
    const { clientName, contactEmail, contactPhone, contactWebsite, message } = req.body; // Validated and sanitized by middleware

    const trip = await storage.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Verify organization access
    const userOrgId = req.user.organizationId;
    if (req.user.role !== 'super_admin' && trip.organization_id !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot generate proposal for this trip" });
    }

    const activities = await storage.getActivitiesByTripId(tripId);

    const proposalData = {
      trip,
      activities,
      clientName,
      user: { name: req.user.displayName || 'N/A', email: req.user.email || 'N/A' },
      agentName: req.user.displayName || "Travel Agent",
      companyName: "NestMap Travel Services",
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

    const pdfBuffer = await generateAIProposal(proposalData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Travel_Proposal_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${trip.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error: any) {
    console.error("Error generating proposal:", error);
    return res.status(500).json({ message: "Error generating proposal: " + error.message });
  }
});

// Trip sharing endpoints
router.get("/:tripId/share", validateAndSanitizeRequest({ params: tripIdSnakeParamSchema }), async (req: Request, res: Response) => {
  try {
    const tripId = req.params.trip_id; // Validated and coerced by middleware

    const trip = await storage.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Verify organization access
    const userOrgId = req.user.organizationId;
    if (req.user.role !== 'super_admin' && trip.organization_id !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot access this trip" });
    }

    return res.json({
      sharing_enabled: trip.sharing_enabled,
      share_permission: trip.share_permission,
      shareCode: trip.share_code
    });
  } catch (error) {
    console.error("Error fetching sharing settings:", error);
    return res.status(500).json({ message: "Could not fetch sharing settings" });
  }
});

router.put("/:tripId/share", validateAndSanitizeRequest({ params: tripIdSnakeParamSchema, body: shareBodySchema }), async (req: Request, res: Response) => {
  try {
    const tripId = req.params.trip_id; // Validated and coerced by middleware
    const trip = await storage.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Verify organization access
    const userOrgId = req.user.organizationId;
    if (req.user.role !== 'super_admin' && trip.organization_id !== userOrgId) {
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

    return res.json({
      sharing_enabled: updatedTrip.sharing_enabled,
      share_permission: updatedTrip.share_permission,
      shareCode: updatedTrip.share_code
    });
  } catch (error) {
    console.error("Error updating sharing settings:", error);
    return res.status(500).json({ message: "Could not update sharing settings" });
  }
});

// Get all travelers for a specific trip
router.get("/:id/travelers", validateAndSanitizeRequest({ params: idParamSchema }), async (req: Request, res: Response) => {
try {
const tripId = req.params.id; // Validated and coerced by middleware

const travelers = await storage.getTripTravelers(tripId);
return res.json(travelers);
} catch (error) {
console.error("Error fetching trip travelers:", error);
return res.status(500).json({ message: "Could not fetch trip travelers" });
}
});

// Add a traveler to a trip
router.post("/:id/travelers", validateAndSanitizeRequest({ params: idParamSchema, body: travelerBodySchema }), async (req: Request, res: Response) => {
try {
const tripId = req.params.id; // Validated and coerced by middleware
const travelerData = {
  trip_id: tripId,
  ...req.body // Body is validated and sanitized by middleware
};

const newTraveler = await storage.addTripTraveler(travelerData);
return res.status(201).json(newTraveler);
} catch (error) {
console.error("Error adding trip traveler:", error);
return res.status(500).json({ message: "Could not add trip traveler" });
}
});

// Update a traveler's information
router.put("/:id/travelers/:travelerId", validateAndSanitizeRequest({ params: tripAndTravelerIdParamsSchema, body: travelerBodySchema.partial() }), async (req: Request, res: Response) => {
try {
const { id: tripId, travelerId } = req.params as { id: string; travelerId: string }; // Validated and coerced by middleware

const updatedTraveler = await storage.updateTripTraveler(travelerId, req.body);
if (!updatedTraveler) {
  return res.status(404).json({ message: "Traveler not found" });
}
return res.json(updatedTraveler);
} catch (error) {
console.error("Error updating trip traveler:", error);
return res.status(500).json({ message: "Could not update trip traveler" });
}
});

// Remove a traveler from a trip
router.delete("/:id/travelers/:travelerId", validateAndSanitizeRequest({ params: tripAndTravelerIdParamsSchema }), async (req: Request, res: Response) => {
try {
const { id: tripId, travelerId } = req.params as { id: string; travelerId: string }; // Validated and coerced by middleware

await storage.removeTripTraveler(travelerId);
return res.status(204).send();
} catch (error) {
console.error("Error removing trip traveler:", error);
return res.status(500).json({ message: "Could not remove trip traveler" });
}
});

export default router;