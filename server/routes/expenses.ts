import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { expenses, trips, insertExpenseSchema } from '@shared/schema';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Get expenses for a trip (organization-scoped)
router.get('/trip/:tripId', async (req, res) => {
  try {
    const tripId = parseInt(req.params.tripId);
    const organizationId = req.user!.organization_id!;
    
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
    
    // Get expenses for this trip within organization
    const tripExpenses = await db
      .select({
        id: expenses.id,
        tripId: expenses.tripId,
        userId: expenses.userId,
        category: expenses.category,
        description: expenses.description,
        amount: expenses.amount,
        currency: expenses.currency,
        date: expenses.date,
        receiptUrl: expenses.receiptUrl,
        status: expenses.status,
        approvedBy: expenses.approvedBy,
        approvedAt: expenses.approvedAt,
        createdAt: expenses.createdAt,
      })
      .from(expenses)
      .where(and(
        eq(expenses.tripId, tripId),
        eq(expenses.organizationId, organizationId)
      ))
      .orderBy(desc(expenses.date));
    
    res.json(tripExpenses);
  } catch (error) {
    console.error('Error fetching trip expenses:', error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

// Create new expense (organization-scoped)
router.post('/', async (req, res) => {
  try {
    const organizationId = req.user!.organization_id!;
    const userId = req.user!.id;
    
    // Validate input
    const validatedData = insertExpenseSchema.parse(req.body);
    
    // Verify trip belongs to user's organization
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(
        eq(trips.id, validatedData.tripId),
        eq(trips.organization_id, organizationId)
      ));
    
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
    
    // Create expense with organization and user context
    const [newExpense] = await db
      .insert(expenses)
      .values({
        ...validatedData,
        userId,
        organizationId,
        status: 'pending'
      })
      .returning();
    
    res.status(201).json(newExpense);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: error.errors 
      });
    }
    
    console.error('Error creating expense:', error);
    res.status(500).json({ error: "Failed to create expense" });
  }
});

// Update expense (organization-scoped)
router.put('/:id', async (req, res) => {
  try {
    const expenseId = parseInt(req.params.id);
    const organizationId = req.user!.organization_id!;
    const userId = req.user!.id;
    
    // Verify expense belongs to user's organization
    const [existingExpense] = await db
      .select()
      .from(expenses)
      .where(and(
        eq(expenses.id, expenseId),
        eq(expenses.organizationId, organizationId)
      ));
    
    if (!existingExpense) {
      return res.status(404).json({ error: "Expense not found" });
    }
    
    // Only allow updates by expense owner or managers
    if (existingExpense.userId !== userId && !['admin', 'manager'].includes(req.user!.role)) {
      return res.status(403).json({ error: "Not authorized to update this expense" });
    }
    
    // Validate update data
    const updateData = insertExpenseSchema.partial().parse(req.body);
    
    // Update expense
    const [updatedExpense] = await db
      .update(expenses)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(expenses.id, expenseId))
      .returning();
    
    res.json(updatedExpense);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: error.errors 
      });
    }
    
    console.error('Error updating expense:', error);
    res.status(500).json({ error: "Failed to update expense" });
  }
});

// Approve/reject expense (managers only)
router.patch('/:id/approval', async (req, res) => {
  try {
    const expenseId = parseInt(req.params.id);
    const organizationId = req.user!.organization_id!;
    const userId = req.user!.id;
    const { status, notes } = req.body;
    
    // Only managers and admins can approve expenses
    if (!['admin', 'manager'].includes(req.user!.role)) {
      return res.status(403).json({ error: "Manager role required to approve expenses" });
    }
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
    }
    
    // Verify expense belongs to user's organization
    const [existingExpense] = await db
      .select()
      .from(expenses)
      .where(and(
        eq(expenses.id, expenseId),
        eq(expenses.organizationId, organizationId)
      ));
    
    if (!existingExpense) {
      return res.status(404).json({ error: "Expense not found" });
    }
    
    // Update expense approval
    const [updatedExpense] = await db
      .update(expenses)
      .set({
        status,
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(expenses.id, expenseId))
      .returning();
    
    res.json(updatedExpense);
  } catch (error) {
    console.error('Error updating expense approval:', error);
    res.status(500).json({ error: "Failed to update expense approval" });
  }
});

// Delete expense (organization-scoped)
router.delete('/:id', async (req, res) => {
  try {
    const expenseId = parseInt(req.params.id);
    const organizationId = req.user!.organization_id!;
    const userId = req.user!.id;
    
    // Verify expense belongs to user's organization
    const [existingExpense] = await db
      .select()
      .from(expenses)
      .where(and(
        eq(expenses.id, expenseId),
        eq(expenses.organizationId, organizationId)
      ));
    
    if (!existingExpense) {
      return res.status(404).json({ error: "Expense not found" });
    }
    
    // Only allow deletion by expense owner or managers
    if (existingExpense.userId !== userId && !['admin', 'manager'].includes(req.user!.role)) {
      return res.status(403).json({ error: "Not authorized to delete this expense" });
    }
    
    await db
      .delete(expenses)
      .where(eq(expenses.id, expenseId));
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

// Get organization expense summary (managers only)
router.get('/organization/summary', async (req, res) => {
  try {
    const organizationId = req.user!.organization_id!;
    
    // Only managers and admins can view organization summary
    if (!['admin', 'manager'].includes(req.user!.role)) {
      return res.status(403).json({ error: "Manager role required to view organization summary" });
    }
    
    // Get expense summary for organization
    const orgExpenses = await db
      .select({
        category: expenses.category,
        status: expenses.status,
        amount: expenses.amount,
        currency: expenses.currency,
        date: expenses.date,
      })
      .from(expenses)
      .where(eq(expenses.organizationId, organizationId));
    
    // Calculate summaries
    const summary = {
      totalExpenses: orgExpenses.length,
      totalAmount: orgExpenses.reduce((sum, exp) => sum + exp.amount, 0),
      pendingAmount: orgExpenses
        .filter(exp => exp.status === 'pending')
        .reduce((sum, exp) => sum + exp.amount, 0),
      approvedAmount: orgExpenses
        .filter(exp => exp.status === 'approved')
        .reduce((sum, exp) => sum + exp.amount, 0),
      byCategory: orgExpenses.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
      }, {} as Record<string, number>)
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching organization expense summary:', error);
    res.status(500).json({ error: "Failed to fetch expense summary" });
  }
});

export default router;