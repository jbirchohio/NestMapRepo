import { Router } from "express";
import { unifiedAuthMiddleware } from "../middleware/unifiedAuth";
import { z } from "zod";
import { db } from "../db";
import { todos } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();
router.use(unifiedAuthMiddleware);

// Validation schema
const createTodoSchema = z.object({
  trip_id: z.number(),
  task: z.string().min(1),
  assigned_to: z.string().optional(),
  completed: z.boolean().optional().default(false)
});

const updateTodoSchema = z.object({
  task: z.string().min(1).optional(),
  assigned_to: z.string().optional(),
  completed: z.boolean().optional()
});

// POST /api/todos - Create a new todo
router.post("/", async (req, res) => {
  try {
    const validatedData = createTodoSchema.parse(req.body);
    
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const newTodo = await db
      .insert(todos)
      .values({
        ...validatedData,
        organization_id: req.user.organization_id
      })
      .returning();

    res.status(201).json(newTodo[0]);
  } catch (error) {
    console.error("Error creating todo:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create todo" });
  }
});

// PUT /api/todos/:id - Update a todo
router.put("/:id", async (req, res) => {
  try {
    const todoId = parseInt(req.params.id);
    const validatedData = updateTodoSchema.parse(req.body);
    
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const updatedTodo = await db
      .update(todos)
      .set(validatedData)
      .where(and(
        eq(todos.id, todoId),
        eq(todos.organization_id, req.user.organization_id)
      ))
      .returning();

    if (updatedTodo.length === 0) {
      return res.status(404).json({ error: "Todo not found" });
    }

    res.json(updatedTodo[0]);
  } catch (error) {
    console.error("Error updating todo:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update todo" });
  }
});

// DELETE /api/todos/:id - Delete a todo
router.delete("/:id", async (req, res) => {
  try {
    const todoId = parseInt(req.params.id);
    
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const deletedTodo = await db
      .delete(todos)
      .where(and(
        eq(todos.id, todoId),
        eq(todos.organization_id, req.user.organization_id)
      ))
      .returning();

    if (deletedTodo.length === 0) {
      return res.status(404).json({ error: "Todo not found" });
    }

    res.json({ message: "Todo deleted successfully" });
  } catch (error) {
    console.error("Error deleting todo:", error);
    res.status(500).json({ error: "Failed to delete todo" });
  }
});

export default router;