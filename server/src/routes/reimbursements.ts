import { Router } from 'express';
import { eq } from '../utils/drizzle-shim';
import { and, or, gte, lte } from '../utils/drizzle-shim';
import { desc } from '../utils/drizzle-shim';
// TODO: Fix count and sql imports - may need different approach
import { sql } from '../utils/drizzle-shim';
import { count } from '../utils/drizzle-shim';
import { db } from '../db/db';
import { reimbursements, expenses, users } from '../db/schema';
import { authenticateJWT } from '../middleware/auth.js';
import { z } from 'zod';

// Validation schemas
const createReimbursementSchema = z.object({
  expenseIds: z.array(z.string().uuid()).min(1, "At least one expense is required"),
  paymentMethod: z.string().optional(),
});

const updateReimbursementSchema = z.object({
  paymentStatus: z.enum(['pending', 'approved', 'rejected', 'paid']).optional(),
  paymentMethod: z.string().optional(),
  paymentReference: z.string().optional(),
  paymentDate: z.date().optional(),
});

const bulkProcessSchema = z.object({
  reimbursementIds: z.array(z.string().uuid()),
  action: z.enum(['approve', 'reject', 'mark_paid']),
  paymentMethod: z.string().optional(),
});

const router = Router();

// Apply authentication to all routes
router.use(authenticateJWT);

// Simple audit logger fallback
const auditLogger = {
  log: async (data: any) => {
    console.log('Audit log:', data);
  }
};

// Get reimbursements with filtering and pagination
router.get('/', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const organizationId = req.user.organizationId;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    const { 
      status, 
      submitterId,
      startDate, 
      endDate, 
      minAmount,
      maxAmount,
      search,
      page = 1, 
      limit = 50 
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // Build where conditions
    let whereConditions: any[] = [];
    
    // Organization filter - always required
    whereConditions.push(eq(reimbursements.organizationId, organizationId));
    
    // Role-based filtering
    if (userRole === 'member') {
      // Members can only see their own reimbursements
      whereConditions.push(eq(reimbursements.userId, userId));
    }
    // Managers and admins can see all reimbursements
    
    // Apply filters
    if (status) {
      whereConditions.push(eq(reimbursements.paymentStatus, status as string));
    }
    
    if (submitterId) {
      whereConditions.push(eq(reimbursements.userId, submitterId as string));
    }
    
    if (startDate) {
      whereConditions.push(gte(reimbursements.createdAt, new Date(startDate as string)));
    }
    
    if (endDate) {
      whereConditions.push(lte(reimbursements.createdAt, new Date(endDate as string)));
    }
    
    if (minAmount) {
      whereConditions.push(gte(reimbursements.totalAmount, Number(minAmount)));
    }
    
    if (maxAmount) {
      whereConditions.push(lte(reimbursements.totalAmount, Number(maxAmount)));
    }
    
    if (search) {
      whereConditions.push(
        or(
          like(reimbursements.paymentReference, `%${search}%`),
          like(reimbursements.batchId, `%${search}%`)
        )
      );
    }
    
    // Fetch reimbursements with user information
    const reimbursementsList = await db
      .select({
        id: reimbursements.id,
        batchId: reimbursements.batchId,
        totalAmount: reimbursements.totalAmount,
        currency: reimbursements.currency,
        paymentStatus: reimbursements.paymentStatus,
        userId: reimbursements.userId,
        submitterName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        submitterEmail: users.email,
        processedBy: reimbursements.processedBy,
        paymentMethod: reimbursements.paymentMethod,
        paymentReference: reimbursements.paymentReference,
        paymentDate: reimbursements.paymentDate,
        expenseIds: reimbursements.expenseIds,
        createdAt: reimbursements.createdAt,
        updatedAt: reimbursements.updatedAt,
      })
      .from(reimbursements)
      .leftJoin(users, eq(reimbursements.userId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(reimbursements.createdAt))
      .limit(Number(limit))
      .offset(offset);

    // Get total count for pagination
    const [totalCount] = await db
      .select({ count: count() })
      .from(reimbursements)
      .where(and(...whereConditions));

    // Get status distribution
    const statusStats = await db
      .select({
        status: reimbursements.paymentStatus,
        count: count(),
        totalAmount: sql<number>`SUM(${reimbursements.totalAmount})`
      })
      .from(reimbursements)
      .where(eq(reimbursements.organizationId, organizationId))
      .groupBy(reimbursements.paymentStatus);

    await auditLogger.log({
      action: 'reimbursements_viewed',
      userId,
      organizationId,
      details: { 
        filters: { status, submitterId, startDate, endDate },
        resultCount: reimbursementsList.length 
      }
    });

    res.json({
      reimbursements: reimbursementsList,
      stats: {
        total: totalCount.count,
        byStatus: statusStats,
        totalValue: reimbursementsList.reduce((sum, r) => sum + Number(r.totalAmount), 0),
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount.count,
        pages: Math.ceil(totalCount.count / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching reimbursements:', error);
    res.status(500).json({ error: "Failed to fetch reimbursements" });
  }
});

// Get reimbursement by ID with detailed information
router.get('/:reimbursementId', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const reimbursementId = req.params.reimbursementId;
    const organizationId = req.user.organizationId;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    // Get reimbursement with submitter information
    const [reimbursement] = await db
      .select({
        id: reimbursements.id,
        batchId: reimbursements.batchId,
        totalAmount: reimbursements.totalAmount,
        currency: reimbursements.currency,
        paymentStatus: reimbursements.paymentStatus,
        userId: reimbursements.userId,
        submitterName: sql<string>`submitter.firstName || ' ' || submitter.lastName`,
        submitterEmail: sql<string>`submitter.email`,
        processedBy: reimbursements.processedBy,
        paymentMethod: reimbursements.paymentMethod,
        paymentReference: reimbursements.paymentReference,
        paymentDate: reimbursements.paymentDate,
        expenseIds: reimbursements.expenseIds,
        createdAt: reimbursements.createdAt,
        updatedAt: reimbursements.updatedAt,
      })
      .from(reimbursements)
      .leftJoin(users, eq(reimbursements.userId, users.id))
      .where(and(
        eq(reimbursements.id, reimbursementId),
        eq(reimbursements.organizationId, organizationId)
      ));
    
    if (!reimbursement) {
      return res.status(404).json({ error: "Reimbursement not found" });
    }
    
    // Check permissions
    const canView = userRole === 'admin' || 
                   userRole === 'manager' || 
                   reimbursement.userId === userId;
    
    if (!canView) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    // Get associated expenses if expenseIds exists
    let associatedExpenses: any[] = [];
    if (reimbursement.expenseIds && Array.isArray(reimbursement.expenseIds)) {
      associatedExpenses = await db
        .select({
          id: expenses.id,
          description: expenses.description,
          amount: expenses.amount,
          category: expenses.category,
          expenseDate: expenses.expenseDate,
          receiptUrl: expenses.receiptUrl,
          status: expenses.status,
        })
        .from(expenses)
        .where(sql`${expenses.id} = ANY(${reimbursement.expenseIds as string[]})`)
    }

    await auditLogger.log({
      action: 'reimbursement_viewed',
      userId,
      organizationId,
      entityId: reimbursementId,
      details: { status: reimbursement.paymentStatus }
    });

    res.json({
      ...reimbursement,
      expenses: associatedExpenses
    });
  } catch (error) {
    console.error('Error fetching reimbursement:', error);
    res.status(500).json({ error: "Failed to fetch reimbursement" });
  }
});

// Create reimbursement
router.post('/', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const organizationId = req.user.organizationId;
    const userId = req.user.userId;
    
    const validatedData = createReimbursementSchema.parse(req.body);
    
    // Verify all expenses belong to the user and are approved
    const userExpenses = await db
      .select()
      .from(expenses)
      .where(and(
        sql`${expenses.id} = ANY(${validatedData.expenseIds})`,
        eq(expenses.userId, userId),
        eq(expenses.status, 'approved')
      ));
    
    if (userExpenses.length !== validatedData.expenseIds.length) {
      return res.status(400).json({ 
        error: "Some expenses are not found, not owned by you, or not approved" 
      });
    }
    
    // Calculate total amount
    const totalAmount = userExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    
    // Generate batch ID
    const batchId = `REIMB-${Date.now()}`;
    
    // Create reimbursement
    const [newReimbursement] = await db
      .insert(reimbursements)
      .values({
        batchId,
        totalAmount,
        paymentStatus: 'pending',
        userId,
        organizationId,
        expenseIds: validatedData.expenseIds,
        paymentMethod: validatedData.paymentMethod,
      })
      .returning();

    await auditLogger.log({
      action: 'reimbursement_created',
      userId,
      organizationId,
      entityId: newReimbursement.id,
      details: { 
        batchId: newReimbursement.batchId,
        totalAmount: newReimbursement.totalAmount,
        expenseCount: validatedData.expenseIds.length
      }
    });
    
    res.status(201).json(newReimbursement);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: error.errors 
      });
    }
    
    console.error('Error creating reimbursement:', error);
    res.status(500).json({ error: "Failed to create reimbursement" });
  }
});

// Update reimbursement (approve/reject/mark as paid)
router.patch('/:reimbursementId', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const reimbursementId = req.params.reimbursementId;
    const organizationId = req.user.organizationId;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    // Only managers and admins can update reimbursement status
    if (!['admin', 'manager'].includes(userRole)) {
      return res.status(403).json({ error: "Manager role required to process reimbursements" });
    }
    
    const updateData = updateReimbursementSchema.parse(req.body);
    
    // Get existing reimbursement
    const [existingReimbursement] = await db
      .select()
      .from(reimbursements)
      .where(and(
        eq(reimbursements.id, reimbursementId),
        eq(reimbursements.organizationId, organizationId)
      ));
    
    if (!existingReimbursement) {
      return res.status(404).json({ error: "Reimbursement not found" });
    }
    
    // Prevent updating already paid reimbursements
    if (existingReimbursement.paymentStatus === 'paid' && updateData.paymentStatus !== 'paid') {
      return res.status(400).json({ error: "Cannot modify paid reimbursements" });
    }
    
    // Set processor for status changes
    let updateValues: any = { ...updateData };
    if (updateData.paymentStatus && updateData.paymentStatus !== existingReimbursement.paymentStatus) {
      updateValues.processedBy = userId;
      
      // Set payment date if marking as paid
      if (updateData.paymentStatus === 'paid') {
        updateValues.paymentDate = new Date();
      }
    }
    
    // Update reimbursement
    const [updatedReimbursement] = await db
      .update(reimbursements)
      .set({
        ...updateValues,
        updatedAt: new Date()
      })
      .where(eq(reimbursements.id, reimbursementId))
      .returning();

    await auditLogger.log({
      action: 'reimbursement_updated',
      userId,
      organizationId,
      entityId: reimbursementId,
      details: { 
        previousStatus: existingReimbursement.paymentStatus,
        newStatus: updatedReimbursement.paymentStatus,
        changes: updateData
      }
    });
    
    res.json(updatedReimbursement);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: error.errors 
      });
    }
    
    console.error('Error updating reimbursement:', error);
    res.status(500).json({ error: "Failed to update reimbursement" });
  }
});

// Bulk process reimbursements
router.patch('/bulk/process', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const organizationId = req.user.organizationId;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    // Only managers and admins can bulk process reimbursements
    if (!['admin', 'manager'].includes(userRole)) {
      return res.status(403).json({ error: "Manager role required for bulk operations" });
    }
    
    const { reimbursementIds, action, paymentMethod } = bulkProcessSchema.parse(req.body);
    
    // Verify all reimbursements belong to the organization
    const targetReimbursements = await db
      .select()
      .from(reimbursements)
      .where(and(
        sql`${reimbursements.id} = ANY(${reimbursementIds})`,
        eq(reimbursements.organizationId, organizationId)
      ));
    
    if (targetReimbursements.length !== reimbursementIds.length) {
      return res.status(400).json({ error: "Some reimbursements not found" });
    }
    
    // Determine update values based on action
    let updateValues: any = {
      processedBy: userId,
      updatedAt: new Date()
    };
    
    switch (action) {
      case 'approve':
        updateValues.paymentStatus = 'approved';
        break;
      case 'reject':
        updateValues.paymentStatus = 'rejected';
        break;
      case 'mark_paid':
        updateValues.paymentStatus = 'paid';
        updateValues.paymentDate = new Date();
        if (paymentMethod) {
          updateValues.paymentMethod = paymentMethod;
        }
        break;
    }
    
    // Perform bulk update
    const updatedReimbursements = await db
      .update(reimbursements)
      .set(updateValues)
      .where(sql`${reimbursements.id} = ANY(${reimbursementIds})`)
      .returning();

    await auditLogger.log({
      action: 'reimbursements_bulk_processed',
      userId,
      organizationId,
      details: { 
        action,
        reimbursementCount: reimbursementIds.length,
        reimbursementIds
      }
    });
    
    res.json({
      message: `Successfully ${action}d ${updatedReimbursements.length} reimbursements`,
      processedReimbursements: updatedReimbursements
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: error.errors 
      });
    }
    
    console.error('Error bulk processing reimbursements:', error);
    res.status(500).json({ error: "Failed to bulk process reimbursements" });
  }
});

// Get eligible expenses for reimbursement
router.get('/expenses/eligible', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const organizationId = req.user.organizationId;
    const userId = req.user.userId;
    
    // Get approved expenses that are not yet in any reimbursement
    // First get all expense IDs that are already in reimbursements
    const reimbursedExpenseIds = await db
      .select({ expenseIds: reimbursements.expenseIds })
      .from(reimbursements)
      .where(eq(reimbursements.organizationId, organizationId));
    
    // Flatten the array of expense IDs
    const allReimbursedIds = reimbursedExpenseIds
      .filter(r => r.expenseIds && Array.isArray(r.expenseIds))
      .flatMap(r => r.expenseIds as string[]);
    
    // Get eligible expenses (approved and not in any reimbursement)
    let eligibleExpenses;
    if (allReimbursedIds.length > 0) {
      eligibleExpenses = await db
        .select({
          id: expenses.id,
          description: expenses.description,
          amount: expenses.amount,
          category: expenses.category,
          expenseDate: expenses.expenseDate,
          receiptUrl: expenses.receiptUrl,
          createdAt: expenses.createdAt,
        })
        .from(expenses)
        .where(and(
          eq(expenses.userId, userId),
          eq(expenses.status, 'approved'),
          sql`${expenses.id} NOT IN (${sql.join(allReimbursedIds.map(id => sql`${id}`), sql`, `)})`
        ))
        .orderBy(desc(expenses.expenseDate));
    } else {
      eligibleExpenses = await db
        .select({
          id: expenses.id,
          description: expenses.description,
          amount: expenses.amount,
          category: expenses.category,
          expenseDate: expenses.expenseDate,
          receiptUrl: expenses.receiptUrl,
          createdAt: expenses.createdAt,
        })
        .from(expenses)
        .where(and(
          eq(expenses.userId, userId),
          eq(expenses.status, 'approved')
        ))
        .orderBy(desc(expenses.expenseDate));
    }

    res.json({
      expenses: eligibleExpenses,
      totalAmount: eligibleExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
      count: eligibleExpenses.length
    });
  } catch (error) {
    console.error('Error fetching eligible expenses:', error);
    res.status(500).json({ error: "Failed to fetch eligible expenses" });
  }
});

// Get reimbursement analytics
router.get('/analytics/dashboard', async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(401).json({ error: "Organization membership required" });
    }

    const organizationId = req.user.organizationId;
    const userRole = req.user.role;
    
    // Only managers and admins can view analytics
    if (!['admin', 'manager'].includes(userRole)) {
      return res.status(403).json({ error: "Manager role required to view analytics" });
    }
    
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }
    
    // Get reimbursement stats
    const [totalStats] = await db
      .select({
        totalCount: count(),
        totalAmount: sql<number>`COALESCE(SUM(${reimbursements.totalAmount}), 0)`,
        avgAmount: sql<number>`COALESCE(AVG(${reimbursements.totalAmount}), 0)`,
      })
      .from(reimbursements)
      .where(and(
        eq(reimbursements.organizationId, organizationId),
        gte(reimbursements.createdAt, startDate)
      ));
    
    // Get status breakdown
    const statusBreakdown = await db
      .select({
        status: reimbursements.paymentStatus,
        count: count(),
        totalAmount: sql<number>`COALESCE(SUM(${reimbursements.totalAmount}), 0)`
      })
      .from(reimbursements)
      .where(and(
        eq(reimbursements.organizationId, organizationId),
        gte(reimbursements.createdAt, startDate)
      ))
      .groupBy(reimbursements.paymentStatus);
    
    // Get top submitters
    const topSubmitters = await db
      .select({
        userId: reimbursements.userId,
        submitterName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        count: count(),
        totalAmount: sql<number>`COALESCE(SUM(${reimbursements.totalAmount}), 0)`
      })
      .from(reimbursements)
      .leftJoin(users, eq(reimbursements.userId, users.id))
      .where(and(
        eq(reimbursements.organizationId, organizationId),
        gte(reimbursements.createdAt, startDate)
      ))
      .groupBy(reimbursements.userId, users.firstName, users.lastName)
      .orderBy(desc(count()))
      .limit(10);
    
    // Get daily trends
    const dailyTrends = await db
      .select({
        date: sql<string>`DATE(${reimbursements.createdAt})`,
        count: count(),
        totalAmount: sql<number>`COALESCE(SUM(${reimbursements.totalAmount}), 0)`
      })
      .from(reimbursements)
      .where(and(
        eq(reimbursements.organizationId, organizationId),
        gte(reimbursements.createdAt, startDate)
      ))
      .groupBy(sql`DATE(${reimbursements.createdAt})`)
      .orderBy(sql`DATE(${reimbursements.createdAt})`);

    res.json({
      summary: totalStats,
      statusBreakdown,
      topSubmitters,
      dailyTrends,
      period: {
        start: startDate,
        end: endDate,
        period
      }
    });
  } catch (error) {
    console.error('Error fetching reimbursement analytics:', error);
    res.status(500).json({ error: "Failed to fetch reimbursement analytics" });
  }
});

export default router;



