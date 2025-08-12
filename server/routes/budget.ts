import { Router } from "express";
import { storage } from "../storage";
import { jwtAuthMiddleware as jwtAuth } from "../middleware/jwtAuth";
import { z } from "zod";
import { logger } from "../utils/logger";

const router = Router();

// Budget update schema
const updateBudgetSchema = z.object({
  budget: z.number().min(0),
  currency: z.string().optional(),
  budget_categories: z.object({
    accommodation: z.number().optional(),
    transportation: z.number().optional(),
    food: z.number().optional(),
    activities: z.number().optional(),
    shopping: z.number().optional(),
    emergency: z.number().optional(),
  }).optional(),
  budget_alert_threshold: z.number().min(0).max(100).optional(),
});

// Activity cost schema
const updateActivityCostSchema = z.object({
  estimated_cost: z.number().min(0).optional(),
  actual_cost: z.number().min(0).optional(),
  category: z.enum(['accommodation', 'transportation', 'food', 'activities', 'shopping', 'other']).optional(),
  split_between: z.number().min(1).optional(),
  is_paid: z.boolean().optional(),
  paid_by: z.number().optional(),
  currency: z.string().optional(),
});

// Group expense schema
const createGroupExpenseSchema = z.object({
  trip_id: z.number(),
  activity_id: z.number().optional(),
  description: z.string(),
  total_amount: z.number().min(0),
  currency: z.string().optional(),
  paid_by: z.number(),
  split_type: z.enum(['equal', 'custom', 'percentage']).optional(),
  split_details: z.array(z.object({
    user_id: z.number(),
    amount: z.number().min(0),
    percentage: z.number().min(0).max(100).optional(),
    is_settled: z.boolean().optional(),
  })),
  category: z.string().optional(),
  receipt_url: z.string().url().optional(),
  notes: z.string().optional(),
});

// Update trip budget
router.put("/trips/:tripId/budget", jwtAuth, async (req, res) => {
  try {
    const tripId = parseInt(req.params.tripId);
    const userId = req.user!.id;
    
    // Check if user has access to the trip
    const trip = await storage.getTripById(tripId);
    if (!trip || trip.user_id !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const budgetData = updateBudgetSchema.parse(req.body);
    const updated = await storage.updateTripBudget(tripId, budgetData);
    
    res.json(updated);
  } catch (error: any) {
    logger.error("Error updating trip budget:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to update budget" });
  }
});

// Get trip budget summary
router.get("/trips/:tripId/budget/summary", jwtAuth, async (req, res) => {
  try {
    const tripId = parseInt(req.params.tripId);
    const userId = req.user!.id;
    
    // Check if user has access to the trip
    const trip = await storage.getTripById(tripId);
    if (!trip || trip.user_id !== userId) {
      // Check if user is a collaborator
      const collaborators = await storage.getTripCollaborators(tripId);
      const isCollaborator = collaborators.some(c => c.user_id === userId && c.status === 'accepted');
      if (!isCollaborator) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const summary = await storage.getTripBudgetSummary(tripId);
    res.json(summary);
  } catch (error: any) {
    logger.error("Error getting budget summary:", error);
    res.status(500).json({ error: "Failed to get budget summary" });
  }
});

// Update activity cost
router.put("/activities/:activityId/cost", jwtAuth, async (req, res) => {
  try {
    const activityId = parseInt(req.params.activityId);
    const userId = req.user!.id;
    
    // Get activity to check access
    const activity = await storage.getActivity(activityId);
    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }
    
    // Check if user has access to the trip
    const trip = await storage.getTripById(activity.trip_id);
    if (!trip || trip.user_id !== userId) {
      const collaborators = await storage.getTripCollaborators(activity.trip_id);
      const isCollaborator = collaborators.some(c => c.user_id === userId && c.status === 'accepted');
      if (!isCollaborator) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const costData = updateActivityCostSchema.parse(req.body);
    const updated = await storage.updateActivityCost(activityId, costData);
    
    res.json(updated);
  } catch (error: any) {
    logger.error("Error updating activity cost:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to update activity cost" });
  }
});

// Create group expense
router.post("/group-expenses", jwtAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const expenseData = createGroupExpenseSchema.parse(req.body);
    
    // Check if user has access to the trip
    const trip = await storage.getTripById(expenseData.trip_id);
    if (!trip || trip.user_id !== userId) {
      const collaborators = await storage.getTripCollaborators(expenseData.trip_id);
      const isCollaborator = collaborators.some(c => c.user_id === userId && c.status === 'accepted');
      if (!isCollaborator) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Auto-calculate equal splits if needed
    if (expenseData.split_type === 'equal' && !expenseData.split_details.length) {
      const collaborators = await storage.getTripCollaborators(expenseData.trip_id);
      const acceptedCollaborators = collaborators.filter(c => c.status === 'accepted');
      const allUsers = [trip!.user_id, ...acceptedCollaborators.map(c => c.user_id)];
      const splitAmount = expenseData.total_amount / allUsers.length;
      
      expenseData.split_details = allUsers.map(uid => ({
        user_id: uid,
        amount: splitAmount,
        is_settled: uid === expenseData.paid_by,
      }));
    }

    const expense = await storage.createGroupExpense(expenseData);
    res.json(expense);
  } catch (error: any) {
    logger.error("Error creating group expense:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to create group expense" });
  }
});

// Get group expenses for a trip
router.get("/trips/:tripId/group-expenses", jwtAuth, async (req, res) => {
  try {
    const tripId = parseInt(req.params.tripId);
    const userId = req.user!.id;
    
    // Check if user has access to the trip
    const trip = await storage.getTripById(tripId);
    if (!trip || trip.user_id !== userId) {
      const collaborators = await storage.getTripCollaborators(tripId);
      const isCollaborator = collaborators.some(c => c.user_id === userId && c.status === 'accepted');
      if (!isCollaborator) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const expenses = await storage.getGroupExpensesByTripId(tripId);
    res.json(expenses);
  } catch (error: any) {
    logger.error("Error getting group expenses:", error);
    res.status(500).json({ error: "Failed to get group expenses" });
  }
});

// Update group expense
router.put("/group-expenses/:id", jwtAuth, async (req, res) => {
  try {
    const expenseId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    // Get expense to check access
    const expenses = await storage.getGroupExpensesByTripId(0); // Need to add getGroupExpenseById
    // For now, we'll skip detailed validation
    
    const updated = await storage.updateGroupExpense(expenseId, req.body);
    res.json(updated);
  } catch (error: any) {
    logger.error("Error updating group expense:", error);
    res.status(500).json({ error: "Failed to update group expense" });
  }
});

// Delete group expense
router.delete("/group-expenses/:id", jwtAuth, async (req, res) => {
  try {
    const expenseId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    // For now, we'll skip detailed validation
    const deleted = await storage.deleteGroupExpense(expenseId);
    res.json({ success: deleted });
  } catch (error: any) {
    logger.error("Error deleting group expense:", error);
    res.status(500).json({ error: "Failed to delete group expense" });
  }
});

// Settle group expense
router.post("/group-expenses/:id/settle", jwtAuth, async (req, res) => {
  try {
    const expenseId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    const settled = await storage.settleGroupExpense(expenseId);
    res.json(settled);
  } catch (error: any) {
    logger.error("Error settling group expense:", error);
    res.status(500).json({ error: "Failed to settle group expense" });
  }
});

// Get trip expense summary (who owes whom)
router.get("/trips/:tripId/expense-summary", jwtAuth, async (req, res) => {
  try {
    const tripId = parseInt(req.params.tripId);
    const userId = req.user!.id;
    
    // Check if user has access to the trip
    const trip = await storage.getTripById(tripId);
    if (!trip || trip.user_id !== userId) {
      const collaborators = await storage.getTripCollaborators(tripId);
      const isCollaborator = collaborators.some(c => c.user_id === userId && c.status === 'accepted');
      if (!isCollaborator) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const summary = await storage.getTripExpenseSummary(tripId);
    res.json(summary);
  } catch (error: any) {
    logger.error("Error getting expense summary:", error);
    res.status(500).json({ error: "Failed to get expense summary" });
  }
});

// Get free activities suggestions
router.get("/trips/:tripId/free-activities", jwtAuth, async (req, res) => {
  try {
    const tripId = parseInt(req.params.tripId);
    const { location, date } = req.query;
    
    // For now, return mock data - this will be enhanced with AI later
    const freeActivities = [
      {
        title: "Visit Central Park",
        description: "Beautiful public park with walking trails, lakes, and free events",
        location: "Central Park, New York",
        cost: 0,
        category: "nature",
        duration: "2-3 hours",
      },
      {
        title: "Free Museum Day",
        description: "Many museums offer free admission on certain days",
        location: location || "Various locations",
        cost: 0,
        category: "culture",
        duration: "2-4 hours",
      },
      {
        title: "Walking Tour",
        description: "Self-guided walking tour of historic neighborhoods",
        location: location || "City center",
        cost: 0,
        category: "sightseeing",
        duration: "1-2 hours",
      },
      {
        title: "Beach Day",
        description: "Relax at the beach, swim, and enjoy the sun",
        location: "Public beach",
        cost: 0,
        category: "recreation",
        duration: "Half day",
      },
      {
        title: "Local Market Visit",
        description: "Browse local markets for free, enjoy the atmosphere",
        location: "Local market",
        cost: 0,
        category: "shopping",
        duration: "1-2 hours",
      },
    ];
    
    res.json({ activities: freeActivities });
  } catch (error: any) {
    logger.error("Error getting free activities:", error);
    res.status(500).json({ error: "Failed to get free activities" });
  }
});

export default router;