import { Router, Request, Response } from 'express';
import { db } from '../db';
import { validateJWT } from '../middleware/jwtAuth';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext';
import { invoices } from '../db/invoiceSchema';
import { stripe } from '../stripe';
import { eq } from 'drizzle-orm';
import { InvoiceItem } from '../types/invoice';

const router = Router();

// Apply middleware to all routes
router.use(validateJWT);
router.use(injectOrganizationContext);
router.use(validateOrganizationAccess);

// Get invoice by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to fetch invoice', details: err.message });
  }
});

// Pay invoice (Stripe Checkout Session)
router.post('/:id/pay', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status === 'paid') return res.status(400).json({ error: 'Invoice already paid' });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: invoice.stripeCustomerId, // Ensure this is present
      line_items: (invoice.items as InvoiceItem[])?.map(item => ({
        price_data: {
          currency: invoice.currency || 'usd',
          product_data: {
            name: item.description || `Item from Invoice #${invoice.number}`,
          },
          unit_amount: item.unitPrice,
        },
        quantity: item.quantity,
      })) || [{
        price_data: {
          currency: invoice.currency || 'usd',
          product_data: {
            name: invoice.description || `Invoice #${invoice.number}`,
          },
          unit_amount: invoice.amountDue,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invoice/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invoice/failure?invoice_id=${invoice.id}`,
      metadata: {
        invoiceId: invoice.id,
      },
    });

    // Update invoice payment URL
    await db
      .update(invoices)
      .set({
        paymentUrl: session.url,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id));

    res.json({ url: session.url });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to initiate payment', details: err.message });
  }
});

// Webhook for Stripe payment (to mark invoice as paid)
// This should be in webhooks.ts, but reference here for completeness
// router.post('/webhook', ...)

export default router;
