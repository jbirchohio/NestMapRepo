import { Router } from 'express';
import { db } from '../db';
import { expenses, expenseReceipts, mileageTracking, reimbursements } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { expenseManagementService } from '../services/expenseManagementService';
import { jwtAuthMiddleware } from '../middleware/jwtAuth';
import { requireOrganizationContext } from '../organizationContext';
import multer from 'multer';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Apply auth and organization context to all routes
router.use(jwtAuthMiddleware);
router.use(requireOrganizationContext);

// Get user's expenses
router.get('/', async (req, res) => {
  try {
    if (!req.organizationContext?.id || !req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const userExpenses = await db.select()
      .from(expenses)
      .where(
        and(
          eq(expenses.organization_id, req.organizationContext.id),
          eq(expenses.user_id, req.user.id)
        )
      )
      .orderBy(desc(expenses.transaction_date));

    res.json(userExpenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// Create new expense
router.post('/', async (req, res) => {
  try {
    if (!req.organizationContext?.id || !req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const result = await expenseManagementService.createExpense({
      ...req.body,
      organization_id: req.organizationContext.id,
      user_id: req.user.id
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// Upload receipt with OCR
router.post('/:expenseId/receipt', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.organizationContext?.id || !req.user || !req.file) {
      return res.status(400).json({ error: 'Receipt file required' });
    }

    const expenseId = parseInt(req.params.expenseId);

    // Verify expense belongs to user
    const [expense] = await db.select()
      .from(expenses)
      .where(
        and(
          eq(expenses.id, expenseId),
          eq(expenses.organization_id, req.organizationContext.id),
          eq(expenses.user_id, req.user.id)
        )
      );

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Process receipt with OCR
    const receipt = await expenseManagementService.processReceipt(
      {
        expense_id: expenseId,
        organization_id: req.organizationContext.id,
        file_url: `/receipts/${expenseId}/${req.file.originalname}`, // Would be S3 URL in production
        file_type: req.file.mimetype,
        file_size: req.file.size
      },
      req.file.buffer
    );

    res.json(receipt);
  } catch (error) {
    console.error('Error processing receipt:', error);
    res.status(500).json({ error: 'Failed to process receipt' });
  }
});

// Track mileage
router.post('/mileage', async (req, res) => {
  try {
    if (!req.organizationContext?.id || !req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const tracking = await expenseManagementService.trackMileage(
      {
        ...req.body,
        organization_id: req.organizationContext.id,
        user_id: req.user.id,
        expense_id: 0 // Will be set after expense creation
      },
      req.body.autoCalculate !== false
    );

    res.status(201).json(tracking);
  } catch (error) {
    console.error('Error tracking mileage:', error);
    res.status(500).json({ error: 'Failed to track mileage' });
  }
});

// Get expense analytics
router.get('/analytics', async (req, res) => {
  try {
    if (!req.organizationContext?.id) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const analytics = await expenseManagementService.getExpenseAnalytics(
      req.organizationContext.id,
      new Date(req.query.startDate as string),
      new Date(req.query.endDate as string),
      req.query.groupBy as any
    );

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Request reimbursement
router.post('/reimbursement', async (req, res) => {
  try {
    if (!req.organizationContext?.id || !req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const reimbursement = await expenseManagementService.createReimbursement(
      req.organizationContext.id,
      req.user.id,
      req.body.expenseIds
    );

    res.status(201).json(reimbursement);
  } catch (error) {
    console.error('Error creating reimbursement:', error);
    res.status(500).json({ error: 'Failed to create reimbursement' });
  }
});

// Check budget compliance
router.post('/budget-check', async (req, res) => {
  try {
    if (!req.organizationContext?.id) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const result = await expenseManagementService.checkBudgetCompliance(
      req.organizationContext.id,
      {
        ...req.body,
        userId: req.user?.id
      }
    );

    res.json(result);
  } catch (error) {
    console.error('Error checking budget:', error);
    res.status(500).json({ error: 'Failed to check budget' });
  }
});

// Get receipts for an expense
router.get('/:expenseId/receipts', async (req, res) => {
  try {
    if (!req.organizationContext?.id) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const receipts = await db.select()
      .from(expenseReceipts)
      .where(
        and(
          eq(expenseReceipts.expense_id, parseInt(req.params.expenseId)),
          eq(expenseReceipts.organization_id, req.organizationContext.id)
        )
      );

    res.json(receipts);
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

// Approve/reject expense (for managers)
router.post('/:expenseId/approve', async (req, res) => {
  try {
    if (!req.organizationContext?.id || !req.user) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    // Check if user has permission
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const [updated] = await db.update(expenses)
      .set({
        approval_status: req.body.status, // 'approved' or 'rejected'
        approved_by: req.user.id,
        approved_at: new Date(),
        rejection_reason: req.body.reason
      })
      .where(
        and(
          eq(expenses.id, parseInt(req.params.expenseId)),
          eq(expenses.organization_id, req.organizationContext.id)
        )
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error approving expense:', error);
    res.status(500).json({ error: 'Failed to approve expense' });
  }
});

export default router;