import { Router } from 'express';
import { eq } from '../utils/drizzle-shim';
import { and, or, ne, gte, lte } from '../utils/drizzle-shim';
import { desc } from '../utils/drizzle-shim';
// TODO: Fix count and sql imports - may need different approach
import { sql } from '../utils/drizzle-shim';
import { count } from '../utils/drizzle-shim';
import { db } from '../db/db';
import { budgets, expenses, users } from '../db/schema';
import { authenticateJWT } from '../middleware/auth.js';
import { z } from 'zod';
// import { auditLogger } from '../auditLogger';

// Validation schemas
const insertBudgetSchema = z.object({
  name: z.string().min(1, "Budget name is required"),
  description: z.string().optional(),
  amount: z.union([
    z.number(),
    z.string().transform((val, ctx) => {
      const parsed = parseFloat(val);
      if (isNaN(parsed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Amount must be a valid number",
        });
        return z.NEVER;
      }
      return Math.round(parsed * 100); // Convert to cents
    })
  ]).refine(val => val > 0, "Amount must be greater than 0"),
  currency: z.string().default('USD'),
  category: z.enum(['project', 'department', 'trip_type', 'general']).default('general'),
  status: z.enum(['active', 'archived', 'planned']).default('active'),
  startDate: z.string().transform(val => new Date(val)),
  endDate: z.string().transform(val => new Date(val)).optional(),
  ownerId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
});

const updateBudgetSchema = insertBudgetSchema.partial();

const router = Router();

// Apply authentication to all routes
router.use(authenticateJWT);

// Simple audit logger fallback
const auditLogger = {
  log: async (data: any) => {
    console.log('Audit log:', data);
  }
};

// Get budgets for organization
router.get('/', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const organizationId = req.user.organizationId;
    const { status, category, ownerId, page = 1, limit = 50 } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereConditions = [eq(budgets.organizationId, organizationId)];
    
    if (status) {
      whereConditions.push(eq(budgets.status, status as string));
    }
    
    if (category) {
      whereConditions.push(eq(budgets.category, category as string));
    }
    
    if (ownerId) {
      whereConditions.push(eq(budgets.ownerId, ownerId as string));
    }
    
    const budgetsList = await db
      .select({
        id: budgets.id,
        name: budgets.name,
        description: budgets.description,
        amount: budgets.amount,
        currency: budgets.currency,
        category: budgets.category,
        status: budgets.status,
        startDate: budgets.startDate,
        endDate: budgets.endDate,
        ownerId: budgets.ownerId,
        ownerName: sql`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as('ownerName'),
        metadata: budgets.metadata,
        createdAt: budgets.createdAt,
        updatedAt: budgets.updatedAt,
      })
      .from(budgets)
      .leftJoin(users, eq(budgets.ownerId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(budgets.createdAt))
      .limit(Number(limit))
      .offset(offset);

    // Get total count for pagination
    const [totalCount] = await db
      .select({ count: count() })
      .from(budgets)
      .where(and(...whereConditions));

    await auditLogger.log({
      action: 'budgets_viewed',
      userId: req.user.userId,
      organizationId,
      details: { 
        filters: { status, category, ownerId },
        resultCount: budgetsList.length 
      }
    });

    res.json({
      budgets: budgetsList,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount.count,
        pages: Math.ceil(totalCount.count / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ error: "Failed to fetch budgets" });
  }
});

// Get budget by ID with spending analysis
router.get('/:budgetId', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const budgetId = req.params.budgetId;
    const organizationId = req.user.organizationId;
    
    const [budget] = await db
      .select({
        id: budgets.id,
        name: budgets.name,
        description: budgets.description,
        amount: budgets.amount,
        currency: budgets.currency,
        category: budgets.category,
        status: budgets.status,
        startDate: budgets.startDate,
        endDate: budgets.endDate,
        ownerId: budgets.ownerId,
        ownerName: sql`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as('ownerName'),
        metadata: budgets.metadata,
        createdAt: budgets.createdAt,
        updatedAt: budgets.updatedAt,
      })
      .from(budgets)
      .leftJoin(users, eq(budgets.ownerId, users.id))
      .where(and(
        eq(budgets.id, budgetId),
        eq(budgets.organizationId, organizationId)
      ));
    
    if (!budget) {
      return res.status(404).json({ error: "Budget not found" });
    }

    // Calculate spending against this budget
    const spendingAnalysis = await calculateBudgetSpending(budgetId, organizationId);
    
    await auditLogger.log({
      action: 'budget_viewed',
      userId: req.user.userId,
      organizationId,
      entityId: budgetId,
      details: { budgetName: budget.name }
    });

    res.json({
      ...budget,
      spending: spendingAnalysis
    });
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ error: "Failed to fetch budget" });
  }
});

// Create budget
router.post('/', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const organizationId = req.user.organizationId;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    // Only managers and admins can create budgets
    if (!['admin', 'manager'].includes(userRole)) {
      return res.status(403).json({ error: "Manager role required to create budgets" });
    }
    
    const validatedData = insertBudgetSchema.parse(req.body);
    
    // Verify owner exists in organization if specified
    if (validatedData.ownerId) {
      const [owner] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.id, validatedData.ownerId),
          eq(users.organizationId, organizationId)
        ));
      
      if (!owner) {
        return res.status(400).json({ error: "Budget owner must be a member of your organization" });
      }
    }
    
    // Create budget
    const [newBudget] = await db
      .insert(budgets)
      .values({
        ...validatedData,
        organizationId,
        ownerId: validatedData.ownerId || userId,
      })
      .returning();

    await auditLogger.log({
      action: 'budget_created',
      userId,
      organizationId,
      entityId: newBudget.id,
      details: { 
        budgetName: newBudget.name,
        amount: newBudget.amount,
        category: newBudget.category
      }
    });
    
    res.status(201).json(newBudget);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: error.errors 
      });
    }
    
    console.error('Error creating budget:', error);
    res.status(500).json({ error: "Failed to create budget" });
  }
});

// Update budget
router.patch('/:budgetId', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const budgetId = req.params.budgetId;
    const organizationId = req.user.organizationId;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    // Get existing budget
    const [existingBudget] = await db
      .select()
      .from(budgets)
      .where(and(
        eq(budgets.id, budgetId),
        eq(budgets.organizationId, organizationId)
      ));
    
    if (!existingBudget) {
      return res.status(404).json({ error: "Budget not found" });
    }
    
    // Check permissions - budget owner or admin/manager can edit
    if (existingBudget.ownerId !== userId && !['admin', 'manager'].includes(userRole)) {
      return res.status(403).json({ error: "Permission denied" });
    }
    
    const updateData = updateBudgetSchema.parse(req.body);
    
    // Verify new owner exists in organization if specified
    if (updateData.ownerId) {
      const [owner] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.id, updateData.ownerId),
          eq(users.organizationId, organizationId)
        ));
      
      if (!owner) {
        return res.status(400).json({ error: "Budget owner must be a member of your organization" });
      }
    }
    
    // Update budget
    const [updatedBudget] = await db
      .update(budgets)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(budgets.id, budgetId))
      .returning();

    await auditLogger.log({
      action: 'budget_updated',
      userId,
      organizationId,
      entityId: budgetId,
      details: { 
        budgetName: updatedBudget.name,
        changes: updateData
      }
    });
    
    res.json(updatedBudget);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: error.errors 
      });
    }
    
    console.error('Error updating budget:', error);
    res.status(500).json({ error: "Failed to update budget" });
  }
});

// Delete budget
router.delete('/:budgetId', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const budgetId = req.params.budgetId;
    const organizationId = req.user.organizationId;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    // Only admins can delete budgets
    if (userRole !== 'admin') {
      return res.status(403).json({ error: "Admin role required to delete budgets" });
    }
    
    // Get budget to verify it exists
    const [budget] = await db
      .select()
      .from(budgets)
      .where(and(
        eq(budgets.id, budgetId),
        eq(budgets.organizationId, organizationId)
      ));
    
    if (!budget) {
      return res.status(404).json({ error: "Budget not found" });
    }
    
    // Delete budget
    await db
      .delete(budgets)
      .where(eq(budgets.id, budgetId));

    await auditLogger.log({
      action: 'budget_deleted',
      userId,
      organizationId,
      entityId: budgetId,
      details: { budgetName: budget.name }
    });
    
    res.json({ message: "Budget deleted successfully" });
  } catch (error) {
    console.error('Error deleting budget:', error);
    res.status(500).json({ error: "Failed to delete budget" });
  }
});

// Get budget analytics
router.get('/:budgetId/analytics', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const budgetId = req.params.budgetId;
    const organizationId = req.user.organizationId;
    
    // Verify budget exists and user has access
    const [budget] = await db
      .select()
      .from(budgets)
      .where(and(
        eq(budgets.id, budgetId),
        eq(budgets.organizationId, organizationId)
      ));
    
    if (!budget) {
      return res.status(404).json({ error: "Budget not found" });
    }

    const analytics = await generateBudgetAnalytics(budgetId, organizationId, budget);
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching budget analytics:', error);
    res.status(500).json({ error: "Failed to fetch budget analytics" });
  }
});

// Helper function to calculate budget spending
async function calculateBudgetSpending(budgetId: string, organizationId: string) {
  const [budget] = await db
    .select()
    .from(budgets)
    .where(eq(budgets.id, budgetId));

  if (!budget) return null;

  // Calculate total expenses in budget period
  let whereConditions = [eq(expenses.organizationId, organizationId)];
  
  if (budget.startDate) {
    whereConditions.push(gte(expenses.expenseDate, budget.startDate));
  }
  
  if (budget.endDate) {
    whereConditions.push(lte(expenses.expenseDate, budget.endDate));
  }

  const [spendingData] = await db
    .select({
      totalSpent: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
      transactionCount: count(expenses.id)
    })
    .from(expenses)
    .where(and(...whereConditions));

  const totalSpent = Number(spendingData.totalSpent) || 0;
  const remaining = budget.amount - totalSpent;
  const percentageUsed = budget.amount > 0 ? (totalSpent / budget.amount) * 100 : 0;

  return {
    budgetAmount: budget.amount,
    totalSpent,
    remaining,
    percentageUsed: Math.round(percentageUsed * 100) / 100,
    transactionCount: spendingData.transactionCount,
    status: percentageUsed >= 100 ? 'over_budget' : 
            percentageUsed >= 80 ? 'warning' : 'on_track'
  };
}

// Helper function to generate budget analytics
async function generateBudgetAnalytics(budgetId: string, organizationId: string, budget: any) {
  const spending = await calculateBudgetSpending(budgetId, organizationId);
  
  // Get monthly spending breakdown
  const monthlySpending = await db
    .select({
      month: sql<string>`to_char(${expenses.expenseDate}, 'YYYY-MM')`,
      amount: sql<number>`SUM(${expenses.amount})`,
      count: count(expenses.id)
    })
    .from(expenses)
    .where(and(
      eq(expenses.organizationId, organizationId),
      budget.startDate ? gte(expenses.expenseDate, budget.startDate) : sql`true`,
      budget.endDate ? lte(expenses.expenseDate, budget.endDate) : sql`true`
    ))
    .groupBy(sql`to_char(${expenses.expenseDate}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${expenses.expenseDate}, 'YYYY-MM')`);

  // Get category breakdown
  const categoryBreakdown = await db
    .select({
      category: expenses.category,
      amount: sql<number>`SUM(${expenses.amount})`,
      count: count(expenses.id)
    })
    .from(expenses)
    .where(and(
      eq(expenses.organizationId, organizationId),
      budget.startDate ? gte(expenses.expenseDate, budget.startDate) : sql`true`,
      budget.endDate ? lte(expenses.expenseDate, budget.endDate) : sql`true`
    ))
    .groupBy(expenses.category);

  return {
    overview: spending,
    monthlyTrends: monthlySpending,
    categoryBreakdown,
    budget: {
      id: budget.id,
      name: budget.name,
      amount: budget.amount,
      startDate: budget.startDate,
      endDate: budget.endDate,
      status: budget.status
    }
  };
}

export default router;



