import express, { Response, NextFunction, RequestHandler, Router } from 'express';
import type { ParamsDictionary, Request } from 'express-serve-static-core.js';
import type { ParsedQs } from 'qs.js';


import { db } from '../db/db.js';
import { organizations } from '../db/schema.js';
import { invoices } from '../db/invoiceSchema.js';
import secureAuth from '../middleware/secureAuth.js';
import { requireOrganizationContext } from '../middleware/organization.js';
import { eq, and } from 'drizzle-orm';
import type { User } from '../types/user.js';
import type { AuthenticatedRequest } from '../src/types/auth-user.js';
import { stripe } from '../stripe.js';

type AsyncRequestHandler<T = Request> = (req: T, res: Response, next: NextFunction) => Promise<void>;

// Define invoice schema types
interface Invoice {
  id: string;
  organizationId: string;
  status: string;
  amount: number;
  // Add other invoice fields as needed
}

interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  amount: number;
}

const router = express.Router();

// Type guard to check if request is authenticated
function isAuthenticatedRequest(req: Request): req is AuthenticatedRequest {
  const authReq = req as AuthenticatedRequest;
  return !!(authReq.user || authReq.token || authReq.organizationId);
}

// Helper function to wrap async route handlers
const asyncHandler = <T extends Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void> | void
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = fn(req as T, res, next);
      if (result && typeof result.catch === 'function') {
        result.catch(next);
      }
    } catch (err) {
      next(err);
    }
  };
};

// Apply JWT authentication middleware
router.use((req: Request, res: Response, next: NextFunction) => {
  return secureAuth.authenticate(req, res, next);
});

// Apply organization context middleware
router.use((req: Request, res: Response, next: NextFunction) => {
  return requireOrganizationContext(req, res, next);
});

// Helper function to handle database queries
async function getOrganization(organizationId: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId));
  
  if (!org) {
    throw new Error('Organization not found');
  }
  
  return org;
}

// Get invoice by ID
router.get<{ id: string }>(
  '/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.organizationId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const { id } = authReq.params;
    
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.id, id),
          eq(invoices.organizationId, authReq.organizationId)
        )
      )
      .limit(1);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Items are stored as JSONB in the invoice record
    res.json({ ...invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    next(error);
  }
});

// Pay invoice (Stripe Checkout Session)
router.post<{ id: string }>('/:id/pay', async (req: AuthenticatedRequest<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    
    if (!authReq.organizationId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const { id } = authReq.params;
    
    // Verify invoice exists and belongs to the organization
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.id, id),
          eq(invoices.organizationId, authReq.organizationId)
        )
      )
      .limit(1);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Invoice already paid' });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice #${invoice.invoiceNumber}`,
              description: invoice.description || 'NestMap Pro Subscription',
            },
            unit_amount: invoice.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/invoices/${invoice.id}?payment=success`,
      cancel_url: `${process.env.FRONTEND_URL}/invoices/${invoice.id}?payment=cancelled`,
      client_reference_id: invoice.id,
      metadata: {
        invoice_id: invoice.id,
        organization_id: authReq.organizationId,
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating payment session:', error);
    next(error);
  }
});

// Webhook for Stripe payment (to mark invoice as paid)
// This should be in webhooks.ts, but reference here for completeness
// router.post('/webhook', ...)

export default router;
