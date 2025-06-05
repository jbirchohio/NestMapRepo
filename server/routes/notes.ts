import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { notes, trips } from "@shared/schema";
import { unifiedAuthMiddleware } from "../middleware/unifiedAuth";
import { z } from "zod";

const router = Router();
router.use(unifiedAuthMiddleware);

// Validation schemas
const createNoteSchema = z.object({
  trip_id: z.number(),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  category: z.enum(['general', 'important', 'reminder', 'idea']).default('general'),
  is_private: z.boolean().default(false)
});

const updateNoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  category: z.enum(['general', 'important', 'reminder', 'idea']).optional(),
  is_private: z.boolean().optional()
});

// POST /api/notes - Create new note
router.post("/", async (req, res) => {
  try {
    const validatedData = createNoteSchema.parse(req.body);
    
    // Verify trip belongs to user's organization
    const trip = await db.query.trips.findFirst({
      where: and(
        eq(trips.id, validatedData.trip_id),
        eq(trips.organizationId, req.user.organization_id)
      )
    });

    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        error: "Trip not found or access denied" 
      });
    }

    const [newNote] = await db.insert(notes).values({
      tripId: validatedData.trip_id,
      title: validatedData.title,
      content: validatedData.content,
      category: validatedData.category,
      isPrivate: validatedData.is_private,
      organizationId: req.user.organization_id,
      createdBy: req.user.id
    }).returning();

    res.status(201).json({
      success: true,
      data: newNote
    });
  } catch (error) {
    console.error("Error creating note:", error);
    res.status(400).json({ 
      success: false, 
      error: "Failed to create note" 
    });
  }
});

// PUT /api/notes/:id - Update note
router.put("/:id", async (req, res) => {
  try {
    const noteId = parseInt(req.params.id);
    const validatedData = updateNoteSchema.parse(req.body);

    // Verify note exists and belongs to user's organization
    const existingNote = await db.query.notes.findFirst({
      where: and(
        eq(notes.id, noteId),
        eq(notes.organizationId, req.user.organization_id)
      )
    });

    if (!existingNote) {
      return res.status(404).json({ 
        success: false, 
        error: "Note not found" 
      });
    }

    // Check if user can edit this note (creator or admin)
    if (existingNote.createdBy !== req.user.id && !req.user.permissions?.includes('MANAGE_ALL_TRIPS')) {
      return res.status(403).json({ 
        success: false, 
        error: "Permission denied" 
      });
    }

    const [updatedNote] = await db.update(notes)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(notes.id, noteId))
      .returning();

    res.json({
      success: true,
      data: updatedNote
    });
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(400).json({ 
      success: false, 
      error: "Failed to update note" 
    });
  }
});

// DELETE /api/notes/:id - Delete note
router.delete("/:id", async (req, res) => {
  try {
    const noteId = parseInt(req.params.id);

    // Verify note exists and belongs to user's organization
    const existingNote = await db.query.notes.findFirst({
      where: and(
        eq(notes.id, noteId),
        eq(notes.organizationId, req.user.organization_id)
      )
    });

    if (!existingNote) {
      return res.status(404).json({ 
        success: false, 
        error: "Note not found" 
      });
    }

    // Check if user can delete this note (creator or admin)
    if (existingNote.createdBy !== req.user.id && !req.user.permissions?.includes('MANAGE_ALL_TRIPS')) {
      return res.status(403).json({ 
        success: false, 
        error: "Permission denied" 
      });
    }

    await db.delete(notes).where(eq(notes.id, noteId));

    res.json({
      success: true,
      message: "Note deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to delete note" 
    });
  }
});

// GET /api/notes/:id - Get specific note
router.get("/:id", async (req, res) => {
  try {
    const noteId = parseInt(req.params.id);

    const note = await db.query.notes.findFirst({
      where: and(
        eq(notes.id, noteId),
        eq(notes.organizationId, req.user.organization_id)
      ),
      with: {
        creator: {
          columns: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    if (!note) {
      return res.status(404).json({ 
        success: false, 
        error: "Note not found" 
      });
    }

    // Check privacy settings
    if (note.isPrivate && note.createdBy !== req.user.id && !req.user.permissions?.includes('MANAGE_ALL_TRIPS')) {
      return res.status(403).json({ 
        success: false, 
        error: "Access denied to private note" 
      });
    }

    res.json({
      success: true,
      data: note
    });
  } catch (error) {
    console.error("Error fetching note:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch note" 
    });
  }
});

export default router;