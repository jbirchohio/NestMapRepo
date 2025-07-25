import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Apply JWT authentication to all approval routes
router.use(authenticateJWT);

// Type for API response to ensure consistency
type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: any;
  };
};

// GET /api/approvals/pending
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    
    // Mock pending approvals
    const pendingApprovals = [
      {
        id: 'approval-1',
        type: 'trip_booking',
        title: 'Business Trip to New York',
        requestedBy: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john.doe@company.com',
        },
        amount: 1299.99,
        currency: 'USD',
        requestDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        status: 'pending',
        priority: 'medium',
        details: {
          destination: 'New York, NY',
          dates: '2024-02-15 to 2024-02-18',
          purpose: 'Client meetings and conference',
        },
      },
      {
        id: 'approval-2',
        type: 'expense_reimbursement',
        title: 'Conference Expenses',
        requestedBy: {
          id: 'user-456',
          name: 'Jane Smith',
          email: 'jane.smith@company.com',
        },
        amount: 450.00,
        currency: 'USD',
        requestDate: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        status: 'pending',
        priority: 'low',
        details: {
          category: 'Professional Development',
          description: 'Tech conference attendance and meals',
        },
      },
    ];

    logger.info(`Fetched ${pendingApprovals.length} pending approvals for user ${user?.userId}`);

    const response: ApiResponse<{ approvals: typeof pendingApprovals }> = {
      success: true,
      data: { approvals: pendingApprovals },
    };
    res.json(response);

  } catch (error) {
    logger.error('Get pending approvals error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to fetch pending approvals' },
    };
    res.status(500).json(response);
  }
});

// GET /api/approvals/rules
router.get('/rules', async (_req: Request, res: Response) => {
  try {
    // Mock approval rules
    const approvalRules = [
      {
        id: 'rule-1',
        name: 'Trip Booking Approval',
        type: 'trip_booking',
        conditions: [
          { field: 'amount', operator: 'greater_than', value: 1000 },
        ],
        approvers: [
          { role: 'manager', required: true },
          { role: 'finance_admin', required: false },
        ],
        description: 'All trip bookings over $1000 require manager approval',
      },
      {
        id: 'rule-2',
        name: 'Expense Reimbursement',
        type: 'expense_reimbursement',
        conditions: [
          { field: 'amount', operator: 'greater_than', value: 500 },
        ],
        approvers: [
          { role: 'manager', required: true },
        ],
        description: 'Expense reimbursements over $500 require manager approval',
      },
    ];

    const response: ApiResponse<{ rules: typeof approvalRules }> = {
      success: true,
      data: { rules: approvalRules },
    };
    res.json(response);

  } catch (error) {
    logger.error('Get approval rules error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to fetch approval rules' },
    };
    res.status(500).json(response);
  }
});

// POST /api/approvals/:requestId/decision
router.post('/:requestId/decision', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const decisionSchema = z.object({
      decision: z.enum(['approve', 'reject']),
      comment: z.string().optional(),
    });

    const { decision, comment } = decisionSchema.parse(req.body);
    const user = req.user;

    // Mock decision processing
    const approvalDecision = {
      id: requestId,
      decision,
      comment,
      decidedBy: {
        id: user?.userId,
        email: user?.email,
      },
      decidedAt: new Date().toISOString(),
      status: decision === 'approve' ? 'approved' : 'rejected',
    };

    logger.info(`Approval decision for ${requestId}: ${decision} by user ${user?.userId}`);

    const response: ApiResponse<typeof approvalDecision> = {
      success: true,
      data: approvalDecision,
    };
    res.json(response);

  } catch (error) {
    logger.error('Approval decision error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid decision data', details: error.errors },
      });
    }

    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to process approval decision' },
    };
    res.status(500).json(response);
  }
});

// GET /api/approvals/:requestId
router.get('/:requestId', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    
    // Mock approval details
    const approval = {
      id: requestId,
      type: 'trip_booking',
      title: 'Business Trip to New York',
      requestedBy: {
        id: 'user-123',
        name: 'John Doe',
        email: 'john.doe@company.com',
      },
      amount: 1299.99,
      currency: 'USD',
      requestDate: new Date(Date.now() - 86400000).toISOString(),
      status: 'pending',
      priority: 'medium',
      details: {
        destination: 'New York, NY',
        dates: '2024-02-15 to 2024-02-18',
        purpose: 'Client meetings and conference',
        itinerary: [
          { date: '2024-02-15', activity: 'Travel to NYC' },
          { date: '2024-02-16', activity: 'Client meetings' },
          { date: '2024-02-17', activity: 'Conference attendance' },
          { date: '2024-02-18', activity: 'Return travel' },
        ],
      },
      approvalHistory: [],
    };

    const response: ApiResponse<typeof approval> = {
      success: true,
      data: approval,
    };
    res.json(response);

  } catch (error) {
    logger.error('Get approval details error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to fetch approval details' },
    };
    res.status(500).json(response);
  }
});

export default router;