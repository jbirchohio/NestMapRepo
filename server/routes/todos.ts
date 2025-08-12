import { Router } from 'express';
import { storage } from '../storage';
import { jwtAuthMiddleware } from '../middleware/jwtAuth';
import { z } from 'zod';
import { logger } from '../utils/logger';

const router = Router();

// Apply JWT authentication to all todo routes
router.use(jwtAuthMiddleware);

// Validation schemas
const createTodoSchema = z.object({
  tripId: z.number(),
  task: z.string().min(1),
  completed: z.boolean().optional().default(false)
});

const updateTodoSchema = z.object({
  task: z.string().min(1).optional(),
  completed: z.boolean().optional()
});

// GET /api/todos/:tripId - Get all todos for a trip
router.get('/:tripId', async (req, res) => {
  try {
    const tripId = parseInt(req.params.tripId);
    if (isNaN(tripId)) {
      return res.status(400).json({ message: 'Invalid trip ID' });
    }

    const todos = await storage.getTodosByTripId(tripId);
    res.json(todos);
  } catch (error) {
    logger.error('Error fetching todos', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ message: 'Failed to fetch todos' });
  }
});

// POST /api/todos - Create a new todo
router.post('/', async (req, res) => {
  try {
    // After case conversion middleware, req.body has snake_case fields
    // Map them to camelCase for the schema
    const dataToValidate = {
      tripId: req.body.trip_id,
      task: req.body.task,
      completed: req.body.completed
    };

    const validatedData = createTodoSchema.parse(dataToValidate);


    const todo = await storage.createTodo(validatedData);
    res.status(201).json(todo);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid todo data', errors: error.errors });
    }
    logger.error('Error creating todo', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ message: 'Failed to create todo' });
  }
});

// PUT /api/todos/:id - Update a todo
router.put('/:id', async (req, res) => {
  try {
    const todoId = parseInt(req.params.id);
    if (isNaN(todoId)) {
      return res.status(400).json({ message: 'Invalid todo ID' });
    }

    const validatedData = updateTodoSchema.parse(req.body);
    const todo = await storage.updateTodo(todoId, validatedData);

    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }

    res.json(todo);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid todo data', errors: error.errors });
    }
    logger.error('Error updating todo', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ message: 'Failed to update todo' });
  }
});

// DELETE /api/todos/:id - Delete a todo
router.delete('/:id', async (req, res) => {
  try {
    const todoId = parseInt(req.params.id);
    if (isNaN(todoId)) {
      return res.status(400).json({ message: 'Invalid todo ID' });
    }

    const success = await storage.deleteTodo(todoId);

    if (!success) {
      return res.status(404).json({ message: 'Todo not found' });
    }

    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    logger.error('Error deleting todo', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ message: 'Failed to delete todo' });
  }
});

export default router;