import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

// Apply JWT authentication to all invoice routes
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

// GET /api/invoices - Get all invoices for user/organization
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    
    // Mock invoices data
    const invoices = [
      {
        id: 'inv-001',
        invoiceNumber: 'INV-2024-001',
        organizationId: user?.organizationId,
        status: 'pending',
        amount: 1299.99,
        currency: 'USD',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        issueDate: new Date().toISOString(),
        description: 'Business trip to New York - Flight and accommodation',
        lineItems: [
          { description: 'Flight: JFK ↔ LAX', amount: 599.99, quantity: 1 },
          { description: 'Hotel: 3 nights NYC', amount: 700.00, quantity: 3 },
        ],
        customer: {
          name: 'ACME Corporation',
          email: 'billing@acme.com',
          address: '123 Business Ave, NYC, NY 10001',
        },
      },
      {
        id: 'inv-002',
        invoiceNumber: 'INV-2024-002',
        organizationId: user?.organizationId,
        status: 'paid',
        amount: 750.50,
        currency: 'USD',
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        issueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
        paidDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        description: 'Conference attendance - Chicago',
        lineItems: [
          { description: 'Conference Registration', amount: 350.00, quantity: 1 },
          { description: 'Hotel: 2 nights Chicago', amount: 400.50, quantity: 2 },
        ],
        customer: {
          name: 'Tech Solutions Inc.',
          email: 'finance@techsolutions.com',
          address: '456 Innovation Dr, Chicago, IL 60601',
        },
      },
    ];

    logger.info(`Fetched ${invoices.length} invoices for user ${user?.userId}`);

    const response: ApiResponse<{ invoices: typeof invoices }> = {
      success: true,
      data: { invoices },
    };
    res.json(response);

  } catch (error) {
    logger.error('Get invoices error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to fetch invoices' },
    };
    res.status(500).json(response);
  }
});

// GET /api/invoices/:id - Get specific invoice
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Mock invoice details
    const invoice = {
      id: id,
      invoiceNumber: 'INV-2024-001',
      organizationId: req.user?.organizationId,
      status: 'pending',
      amount: 1299.99,
      currency: 'USD',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      issueDate: new Date().toISOString(),
      description: 'Business trip to New York - Flight and accommodation',
      lineItems: [
        { description: 'Flight: JFK ↔ LAX', amount: 599.99, quantity: 1 },
        { description: 'Hotel: 3 nights NYC', amount: 700.00, quantity: 3 },
      ],
      customer: {
        name: 'ACME Corporation',
        email: 'billing@acme.com',
        address: '123 Business Ave, NYC, NY 10001',
        phone: '+1 (555) 123-4567',
      },
      subtotal: 1299.99,
      tax: 0.00,
      total: 1299.99,
      paymentTerms: 'Net 30',
      notes: 'Thank you for your business!',
    };

    const response: ApiResponse<typeof invoice> = {
      success: true,
      data: invoice,
    };
    res.json(response);

  } catch (error) {
    logger.error('Get invoice details error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to fetch invoice details' },
    };
    res.status(500).json(response);
  }
});

// POST /api/invoices/:id/pay - Process invoice payment
router.post('/:invoiceId/pay', async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const paymentSchema = z.object({
      paymentMethod: z.string().min(1),
      cardNumber: z.string().optional(),
      expiryDate: z.string().optional(),
      cvv: z.string().optional(),
      billingAddress: z.object({
        street: z.string(),
        city: z.string(),
        state: z.string(),
        zipCode: z.string(),
        country: z.string(),
      }).optional(),
    });

    const paymentData = paymentSchema.parse(req.body);
    const user = req.user;

    // Mock payment processing
    const payment = {
      id: 'payment-' + Date.now(),
      invoiceId: invoiceId,
      amount: 1299.99,
      currency: 'USD',
      status: 'completed',
      paymentMethod: paymentData.paymentMethod,
      processedAt: new Date().toISOString(),
      transactionId: 'txn_' + Math.random().toString(36).substr(2, 9),
    };

    logger.info(`Payment processed for invoice ${invoiceId}: ${payment.id} by user ${user?.userId}`);

    const response: ApiResponse<typeof payment> = {
      success: true,
      data: payment,
    };
    res.json(response);

  } catch (error) {
    logger.error('Process payment error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid payment data', details: error.errors },
      });
    }

    const response: ApiResponse = {
      success: false,
      error: { message: 'Payment processing failed' },
    };
    res.status(500).json(response);
  }
});

// POST /api/invoices/:id/mark-paid - Mark invoice as paid (admin only)
router.post('/:id/mark-paid', requireRole(['admin', 'superadmin_owner', 'superadmin_staff']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Mock marking invoice as paid
    const updatedInvoice = {
      id: id,
      status: 'paid',
      paidDate: new Date().toISOString(),
      updatedBy: user?.userId,
    };

    logger.info(`Invoice ${id} marked as paid by user ${user?.userId}`);

    const response: ApiResponse<typeof updatedInvoice> = {
      success: true,
      data: updatedInvoice,
    };
    res.json(response);

  } catch (error) {
    logger.error('Mark invoice paid error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to mark invoice as paid' },
    };
    res.status(500).json(response);
  }
});

// POST /api/invoices/:id/send - Send invoice to customer
router.post('/:id/send', requireRole(['admin', 'manager', 'superadmin_owner', 'superadmin_staff']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Mock sending invoice
    const sentInvoice = {
      id: id,
      status: 'sent',
      sentDate: new Date().toISOString(),
      sentBy: user?.userId,
      recipient: 'billing@acme.com',
    };

    logger.info(`Invoice ${id} sent by user ${user?.userId}`);

    const response: ApiResponse<typeof sentInvoice> = {
      success: true,
      data: sentInvoice,
    };
    res.json(response);

  } catch (error) {
    logger.error('Send invoice error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to send invoice' },
    };
    res.status(500).json(response);
  }
});

// POST /api/invoices - Create new invoice (admin only)
router.post('/', requireRole(['admin', 'manager', 'superadmin_owner', 'superadmin_staff']), async (req: Request, res: Response) => {
  try {
    const invoiceSchema = z.object({
      description: z.string().min(1),
      amount: z.number().positive(),
      currency: z.string().length(3).default('USD'),
      dueDate: z.string(),
      customer: z.object({
        name: z.string().min(1),
        email: z.string().email(),
        address: z.string().optional(),
      }),
      lineItems: z.array(z.object({
        description: z.string(),
        amount: z.number().positive(),
        quantity: z.number().positive().default(1),
      })),
    });

    const invoiceData = invoiceSchema.parse(req.body);
    const user = req.user;

    // Mock invoice creation
    const newInvoice = {
      id: 'inv-' + Date.now(),
      invoiceNumber: `INV-2024-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      organizationId: user?.organizationId,
      status: 'draft',
      ...invoiceData,
      issueDate: new Date().toISOString(),
      createdBy: user?.userId,
    };

    logger.info(`New invoice created: ${newInvoice.id} by user ${user?.userId}`);

    const response: ApiResponse<typeof newInvoice> = {
      success: true,
      data: newInvoice,
    };
    res.status(201).json(response);

  } catch (error) {
    logger.error('Create invoice error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid invoice data', details: error.errors },
      });
    }

    const response: ApiResponse = {
      success: false,
      error: { message: 'Failed to create invoice' },
    };
    res.status(500).json(response);
  }
});

export default router;