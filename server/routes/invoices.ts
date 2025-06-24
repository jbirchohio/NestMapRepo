import express, { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import { db } from '../db/db.js';
import { organizations } from '../db/schema.js';
import { invoices } from '../db/invoiceSchema.js';
import secureAuth from '../middleware/secureAuth.js';
import { requireOrganizationContext } from '../middleware/organization.js';
import { eq, and } from 'drizzle-orm';
import type { AuthenticatedRequest } from '../src/types/auth-user.js';
import { stripe } from '../stripe.js';
type AsyncRequestHandler<T = AuthenticatedRequest> = (req: T, res: Response, next: NextFunction) => Promise<void>;
// Define invoice schema types
interface Invoice {
    id: string;
    organizationId: string;
    status: string;
    amount: number;
}
interface InvoiceItem {
    id: string;
    invoiceId: string;
    description: string;
    amount: number;
}
const router = express.Router();
// Type guard to check if request is authenticated
function isAuthenticatedRequest(req: Request): boolean {
    const authReq = req as unknown as AuthenticatedRequest;
    return !!(authReq.user || authReq.organizationId);
}

// Helper function to wrap async route handlers
const asyncHandler = <T extends Request>(
    fn: (req: T, res: Response, next: NextFunction) => Promise<void> | void
): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = fn(req as unknown as T, res, next);
            if (result && typeof result.catch === 'function') {
                result.catch(next);
            }
            return;
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
    async (
        req: Request<{ id: string }>,
        res: Response,
        next: NextFunction
    ): Promise<Response | void> => {
    try {
        const authReq = req as unknown as AuthenticatedRequest;
        if (!authReq.organizationId) {
            return res.status(400).json({ error: 'Organization context required' });
        }
        const { id } = req.params;
        const [invoice] = await db
            .select()
            .from(invoices)
            .where(and(eq(invoices.id, id), eq(invoices.organizationId, authReq.organizationId)))
            .limit(1);

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Items are stored as JSONB in the invoice record
        return res.json({ ...invoice });
    } catch (error) {
        console.error('Error fetching invoice:', error);
        return next(error);
    }
});

// Pay invoice (Stripe Checkout Session)
router.post<{ id: string }>(
    '/:id/pay',
    async (
        req: Request<{ id: string }>,
        res: Response,
        next: NextFunction
    ): Promise<Response | void> => {
    try {
        const authReq = req as unknown as AuthenticatedRequest;
        if (!authReq.organizationId) {
            return res.status(400).json({ error: 'Organization context required' });
        }
        const { id } = req.params;
        // Verify invoice exists and belongs to the organization
        const [invoice] = await db
            .select()
            .from(invoices)
            .where(and(eq(invoices.id, id), eq(invoices.organizationId, authReq.organizationId)))
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
                            name: `Invoice #${invoice.number}`,
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
return res.json({ url: session.url });
    }
    catch (error) {
        console.error('Error creating payment session:', error);
        return next(error);
    }
});
// Webhook for Stripe payment (to mark invoice as paid)
// This should be in webhooks.ts, but reference here for completeness
// router.post('/webhook', ...)
export default router;
