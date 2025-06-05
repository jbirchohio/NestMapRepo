import { Router } from "express";
import { unifiedAuthMiddleware } from "../middleware/unifiedAuth";
import { z } from "zod";
import { db } from "../db";
import { notes } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();
router.use(unifiedAuthMiddleware);

// Validation schemas
const createNoteSchema = z.object({
  trip_id: z.number(),
  content: z.string().min(1),
  note_type: z.enum(['general', 'planning', 'reminder', 'important']).optional().default('general')
});

const updateNoteSchema = z.object({
  content: z.string().min(1).optional(),
  note_type: z.enum(['general', 'planning', 'reminder', 'important']).optional()
});

// POST /api/notes - Create a new note
router.post("/", async (req, res) => {
  try {
    const validatedData = createNoteSchema.parse(req.body);
    
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const newNote = await db
      .insert(notes)
      .values({
        ...validatedData,
        organization_id: req.user.organization_id
      })
      .returning();

    res.status(201).json(newNote[0]);
  } catch (error) {
    console.error("Error creating note:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create note" });
  }
});

// PUT /api/notes/:id - Update a note
router.put("/:id", async (req, res) => {
  try {
    const noteId = parseInt(req.params.id);
    const validatedData = updateNoteSchema.parse(req.body);
    
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const updatedNote = await db
      .update(notes)
      .set(validatedData)
      .where(and(
        eq(notes.id, noteId),
        eq(notes.organization_id, req.user.organization_id)
      ))
      .returning();

    if (updatedNote.length === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json(updatedNote[0]);
  } catch (error) {
    console.error("Error updating note:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update note" });
  }
});

// DELETE /api/notes/:id - Delete a note
router.delete("/:id", async (req, res) => {
  try {
    const noteId = parseInt(req.params.id);
    
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const deletedNote = await db
      .delete(tripNotes)
      .where(and(
        eq(tripNotes.id, noteId),
        eq(tripNotes.organization_id, req.user.organization_id)
      ))
      .returning();

    if (deletedNote.length === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

export default router;