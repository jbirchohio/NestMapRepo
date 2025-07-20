import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

// Apply JWT authentication to all corporate card routes
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

// GET /api/corporate-cards/cards - Get all cards for organization
router.get('/cards', requireRole(['admin', 'manager', 'superadmin_owner', 'superadmin_staff']), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    
    // Mock corporate cards data
    const cards = [
      {
        id: 'card-001',
        organizationId: user?.organizationId,
        cardNumber: '**** **** **** 1234',
        cardType: 'business',
        status: 'active',
        balance: 5000.00,
        currency: 'USD',
        limit: 10000.00,
        holder: {
          name: 'John Doe',
          email: 'john.doe@company.com',
          department: 'Sales',
        },
        issueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        expiryDate: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 3 years from now
        lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        monthlySpend: 1250.75,
      },
      {
        id: 'card-002',
        organizationId: user?.organizationId,
        cardNumber: '**** **** **** 5678',
        cardType: 'business',
        status: 'active',
        balance: 2500.00,
        currency: 'USD',
        limit: 5000.00,
        holder: {
          name: 'Jane Smith',
          email: 'jane.smith@company.com',
          department: 'Marketing',
        },
        issueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
        expiryDate: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 3 years from now
        lastUsed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        monthlySpend: 675.50,
      },
    ];

    logger.info(`Fetched ${cards.length} corporate cards for organization ${user?.organizationId}`);

    const response: ApiResponse<{ cards: typeof cards }> = {
      success: true,
      data: { cards },
    };
    res.json(response);

  } catch (error) {
    logger.error('Get corporate cards error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to fetch corporate cards' },
    };
    res.status(500).json(response);
  }
});

// GET /api/corporate-cards/cards/:cardId - Get specific card details
router.get('/cards/:cardId', async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;
    const user = req.user;
    
    // Mock card details
    const card = {
      id: cardId,
      organizationId: user?.organizationId,
      cardNumber: '**** **** **** 1234',
      cardType: 'business',
      status: 'active',
      balance: 5000.00,
      currency: 'USD',
      limit: 10000.00,
      availableBalance: 5000.00,
      holder: {
        name: 'John Doe',
        email: 'john.doe@company.com',
        department: 'Sales',
        userId: 'user-123',
      },
      issueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      expiryDate: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      monthlySpend: 1250.75,
      yearlySpend: 15600.50,
      recentTransactions: [
        {
          id: 'txn-001',
          amount: 125.50,
          currency: 'USD',
          description: 'Business lunch with client',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          category: 'Meals',
          status: 'completed',
        },
        {
          id: 'txn-002',
          amount: 450.00,
          currency: 'USD',
          description: 'Flight booking - NYC to Chicago',
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          category: 'Travel',
          status: 'completed',
        },
      ],
    };

    const response: ApiResponse<typeof card> = {
      success: true,
      data: card,
    };
    res.json(response);

  } catch (error) {
    logger.error('Get corporate card details error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to fetch card details' },
    };
    res.status(500).json(response);
  }
});

// POST /api/corporate-cards/cards/:cardId/add-funds - Add funds to card
router.post('/cards/:cardId/add-funds', requireRole(['admin', 'manager', 'superadmin_owner', 'superadmin_staff']), async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;
    const fundsSchema = z.object({
      amount: z.number().positive(),
    });

    const { amount } = fundsSchema.parse(req.body);
    const user = req.user;

    // Mock adding funds
    const transaction = {
      id: 'fund-' + Date.now(),
      cardId: cardId,
      type: 'credit',
      amount: amount,
      currency: 'USD',
      description: 'Funds added by admin',
      processedAt: new Date().toISOString(),
      processedBy: user?.userId,
      newBalance: 5000.00 + amount, // Mock calculation
    };

    logger.info(`Funds added to card ${cardId}: $${amount} by user ${user?.userId}`);

    const response: ApiResponse<typeof transaction> = {
      success: true,
      data: transaction,
    };
    res.json(response);

  } catch (error) {
    logger.error('Add funds error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid amount', details: error.errors },
      });
    }

    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to add funds' },
    };
    res.status(500).json(response);
  }
});

// POST /api/corporate-cards/cards/:cardId/freeze - Freeze/unfreeze card
router.post('/cards/:cardId/freeze', requireRole(['admin', 'manager', 'superadmin_owner', 'superadmin_staff']), async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;
    const freezeSchema = z.object({
      freeze: z.boolean().default(true),
      reason: z.string().optional(),
    });

    const { freeze, reason } = freezeSchema.parse(req.body);
    const user = req.user;

    // Mock card status update
    const statusUpdate = {
      cardId: cardId,
      previousStatus: 'active',
      newStatus: freeze ? 'frozen' : 'active',
      action: freeze ? 'freeze' : 'unfreeze',
      reason: reason || (freeze ? 'Security freeze' : 'Unfrozen by admin'),
      processedAt: new Date().toISOString(),
      processedBy: user?.userId,
    };

    logger.info(`Card ${cardId} ${freeze ? 'frozen' : 'unfrozen'} by user ${user?.userId}`);

    const response: ApiResponse<typeof statusUpdate> = {
      success: true,
      data: statusUpdate,
    };
    res.json(response);

  } catch (error) {
    logger.error('Card freeze/unfreeze error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid freeze data', details: error.errors },
      });
    }

    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to update card status' },
    };
    res.status(500).json(response);
  }
});

// POST /api/corporate-cards/cards/:cardId/unfreeze - Unfreeze card (separate endpoint for clarity)
router.post('/cards/:cardId/unfreeze', requireRole(['admin', 'manager', 'superadmin_owner', 'superadmin_staff']), async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;
    const user = req.user;

    // Mock card unfreeze
    const statusUpdate = {
      cardId: cardId,
      previousStatus: 'frozen',
      newStatus: 'active',
      action: 'unfreeze',
      reason: 'Unfrozen by admin',
      processedAt: new Date().toISOString(),
      processedBy: user?.userId,
    };

    logger.info(`Card ${cardId} unfrozen by user ${user?.userId}`);

    const response: ApiResponse<typeof statusUpdate> = {
      success: true,
      data: statusUpdate,
    };
    res.json(response);

  } catch (error) {
    logger.error('Card unfreeze error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to unfreeze card' },
    };
    res.status(500).json(response);
  }
});

// PUT /api/corporate-cards/cards/:cardId - Update card settings
router.put('/cards/:cardId', requireRole(['admin', 'manager', 'superadmin_owner', 'superadmin_staff']), async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;
    const updateSchema = z.object({
      limit: z.number().positive().optional(),
      holder: z.object({
        name: z.string().optional(),
        department: z.string().optional(),
      }).optional(),
    });

    const updateData = updateSchema.parse(req.body);
    const user = req.user;

    // Mock card update
    const updatedCard = {
      id: cardId,
      ...updateData,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.userId,
    };

    logger.info(`Card ${cardId} updated by user ${user?.userId}`);

    const response: ApiResponse<typeof updatedCard> = {
      success: true,
      data: updatedCard,
    };
    res.json(response);

  } catch (error) {
    logger.error('Update card error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid update data', details: error.errors },
      });
    }

    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to update card' },
    };
    res.status(500).json(response);
  }
});

export default router;