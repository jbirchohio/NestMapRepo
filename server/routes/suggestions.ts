import { Router } from "express";
import { db } from "../db";
import { activitySuggestions, tripComments, suggestionVotes, trips, activities } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { optionalAuth } from "../middleware/jwtAuth";
import crypto from "crypto";

const router = Router();

// Get visitor identifier (for anonymous voting)
const getVisitorId = (req: any): string => {
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";
  return crypto.createHash("md5").update(`${ip}-${userAgent}`).digest("hex");
};

// Get all suggestions for a trip
router.get("/trip/:tripId", optionalAuth, async (req, res) => {
  try {
    const { tripId } = req.params;
    
    // Get trip to check if collaborative mode is enabled
    const trip = await db.select().from(trips).where(eq(trips.id, parseInt(tripId))).limit(1);
    
    if (!trip.length) {
      return res.status(404).json({ error: "Trip not found" });
    }
    
    if (!trip[0].collaborative_mode && !trip[0].is_public) {
      return res.status(403).json({ error: "This trip is not in collaborative mode" });
    }
    
    // Get all suggestions with vote counts
    const suggestions = await db
      .select()
      .from(activitySuggestions)
      .where(eq(activitySuggestions.trip_id, parseInt(tripId)))
      .orderBy(desc(activitySuggestions.votes_up));
    
    res.json(suggestions);
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    res.status(500).json({ error: "Failed to fetch suggestions" });
  }
});

// Create a new suggestion
router.post("/", optionalAuth, async (req, res) => {
  try {
    const {
      tripId,
      title,
      description,
      locationName,
      date,
      time,
      estimatedCost,
      notes,
      suggestedByName
    } = req.body;
    
    // Check if trip allows suggestions
    const trip = await db.select().from(trips).where(eq(trips.id, parseInt(tripId))).limit(1);
    
    if (!trip.length) {
      return res.status(404).json({ error: "Trip not found" });
    }
    
    if (!trip[0].collaborative_mode) {
      return res.status(403).json({ error: "This trip is not accepting suggestions" });
    }
    
    // If user is not authenticated and anonymous suggestions are not allowed
    if (!req.user && !trip[0].allow_anonymous_suggestions) {
      return res.status(401).json({ error: "Please sign in to make suggestions" });
    }
    
    const suggestionData: any = {
      trip_id: parseInt(tripId),
      title,
      description,
      location_name: locationName,
      date,
      time,
      estimated_cost: estimatedCost,
      notes,
      status: "pending",
      votes_up: 0,
      votes_down: 0
    };
    
    if (req.user) {
      suggestionData.suggested_by_user_id = req.user.id;
    } else {
      suggestionData.suggested_by_name = suggestedByName || "Anonymous";
    }
    
    const [suggestion] = await db.insert(activitySuggestions).values(suggestionData).returning();
    
    res.json(suggestion);
  } catch (error) {
    console.error("Error creating suggestion:", error);
    res.status(500).json({ error: "Failed to create suggestion" });
  }
});

// Vote on a suggestion
router.post("/:suggestionId/vote", optionalAuth, async (req, res) => {
  try {
    const { suggestionId } = req.params;
    const { vote } = req.body; // "up" or "down"
    
    if (!["up", "down"].includes(vote)) {
      return res.status(400).json({ error: "Invalid vote type" });
    }
    
    const visitorId = req.user ? `user-${req.user.id}` : getVisitorId(req);
    
    // Check if already voted
    const existingVote = await db
      .select()
      .from(suggestionVotes)
      .where(
        and(
          eq(suggestionVotes.suggestion_id, parseInt(suggestionId)),
          eq(suggestionVotes.voter_identifier, visitorId)
        )
      )
      .limit(1);
    
    if (existingVote.length > 0) {
      // Update existing vote
      await db
        .update(suggestionVotes)
        .set({ vote })
        .where(eq(suggestionVotes.id, existingVote[0].id));
    } else {
      // Create new vote
      await db.insert(suggestionVotes).values({
        suggestion_id: parseInt(suggestionId),
        user_id: req.user?.id || null,
        voter_identifier: visitorId,
        vote
      });
    }
    
    // Update vote counts on suggestion
    const allVotes = await db
      .select()
      .from(suggestionVotes)
      .where(eq(suggestionVotes.suggestion_id, parseInt(suggestionId)));
    
    const votesUp = allVotes.filter(v => v.vote === "up").length;
    const votesDown = allVotes.filter(v => v.vote === "down").length;
    
    await db
      .update(activitySuggestions)
      .set({ votes_up: votesUp, votes_down: votesDown })
      .where(eq(activitySuggestions.id, parseInt(suggestionId)));
    
    res.json({ votesUp, votesDown });
  } catch (error) {
    console.error("Error voting on suggestion:", error);
    res.status(500).json({ error: "Failed to vote" });
  }
});

// Accept a suggestion and convert to activity
router.post("/:suggestionId/accept", optionalAuth, async (req, res) => {
  try {
    const { suggestionId } = req.params;
    
    // Get the suggestion
    const [suggestion] = await db
      .select()
      .from(activitySuggestions)
      .where(eq(activitySuggestions.id, parseInt(suggestionId)))
      .limit(1);
    
    if (!suggestion) {
      return res.status(404).json({ error: "Suggestion not found" });
    }
    
    // Check if user owns the trip
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, suggestion.trip_id))
      .limit(1);
    
    if (!trip || trip.user_id !== req.user?.id) {
      return res.status(403).json({ error: "Only trip owner can accept suggestions" });
    }
    
    // Create activity from suggestion
    const [activity] = await db.insert(activities).values({
      trip_id: suggestion.trip_id,
      title: suggestion.title,
      date: suggestion.date,
      time: suggestion.time || "09:00",
      location_name: suggestion.location_name || "",
      notes: suggestion.notes || "",
      order: 0,
      price: suggestion.estimated_cost ? parseFloat(suggestion.estimated_cost) : null
    }).returning();
    
    // Update suggestion status
    await db
      .update(activitySuggestions)
      .set({
        status: "accepted",
        accepted_at: new Date(),
        accepted_as_activity_id: activity.id
      })
      .where(eq(activitySuggestions.id, parseInt(suggestionId)));
    
    res.json({ suggestion, activity });
  } catch (error) {
    console.error("Error accepting suggestion:", error);
    res.status(500).json({ error: "Failed to accept suggestion" });
  }
});

// Reject a suggestion
router.post("/:suggestionId/reject", optionalAuth, async (req, res) => {
  try {
    const { suggestionId } = req.params;
    
    // Get the suggestion
    const [suggestion] = await db
      .select()
      .from(activitySuggestions)
      .where(eq(activitySuggestions.id, parseInt(suggestionId)))
      .limit(1);
    
    if (!suggestion) {
      return res.status(404).json({ error: "Suggestion not found" });
    }
    
    // Check if user owns the trip
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, suggestion.trip_id))
      .limit(1);
    
    if (!trip || trip.user_id !== req.user?.id) {
      return res.status(403).json({ error: "Only trip owner can reject suggestions" });
    }
    
    // Update suggestion status
    await db
      .update(activitySuggestions)
      .set({ status: "rejected" })
      .where(eq(activitySuggestions.id, parseInt(suggestionId)));
    
    res.json({ message: "Suggestion rejected" });
  } catch (error) {
    console.error("Error rejecting suggestion:", error);
    res.status(500).json({ error: "Failed to reject suggestion" });
  }
});

export default router;