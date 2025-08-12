import { Router } from 'express';
import { storage } from '../storage';
import { jwtAuthMiddleware } from '../middleware/jwtAuth';
import { z } from 'zod';
import { logger } from '../utils/logger';

const router = Router();

// Apply JWT authentication to all note routes
router.use(jwtAuthMiddleware);

// Validation schemas
const createNoteSchema = z.object({
  tripId: z.number(),
  content: z.string().min(1)
});

const updateNoteSchema = z.object({
  content: z.string().min(1)
});

// GET /api/notes/:tripId - Get all notes for a trip
router.get('/:tripId', async (req, res) => {
  try {
    const tripId = parseInt(req.params.tripId);
    if (isNaN(tripId)) {
      return res.status(400).json({ message: 'Invalid trip ID' });
    }

    const notes = await storage.getNotesByTripId(tripId);
    res.json(notes);
  } catch (error) {
    logger.error('Error fetching notes', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ message: 'Failed to fetch notes' });
  }
});

// POST /api/notes - Create a new note
router.post('/', async (req, res) => {
  try {
    // After case conversion middleware, req.body has snake_case fields
    // Map them to camelCase for the schema
    const dataToValidate = {
      tripId: req.body.trip_id,
      content: req.body.content
    };

    const validatedData = createNoteSchema.parse(dataToValidate);


    const note = await storage.createNote(validatedData);
    res.status(201).json(note);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid note data', errors: error.errors });
    }
    logger.error('Error creating note', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ message: 'Failed to create note' });
  }
});

// PUT /api/notes/:id - Update a note
router.put('/:id', async (req, res) => {
  try {
    const noteId = parseInt(req.params.id);
    if (isNaN(noteId)) {
      return res.status(400).json({ message: 'Invalid note ID' });
    }

    const validatedData = updateNoteSchema.parse(req.body);
    const note = await storage.updateNote(noteId, validatedData);
    
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    res.json(note);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid note data', errors: error.errors });
    }
    logger.error('Error updating note', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ message: 'Failed to update note' });
  }
});

// DELETE /api/notes/:id - Delete a note
router.delete('/:id', async (req, res) => {
  try {
    const noteId = parseInt(req.params.id);
    if (isNaN(noteId)) {
      return res.status(400).json({ message: 'Invalid note ID' });
    }

    const success = await storage.deleteNote(noteId);
    
    if (!success) {
      return res.status(404).json({ message: 'Note not found' });
    }
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    logger.error('Error deleting note', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ message: 'Failed to delete note' });
  }
});

export default router;