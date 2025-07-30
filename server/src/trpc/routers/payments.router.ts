import { z } from 'zod';
import { router, protectedProcedure, organizationProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import type Stripe from 'stripe';
import { stripe } from '../../stripe';
import { db } from '../../db/db';
import { invoices } from '../../db/invoiceSchema';
import { billingEvents } from '../../db/superadminSchema';
import { eq, and } from '../../utils/drizzle-shim';
import { logger } from '../../utils/logger.js';
import type { Invoice } from '../../db/db';

// Type definitions for payment session
type PaymentSession = Stripe.Checkout.Session & {
  payment_intent?: string | Stripe.PaymentIntent;
  customer_details?: {
    name?: string;
    email?: string;
  };
  invoice?: {
    invoice_pdf?: string;
  };
  client_reference_id?: string;
  payment_status?: string;
  amount_total?: number;
  currency?: string;
  payment_method_types?: string[];
};

interface PaymentDetails {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  created: number;
  receipt_url: string | null;
  billing_details: {
    name?: string;
    email?: string;
  };
}

export const paymentsRouter = router({
  // Get payment session details
  getSession: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const { sessionId } = input;
        const session = (await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['payment_intent', 'invoice'],
        })) as PaymentSession;

        // Verify the session belongs to the user's organization
        if (session.client_reference_id !== ctx.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to view this payment session',
          });
        }

        return session;
      } catch (error) {
        logger.error('Error fetching payment session:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch payment session',
        });
      }
    }),

  // Create a payment intent
  createPaymentIntent: organizationProcedure
    .input(z.object({
      amount: z.number().int().positive(),
      currency: z.string().default('usd'),
      description: z.string().optional(),
      metadata: z.record(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { amount, currency, description, metadata } = input;
        
        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency,
          description,
          metadata: {
            organizationId: ctx.organizationId,
            ...metadata,
          },
        });

        return {
          clientSecret: paymentIntent.client_secret,
        };
      } catch (error) {
        logger.error('Error creating payment intent:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create payment intent',
        });
      }
    }),

  // Handle successful payment webhook
  handleSuccessfulPayment: protectedProcedure
    .input(z.object({
      paymentIntentId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { paymentIntentId } = input;
        
        // Verify the payment intent
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (!paymentIntent.metadata.organizationId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid payment intent',
          });
        }

        // Verify organization access
        if (paymentIntent.metadata.organizationId !== ctx.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to confirm this payment',
          });
        }

        // Update the invoice status in the database
        const updatedInvoice = await db.update(invoices)
          .set({ 
            status: 'paid',
            paidAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(
            eq(invoices.paymentIntentId, paymentIntentId),
            eq(invoices.organizationId, ctx.organizationId)
          ))
          .returning();

        if (!updatedInvoice.length) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Invoice not found for this payment',
          });
        }

        // Log the billing event
        await db.insert(billingEvents).values({
          organizationId: ctx.organizationId,
          eventType: 'payment_succeeded',
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          metadata: {
            paymentIntentId: paymentIntent.id,
            invoiceId: updatedInvoice[0].id,
          },
        });

        return {
          success: true,
          invoice: updatedInvoice[0],
        };
      } catch (error) {
        logger.error('Error handling successful payment:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process payment confirmation',
        });
      }
    }),
});

export type PaymentsRouter = typeof paymentsRouter;
