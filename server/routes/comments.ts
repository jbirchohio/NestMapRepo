import { Router } from "express";
import { db } from "../db";
import { tripComments, trips } from "@shared/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { optionalAuth } from "../middleware/jwtAuth";

const router = Router();

// Get comments for a trip or activity
router.get("/trip/:tripId", optionalAuth, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { activityId, suggestionId } = req.query;
    
    // Check if trip is public or collaborative
    const [trip] = await db.select().from(trips).where(eq(trips.id, parseInt(tripId))).limit(1);
    
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    
    if (!trip.is_public && !trip.collaborative_mode && trip.user_id !== req.user?.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    // Build query conditions
    const conditions = [eq(tripComments.trip_id, parseInt(tripId))];
    
    if (activityId) {
      conditions.push(eq(tripComments.activity_id, parseInt(activityId as string)));
    } else if (suggestionId) {
      conditions.push(eq(tripComments.suggestion_id, parseInt(suggestionId as string)));
    } else {
      // Get general trip comments (not on specific activities)
      conditions.push(isNull(tripComments.activity_id));
      conditions.push(isNull(tripComments.suggestion_id));
    }
    
    const comments = await db
      .select()
      .from(tripComments)
      .where(and(...conditions))
      .orderBy(desc(tripComments.created_at));
    
    // Organize comments into threads
    const threadedComments = organizeIntoThreads(comments);
    
    res.json(threadedComments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// Post a new comment
router.post("/", optionalAuth, async (req, res) => {
  try {
    const {
      tripId,
      activityId,
      suggestionId,
      comment,
      commenterName,
      parentCommentId
    } = req.body;
    
    // Check if trip allows comments
    const [trip] = await db.select().from(trips).where(eq(trips.id, parseInt(tripId))).limit(1);
    
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    
    if (!trip.collaborative_mode && !trip.is_public) {
      return res.status(403).json({ error: "Comments are not enabled for this trip" });
    }
    
    // If user is not authenticated and anonymous comments are not allowed
    if (!req.user && !trip.allow_anonymous_suggestions) {
      return res.status(401).json({ error: "Please sign in to comment" });
    }
    
    const commentData: any = {
      trip_id: parseInt(tripId),
      comment,
      activity_id: activityId ? parseInt(activityId) : null,
      suggestion_id: suggestionId ? parseInt(suggestionId) : null,
      parent_comment_id: parentCommentId ? parseInt(parentCommentId) : null
    };
    
    if (req.user) {
      commentData.user_id = req.user.id;
    } else {
      commentData.commenter_name = commenterName || "Anonymous";
    }
    
    const [newComment] = await db.insert(tripComments).values(commentData).returning();
    
    res.json(newComment);
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

// Helper function to organize comments into threads
function organizeIntoThreads(comments: any[]) {
  const commentMap = new Map();
  const rootComments: any[] = [];
  
  // First pass: create map of all comments
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });
  
  // Second pass: organize into hierarchy
  comments.forEach(comment => {
    if (comment.parent_comment_id) {
      const parent = commentMap.get(comment.parent_comment_id);
      if (parent) {
        parent.replies.push(commentMap.get(comment.id));
      }
    } else {
      rootComments.push(commentMap.get(comment.id));
    }
  });
  
  return rootComments;
}

export default router;