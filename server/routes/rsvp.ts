import { Router } from "express";
import { db } from "../db";
import { tripRsvps, trips } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { optionalAuth } from "../middleware/jwtAuth";
import crypto from "crypto";

const router = Router();

// Get all RSVPs for a trip
router.get("/trip/:tripId", optionalAuth, async (req, res) => {
  try {
    const { tripId } = req.params;
    
    // Get trip to check if it's a group trip
    const [trip] = await db.select().from(trips).where(eq(trips.id, parseInt(tripId))).limit(1);
    
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    
    // Get all RSVPs
    const rsvps = await db
      .select()
      .from(tripRsvps)
      .where(eq(tripRsvps.trip_id, parseInt(tripId)))
      .orderBy(desc(tripRsvps.created_at));
    
    // Calculate summary stats
    const stats = {
      total: rsvps.length,
      attending: rsvps.filter(r => r.status === 'yes').reduce((sum, r) => sum + (r.attending_count || 1), 0),
      declined: rsvps.filter(r => r.status === 'no').length,
      maybe: rsvps.filter(r => r.status === 'maybe').length,
      pending: rsvps.filter(r => r.status === 'pending').length,
      maxAttendees: trip.max_attendees || null,
      deadline: trip.rsvp_deadline || null
    };
    
    res.json({ rsvps, stats });
  } catch (error) {
    console.error("Error fetching RSVPs:", error);
    res.status(500).json({ error: "Failed to fetch RSVPs" });
  }
});

// Submit RSVP (works for both authenticated and anonymous users)
router.post("/", optionalAuth, async (req, res) => {
  try {
    const {
      tripId,
      email,
      name,
      status,
      attendingCount,
      dietaryRestrictions,
      notes
    } = req.body;
    
    // Validate required fields
    if (!tripId || !email || !name || !status) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    // Check if trip exists and is a group trip
    const [trip] = await db.select().from(trips).where(eq(trips.id, parseInt(tripId))).limit(1);
    
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    
    if (!trip.is_group_trip) {
      return res.status(403).json({ error: "This trip is not accepting RSVPs" });
    }
    
    // Check if deadline has passed
    if (trip.rsvp_deadline && new Date(trip.rsvp_deadline) < new Date()) {
      return res.status(400).json({ error: "RSVP deadline has passed" });
    }
    
    // Check if max attendees reached (only for "yes" responses)
    if (status === 'yes' && trip.max_attendees) {
      const existingRsvps = await db
        .select()
        .from(tripRsvps)
        .where(and(
          eq(tripRsvps.trip_id, parseInt(tripId)),
          eq(tripRsvps.status, 'yes')
        ));
      
      const currentAttendees = existingRsvps.reduce((sum, r) => sum + (r.attending_count || 1), 0);
      const newTotal = currentAttendees + (attendingCount || 1);
      
      if (newTotal > trip.max_attendees) {
        return res.status(400).json({ 
          error: "Maximum attendees reached",
          available: trip.max_attendees - currentAttendees
        });
      }
    }
    
    // Check if this email already has an RSVP
    const [existingRsvp] = await db
      .select()
      .from(tripRsvps)
      .where(and(
        eq(tripRsvps.trip_id, parseInt(tripId)),
        eq(tripRsvps.email, email)
      ))
      .limit(1);
    
    if (existingRsvp) {
      // Update existing RSVP
      const [updated] = await db
        .update(tripRsvps)
        .set({
          name,
          status,
          attending_count: attendingCount || 1,
          dietary_restrictions: dietaryRestrictions,
          notes,
          responded_at: new Date(),
        })
        .where(eq(tripRsvps.id, existingRsvp.id))
        .returning();
      
      res.json({ rsvp: updated, message: "RSVP updated successfully" });
    } else {
      // Create new RSVP
      const [newRsvp] = await db.insert(tripRsvps).values({
        trip_id: parseInt(tripId),
        user_id: req.user?.id || null,
        email,
        name,
        status,
        attending_count: attendingCount || 1,
        dietary_restrictions: dietaryRestrictions,
        notes,
        responded_at: status !== 'pending' ? new Date() : null,
      }).returning();
      
      res.json({ rsvp: newRsvp, message: "RSVP submitted successfully" });
    }
  } catch (error) {
    console.error("Error submitting RSVP:", error);
    res.status(500).json({ error: "Failed to submit RSVP" });
  }
});

// Get RSVP by email (for checking existing RSVP)
router.get("/trip/:tripId/email/:email", optionalAuth, async (req, res) => {
  try {
    const { tripId, email } = req.params;
    
    const [rsvp] = await db
      .select()
      .from(tripRsvps)
      .where(and(
        eq(tripRsvps.trip_id, parseInt(tripId)),
        eq(tripRsvps.email, email)
      ))
      .limit(1);
    
    if (!rsvp) {
      return res.status(404).json({ error: "No RSVP found" });
    }
    
    res.json(rsvp);
  } catch (error) {
    console.error("Error fetching RSVP:", error);
    res.status(500).json({ error: "Failed to fetch RSVP" });
  }
});

// Delete RSVP (only for trip owner)
router.delete("/:rsvpId", optionalAuth, async (req, res) => {
  try {
    const { rsvpId } = req.params;
    
    // Get the RSVP
    const [rsvp] = await db
      .select()
      .from(tripRsvps)
      .where(eq(tripRsvps.id, parseInt(rsvpId)))
      .limit(1);
    
    if (!rsvp) {
      return res.status(404).json({ error: "RSVP not found" });
    }
    
    // Check if user owns the trip
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, rsvp.trip_id))
      .limit(1);
    
    if (!trip || trip.user_id !== req.user?.id) {
      return res.status(403).json({ error: "Only trip owner can delete RSVPs" });
    }
    
    await db.delete(tripRsvps).where(eq(tripRsvps.id, parseInt(rsvpId)));
    
    res.json({ message: "RSVP deleted successfully" });
  } catch (error) {
    console.error("Error deleting RSVP:", error);
    res.status(500).json({ error: "Failed to delete RSVP" });
  }
});

export default router;