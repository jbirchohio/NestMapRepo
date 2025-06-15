/// <reference types="node" />

import { db } from '../db/db';
import { invoices } from '../db/invoiceSchema';
import { eq } from 'drizzle-orm';
import type { Invoice, InvoiceItem } from '../types/invoice';
import dotenv from 'dotenv';
import { stripe } from '../stripe';

dotenv.config();

dotenv.config();

// Use the existing Stripe client from ../stripe

async function testPaymentFlow() {
  try {
    console.log('Starting payment flow test...');
    
    // 1. Create a test invoice
    console.log('Creating test invoice...');
    const testInvoice: Partial<Invoice> = {
      id: `test-${Date.now()}`,
      number: `INV-${Date.now()}`,
      organizationId: 'test-org',
      clientName: 'Test Client',
      clientEmail: 'test@example.com',
      status: 'draft',
      amountDue: 1000,
      amount: 1000,
      currency: 'usd',
      description: 'Test Invoice',
      items: [
        {
          description: 'Test Item',
          quantity: 1,
          unitPrice: 1000,
          amount: 1000,
        }
      ],
      metadata: {
        test: true
      },
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert test invoice into database
    const [invoice] = await db.insert(invoices).values({
      number: testInvoice.number,
      organizationId: testInvoice.organizationId,
      clientName: testInvoice.clientName,
      clientEmail: testInvoice.clientEmail,
      status: testInvoice.status,
      amountDue: testInvoice.amountDue,
      amount: testInvoice.amount,
      currency: testInvoice.currency,
      description: testInvoice.description,
      items: testInvoice.items,
      notes: testInvoice.notes || null,
      metadata: testInvoice.metadata || null,
      proposalId: null,
      createdById: null,
      dueDate: null,
      paidAt: null,
      viewedAt: null,
      sentAt: null,
      cancelledAt: null,
      refundedAt: null,
      stripeInvoiceId: null,
      stripeCustomerId: null,
      paymentIntentId: null,
      paymentUrl: null,
      createdAt: testInvoice.createdAt,
      updatedAt: testInvoice.updatedAt,
    }).returning();

    console.log('Created test invoice:', invoice);

    // 2. Create Stripe checkout session
    console.log('Creating Stripe checkout session...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: (invoice.items || []).map((item: InvoiceItem) => ({
        price_data: {
          currency: invoice.currency || 'usd',
          product_data: {
            name: item.description || `Item from Invoice #${invoice.number}`,
            description: item.description
          },
          unit_amount: item.unitPrice
        },
        quantity: item.quantity
      })),
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invoice/success?invoice_id=${invoice.id}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invoice/failure?invoice_id=${invoice.id}`,
      metadata: {
        invoiceId: invoice.id,
        ...invoice.metadata
      },
    });

    console.log('Created Stripe session:', {
      id: session.id,
      url: session.url
    });

    // 3. Update invoice with payment URL
    await db.update(invoices)
      .set({
        paymentUrl: session.url,
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
  } catch (error) {
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
