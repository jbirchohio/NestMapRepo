import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { todos, trips } from "@shared/schema";
import { unifiedAuthMiddleware } from "../middleware/unifiedAuth";
import { z } from "zod";

const router = Router();
router.use(unifiedAuthMiddleware);

// Validation schemas
const createTodoSchema = z.object({
  trip_id: z.number(),
  task: z.string().min(1).max(500),
  completed: z.boolean().default(false),
  assigned_to: z.string().optional()
});

const updateTodoSchema = z.object({
  task: z.string().min(1).max(500).optional(),
  completed: z.boolean().optional(),
  assigned_to: z.string().optional()
});

// POST /api/todos - Create new todo
router.post("/", async (req, res) => {
  try {
    const validatedData = createTodoSchema.parse(req.body);
    
    // Verify trip belongs to user's organization
    const trip = await db.query.trips.findFirst({
      where: and(
        eq(trips.id, validatedData.trip_id),
        eq(trips.organization_id, req.user?.organization_id || 0)
      )
    });

    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        error: "Trip not found or access denied" 
      });
    }

    const [newTodo] = await db.insert(todos).values({
      trip_id: validatedData.trip_id,
      task: validatedData.task,
      completed: validatedData.completed,
      assigned_to: validatedData.assigned_to,
      organization_id: req.user?.organization_id || null
    }).returning();

    res.status(201).json({
      success: true,
      data: newTodo
    });
  } catch (error) {
    console.error("Error creating todo:", error);
    res.status(400).json({ 
      success: false, 
      error: "Failed to create todo" 
    });
  }
});

// PUT /api/todos/:id - Update todo
router.put("/:id", async (req, res) => {
  try {
    const todoId = parseInt(req.params.id);
    const validatedData = updateTodoSchema.parse(req.body);

    // Verify todo exists and belongs to user's organization
    const existingTodo = await db.query.todos.findFirst({
      where: and(
        eq(todos.id, todoId),
        eq(todos.organization_id, req.user?.organization_id || 0)
      )
    });

    if (!existingTodo) {
      return res.status(404).json({ 
        success: false, 
        error: "Todo not found" 
      });
    }

    const [updatedTodo] = await db.update(todos)
      .set(validatedData)
      .where(eq(todos.id, todoId))
      .returning();

    res.json({
      success: true,
      data: updatedTodo
    });
  } catch (error) {
    console.error("Error updating todo:", error);
    res.status(400).json({ 
      success: false, 
      error: "Failed to update todo" 
    });
  }
});

// DELETE /api/todos/:id - Delete todo
router.delete("/:id", async (req, res) => {
  try {
    const todoId = parseInt(req.params.id);

    // Verify todo exists and belongs to user's organization
    const existingTodo = await db.query.todos.findFirst({
      where: and(
        eq(todos.id, todoId),
        eq(todos.organizationId, req.user.organization_id)
      )
    });

    if (!existingTodo) {
      return res.status(404).json({ 
        success: false, 
        error: "Todo not found" 
      });
    }

    await db.delete(todos).where(eq(todos.id, todoId));

    res.json({
      success: true,
      message: "Todo deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting todo:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to delete todo" 
    });
  }
});

// PATCH /api/todos/:id/toggle - Toggle todo completion
router.patch("/:id/toggle", async (req, res) => {
  try {
    const todoId = parseInt(req.params.id);

    // Verify todo exists and belongs to user's organization
    const existingTodo = await db.query.todos.findFirst({
      where: and(
        eq(todos.id, todoId),
        eq(todos.organizationId, req.user.organization_id)
      )
    });

    if (!existingTodo) {
      return res.status(404).json({ 
        success: false, 
        error: "Todo not found" 
      });
    }

    const [updatedTodo] = await db.update(todos)
      .set({
        completed: !existingTodo.completed,
        updatedAt: new Date()
      })
      .where(eq(todos.id, todoId))
      .returning();

    res.json({
      success: true,
      data: updatedTodo
    });
  } catch (error) {
    console.error("Error toggling todo:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to toggle todo" 
    });
  }
});

export default router;