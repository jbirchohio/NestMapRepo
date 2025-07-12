import { Router } from 'express';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { db } from '../db.js';
import { tripComments, activityLog, trips, users, insertTripCommentSchema } from '@@shared/schema';
import { z } from 'zod';
import { authenticate as validateJWT } from '../middleware/secureAuth.js';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext.js';

const router = Router();

// Get comments for a trip (organization-scoped)
router.get('/trips/:tripId/comments', validateJWT, injectOrganizationContext, validateOrganizationAccess, async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const tripId = parseInt(req.params.tripId);
    const organizationId = req.user.organization_id;
    
    // Verify trip belongs to user's organization
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(
        eq(trips.id, tripId),
        eq(trips.organization_id, organizationId)
      ));
    
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    
    // Get comments with user information
    const comments = await db
      .select({
        id: tripComments.id,
        tripId: tripComments.trip_id,
        activityId: tripComments.activity_id,
        content: tripComments.content,
        parentId: tripComments.parent_id,
        resolved: tripComments.resolved,
        createdAt: tripComments.created_at,
        updatedAt: tripComments.updated_at,
        user: {
          id: users.id,
          displayName: users.display_name,
          email: users.email
        }
      })
      .from(tripComments)
      .leftJoin(users, eq(tripComments.user_id, users.id))
      .where(and(
        eq(tripComments.trip_id, tripId),
        eq(tripComments.organization_id, organizationId)
      ))
      .orderBy(desc(tripComments.created_at));
    
    res.json(comments);
  } catch (error) {
    console.error('Error fetching trip comments:', error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// Add comment to trip (organization-scoped)
router.post('/trips/:tripId/comments', async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const tripId = parseInt(req.params.tripId);
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    
    // Verify trip belongs to user's organization
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(
        eq(trips.id, tripId),
        eq(trips.organization_id, organizationId)
      ));
    
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    
    // Validate comment data
    const validatedData = insertTripCommentSchema.parse(req.body);
    
    // Create comment
    const [newComment] = await db
      .insert(tripComments)
      .values({
        user_id: userId,
        trip_id: tripId,
        organization_id: organizationId,
        content: validatedData.content,
        activity_id: validatedData.activity_id || null,
        parent_id: validatedData.parent_id || null,
        resolved: validatedData.resolved || false
      })
      .returning();
    
    // Log the comment activity  
    await logTripActivity(tripId, userId, organizationId, {
      action: 'commented',
      entityType: 'comment',
      entityId: newComment.id,
      metadata: {
        content: validatedData.content.substring(0, 100) + (validatedData.content.length > 100 ? '...' : ''),
        activity_id: validatedData.activity_id
      }
    });
    
    // Get comment with user info for response
    const [commentWithUser] = await db
      .select({
        id: tripComments.id,
        tripId: tripComments.trip_id,
        activityId: tripComments.activity_id,
        content: tripComments.content,
        parentId: tripComments.parent_id,
        resolved: tripComments.resolved,
        createdAt: tripComments.created_at,
        updatedAt: tripComments.updated_at,
        user: {
          id: users.id,
          displayName: users.display_name,
          email: users.email
        }
      })
      .from(tripComments)
      .leftJoin(users, eq(tripComments.user_id, users.id))
      .where(eq(tripComments.id, newComment.id));
    
    res.status(201).json(commentWithUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: error.errors 
      });
    }
    
    console.error('Error creating comment:', error);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

// Resolve/unresolve comment thread
router.patch('/comments/:commentId/resolve', async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const commentId = parseInt(req.params.commentId);
    const organizationId = req.user.organization_id;
    const { resolved } = req.body;
    
    // Verify comment belongs to user's organization
    const [comment] = await db
      .select()
      .from(tripComments)
      .where(and(
        eq(tripComments.id, commentId),
        eq(tripComments.organization_id, organizationId)
      ));
    
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    
    // Update comment resolution status
    const [updatedComment] = await db
      .update(tripComments)
      .set({
        resolved: resolved,
        updated_at: new Date()
      })
      .where(eq(tripComments.id, commentId))
      .returning();
    
    res.json(updatedComment);
  } catch (error) {
    console.error('Error updating comment resolution:', error);
    res.status(500).json({ error: "Failed to update comment" });
  }
});

// Get activity log for a trip (organization-scoped)
router.get('/trips/:tripId/activity', async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const tripId = parseInt(req.params.tripId);
    const organizationId = req.user.organization_id;
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Verify trip belongs to user's organization
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(
        eq(trips.id, tripId),
        eq(trips.organization_id, organizationId)
      ));
    
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    
    // Get activity log with user information
    const activities = await db
      .select({
        id: activityLog.id,
        action: activityLog.action,
        entityType: activityLog.entityType,
        entityId: activityLog.entityId,
        changes: activityLog.changes,
        metadata: activityLog.metadata,
        timestamp: activityLog.timestamp,
        user: {
          id: users.id,
          displayName: users.display_name,
          email: users.email
        }
      })
      .from(activityLog)
      .leftJoin(users, eq(activityLog.userId, users.id))
      .where(and(
        eq(activityLog.tripId, tripId),
        eq(activityLog.organizationId, organizationId)
      ))
      .orderBy(desc(activityLog.timestamp))
      .limit(limit);
    
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({ error: "Failed to fetch activity log" });
  }
});

// Log activity for trip changes
export async function logTripActivity(
  tripId: number,
  userId: number,
  organizationId: number,
  activityData: {
    action: string;
    entityType: string;
    entityId?: number;
    changes?: Record<string, any>;
    metadata?: Record<string, any>;
  }
) {
  try {
    await db
      .insert(activityLog)
      .values({
        tripId,
        userId,
        organizationId,
        action: activityData.action,
        entityType: activityData.entityType,
        entityId: activityData.entityId || null,
        changes: activityData.changes || null,
        metadata: activityData.metadata || null
      });
  } catch (error) {
    console.error('Error logging trip activity:', error);
  }
}

export default router;