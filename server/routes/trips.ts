import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { insertTripSchema } from '@shared/schema';
import { unifiedAuthMiddleware } from '../middleware/unifiedAuth';
import { injectOrganizationContext } from '../middleware/organizationScoping';
import { storage } from '../storage';
import { generatePdfBuffer } from '../utils/pdfHelper';
import { generateAIProposal } from '../proposalGenerator';
import { db } from '../db';
import { trips as tripsTable } from '../db/schema';
import { users } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// Apply authentication and organization context to all trip routes
router.use(unifiedAuthMiddleware);
router.use(injectOrganizationContext);

// Get all trips for authenticated user with organization filtering
router.get("/", async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.organization_id;
    const trips = await storage.getAllTrips();

    // Filter trips by organization for multi-tenant isolation
    const filteredTrips = trips.filter(trip => {
      if (req.user?.role === 'super_admin') return true;
      return trip.organization_id === orgId;
    });

    res.json(filteredTrips);
  } catch (error) {
    console.error("Error fetching trips:", error);
    res.status(500).json({ message: "Could not fetch trips" });
  }
});

// Get specific trip by ID with organization access control
router.get("/:id", async (req: Request, res: Response) => {
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
      return res.status(403).json({ message: "Access denied: Cannot access this trip" });
    }

    res.json(trip);
  } catch (error) {
    console.error("Error fetching trip:", error);
    res.status(500).json({ message: "Could not fetch trip" });
  }
});

// Create new trip with organization context
router.post("/", async (req: Request, res: Response) => {
  try {
    const tripData = insertTripSchema.parse({
      ...req.body,
      user_id: req.user?.id,
      organization_id: req.user?.organization_id
    });

    const trip = await storage.createTrip(tripData);
    res.status(201).json(trip);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid trip data", errors: error.errors });
    }
    console.error("Error creating trip:", error);
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
    console.error("Error updating trip:", error);
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
    console.error("Error deleting trip:", error);
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
    console.error("Error generating PDF:", error);
    res.status(500).json({ message: "Could not generate PDF export" });
  }
});

// Generate AI-powered trip proposal
router.post("/:tripId/proposal", async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.tripId);
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
      agentName: req.user?.displayName || "Travel Agent",
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
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error("Error generating proposal:", error);
    res.status(500).json({ message: "Error generating proposal: " + error.message });
  }
});

// Trip sharing endpoints
router.get("/:tripId/share", async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.tripId);
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
      shareCode: trip.shareCode
    });
  } catch (error) {
    console.error("Error fetching sharing settings:", error);
    res.status(500).json({ message: "Could not fetch sharing settings" });
  }
});

router.put("/:tripId/share", async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.tripId);
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

    let shareCode = trip.shareCode;
    if (sharing_enabled && !shareCode) {
      shareCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    const updatedTrip = await storage.updateTrip(tripId, {
      sharing_enabled: sharing_enabled ?? trip.sharing_enabled,
      share_permission: share_permission ?? trip.share_permission,
      shareCode
    });

    if (!updatedTrip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.json({
      sharing_enabled: updatedTrip.sharing_enabled,
      share_permission: updatedTrip.share_permission,
      shareCode: updatedTrip.shareCode
    });
  } catch (error) {
    console.error("Error updating sharing settings:", error);
    res.status(500).json({ message: "Could not update sharing settings" });
  }
});

// Add organization-scoped trips endpoint for corporate features
router.get('/corporate', async (req: Request, res: Response) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(400).json({ message: "Organization context required" });
    }

    const trips = await db
      .select({
        id: tripsTable.id,
        title: tripsTable.title,
        destination: tripsTable.destination,
        startDate: tripsTable.startDate,
        endDate: tripsTable.endDate,
        status: tripsTable.status,
        budget: tripsTable.budget,
        userId: tripsTable.userId,
        organizationId: tripsTable.organizationId,
        createdAt: tripsTable.createdAt,
        // Add user details
        userName: users.display_name,
        userEmail: users.email
      })
      .from(tripsTable)
      .leftJoin(users, eq(tripsTable.userId, users.id))
      .where(eq(tripsTable.organizationId, req.user.organization_id))
      .orderBy(desc(tripsTable.createdAt));

    res.json(trips);
  } catch (error) {
    console.error('Error fetching corporate trips:', error);
    res.status(500).json({ message: "Failed to fetch corporate trips" });
  }
});

// Export the router
export default router;