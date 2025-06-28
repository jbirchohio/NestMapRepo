/// <reference types="node" />
import { db } from '../db/db.js';
import { invoices } from '../db/schema/billing/invoices.js';
import { eq } from 'drizzle-orm';
import type { Invoice, NewInvoice } from '../db/schema/billing/invoices.js';
import dotenv from 'dotenv';
import { stripe } from '../stripe.js';

dotenv.config();

// Extend the Invoice type to include our test data
interface TestInvoice extends Omit<Partial<Invoice>, 'id' | 'createdAt' | 'updatedAt'> {
  id?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  lines?: Array<{
    id: string;
    amount: number;
    currency: string;
    description: string;
    metadata: Record<string, unknown>;
  }>;
}
async function testPaymentFlow() {
    try {
        console.log('Starting payment flow test...');
        // 1. Create a test invoice
        console.log('Creating test invoice...');
        const now = new Date();
        const testInvoice: TestInvoice = {
            id: `test-${Date.now()}`,
            number: `INV-${Date.now()}`,
            organizationId: 'test-org',
            status: 'draft',
            amountDue: '1000.00',
            amountPaid: '0.00',
            amountRemaining: '1000.00',
            currency: 'usd',
            description: 'Test Invoice',
            lines: [
                {
                    id: `item-${Date.now()}`,
                    amount: 1000,
                    currency: 'usd',
                    description: 'Test Item',
                    metadata: {}
                }
            ],
            metadata: {
                test: true,
                clientName: 'Test Client',
                clientEmail: 'test@example.com'
            },
            createdAt: now,
            updatedAt: now,
        };
        // Insert test invoice into database
        const [invoice] = await db.insert(invoices).values({
            id: testInvoice.id,
            number: testInvoice.number,
            organizationId: testInvoice.organizationId,
            status: testInvoice.status,
            amountDue: testInvoice.amountDue,
            amountPaid: testInvoice.amountPaid,
            amountRemaining: testInvoice.amountRemaining,
            currency: testInvoice.currency,
            description: testInvoice.description,
            lines: testInvoice.lines,
            metadata: testInvoice.metadata,
            dueDate: testInvoice.dueDate ? new Date(testInvoice.dueDate) : null,
            paidAt: testInvoice.paidAt ? new Date(testInvoice.paidAt) : null,
            stripeInvoiceId: testInvoice.stripeInvoiceId || null,
            invoicePdf: testInvoice.invoicePdf || null,
            createdAt: testInvoice.createdAt ? new Date(testInvoice.createdAt) : now,
            updatedAt: testInvoice.updatedAt ? new Date(testInvoice.updatedAt) : now,
        } as NewInvoice).returning();
        console.log('Created test invoice:', invoice);
        // 2. Create Stripe checkout session
        console.log('Creating Stripe checkout session...');
        const lineItems = Array.isArray(invoice.lines) ? invoice.lines.map(line => ({
            price_data: {
                currency: invoice.currency || 'usd',
                product_data: {
                    name: line.description || `Item from Invoice #${invoice.number}`,
                    description: line.description
                },
                unit_amount: line.amount,
            },
            quantity: 1,
        })) : [];

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invoice/success?invoice_id=${invoice.id}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invoice/failure?invoice_id=${invoice.id}`,
            metadata: {
                invoiceId: invoice.id,
                organizationId: invoice.organizationId,
                ...(typeof invoice.metadata === 'object' ? invoice.metadata : {})
            },
        });
        
        console.log('Created Stripe session:', {
            id: session.id,
            url: session.url
        });

        // 3. Update invoice with payment URL in metadata
        const updatedMetadata = {
            ...(typeof invoice.metadata === 'object' ? invoice.metadata : {}),
            paymentUrl: session.url,
            stripeSessionId: session.id
        };

        await db.update(invoices)
            .set({
                metadata: updatedMetadata,
                updatedAt: new Date(),
            })
            .where(eq(invoices.id, invoice.id));
        console.log('Test payment flow completed successfully!');
        console.log('You can now open the checkout URL in your browser to test the payment flow.');
        return {
            invoiceId: invoice.id,
            checkoutUrl: session.url,
            sessionId: session.id
        };
    }
    catch (error) {
        console.error('Error in payment flow test:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
}
// Run the test
if (require.main === module) {
    testPaymentFlow()
        .then(() => {
        console.log('Test completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    });
}
export { testPaymentFlow };
