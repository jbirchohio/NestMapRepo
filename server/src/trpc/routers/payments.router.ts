import { z } from 'zod';
import { router, protectedProcedure, organizationProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import type Stripe from 'stripe';
import { stripe } from '../../stripe';
import { db } from '../../db/db';
import { 
  payments, 
  paymentMethods, 
  paymentRefunds,
  type Payment,
  type PaymentMethod,
  type PaymentRefund,
  paymentStatusEnum,
  paymentMethodTypeEnum
} from '../../db/paymentSchema';
import { invoices } from '../../db/invoiceSchema';
import { billingEvents } from '../../db/superadminSchema';
import { eq, and, desc, sql } from '../../utils/drizzle-shim';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

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
          expand: ['payment_intent', 'invoice', 'payment_method'],
        })) as PaymentSession;

        // Verify the session belongs to the user's organization
        if (session.client_reference_id !== ctx.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to view this payment session',
          });
        }

        // Get payment method details if available
        let paymentMethodDetails = null;
        if (session.payment_intent && typeof session.payment_intent !== 'string') {
          const paymentMethodId = session.payment_intent.payment_method;
          if (paymentMethodId) {
            const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId as string);
            paymentMethodDetails = {
              type: paymentMethod.type,
              card: paymentMethod.card ? {
                brand: paymentMethod.card.brand,
                last4: paymentMethod.card.last4,
                exp_month: paymentMethod.card.exp_month,
                exp_year: paymentMethod.card.exp_year,
              } : null,
            };
          }
        }

        return {
          ...session,
          payment_method: paymentMethodDetails,
        };
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
      paymentMethodId: z.string().optional(),
      savePaymentMethod: z.boolean().default(false),
      customerId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { 
          amount, 
          currency, 
          description, 
          metadata, 
          paymentMethodId,
          savePaymentMethod,
          customerId
        } = input;
        
        const paymentIntentData: Stripe.PaymentIntentCreateParams = {
          amount,
          currency: currency.toLowerCase(),
          description,
          metadata: {
            organizationId: ctx.organizationId,
            userId: ctx.userId,
            ...metadata,
          },
        };

        // If payment method is provided, attach it to the payment intent
        if (paymentMethodId) {
          paymentIntentData.payment_method = paymentMethodId;
          paymentIntentData.confirm = true;
          paymentIntentData.off_session = true;
          paymentIntentData.confirm = true;
        }

        // If customer ID is provided, attach it to the payment intent
        if (customerId) {
          paymentIntentData.customer = customerId;
        }

        // If save payment method is requested, set up future usage
        if (savePaymentMethod && paymentMethodId) {
          paymentIntentData.setup_future_usage = 'off_session';
        }

        // Create the payment intent
        const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

        // If payment method was provided and should be saved, save it
        if (savePaymentMethod && paymentMethodId && ctx.userId) {
          try {
            const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
            
            await db.insert(paymentMethods).values({
              id: uuidv4(),
              organizationId: ctx.organizationId,
              userId: ctx.userId,
              paymentMethodId: paymentMethod.id,
              type: paymentMethod.type as any,
              isDefault: false, // New payment methods are not default by default
              details: paymentMethod[paymentMethod.type],
              metadata: {
                createdBy: ctx.userId,
              },
            });
          } catch (error) {
            // Log the error but don't fail the payment intent creation
            logger.error('Error saving payment method:', error);
          }
        }

        return {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          requiresAction: paymentIntent.status === 'requires_action',
          requiresConfirmation: paymentIntent.status === 'requires_confirmation',
          paymentStatus: paymentIntent.status,
        };
      } catch (error) {
        logger.error('Error creating payment intent:', error);
        
        // Handle Stripe specific errors
        if (error.code === 'authentication_required') {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required for this payment method',
          });
        } else if (error.code) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message || 'Payment processing failed',
          });
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create payment intent',
        });
      }
    }),

  // Get payment by ID
  getPayment: protectedProcedure
    .input(z.object({
      paymentId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const { paymentId } = input;
        
        const payment = await db.query.payments.findFirst({
          where: and(
            eq(payments.id, paymentId),
            eq(payments.organizationId, ctx.organizationId)
          ),
          with: {
            refunds: true,
            invoice: true,
          },
        });

        if (!payment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Payment not found',
          });
        }

        return payment;
      } catch (error) {
        logger.error('Error fetching payment:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch payment',
        });
      }
    }),

  // List payments with pagination and filtering
  listPayments: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(10),
      cursor: z.string().uuid().nullish(),
      status: z.enum(['all', ...paymentStatusEnum.enumValues]).default('all'),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const { limit, cursor, status, startDate, endDate } = input;
        
        let query = db.select()
          .from(payments)
          .where(and(
            eq(payments.organizationId, ctx.organizationId),
            status !== 'all' ? eq(payments.status, status as any) : undefined,
            startDate ? sql`${payments.createdAt} >= ${new Date(startDate)}` : undefined,
            endDate ? sql`${payments.createdAt} <= ${new Date(endDate)}` : undefined
          ))
          .orderBy(desc(payments.createdAt))
          .limit(limit + 1);

        if (cursor) {
          query = query.offset(1);
        }

        const results = await query;
        
        let nextCursor: typeof cursor = null;
        if (results.length > limit) {
          const nextItem = results.pop();
          nextCursor = nextItem?.id || null;
        }

        return {
          items: results,
          nextCursor,
        };
      } catch (error) {
        logger.error('Error listing payments:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list payments',
        });
      }
    }),

  // Create a refund for a payment
  createRefund: protectedProcedure
    .input(z.object({
      paymentId: z.string().uuid(),
      amount: z.number().int().positive().optional(),
      reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer', 'expired_uncaptured_charge']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { paymentId, amount, reason } = input;
        
        // Get the payment
        const payment = await db.query.payments.findFirst({
          where: and(
            eq(payments.id, paymentId),
            eq(payments.organizationId, ctx.organizationId)
          ),
        });

        if (!payment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Payment not found',
          });
        }

        // Check if payment is refundable
        if (payment.status !== 'succeeded' && payment.status !== 'partially_refunded') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Payment is not eligible for refund',
          });
        }

        // Create refund in Stripe
        const refund = await stripe.refunds.create({
          payment_intent: payment.paymentIntentId,
          amount,
          reason,
          metadata: {
            organizationId: ctx.organizationId,
            processedBy: ctx.userId,
          },
        });

        // Create refund record in database
        const [newRefund] = await db.insert(paymentRefunds).values({
          id: uuidv4(),
          paymentId: payment.id,
          amount: refund.amount,
          currency: refund.currency,
          status: refund.status,
          reason: refund.reason || undefined,
          receiptUrl: refund.receipt_url || null,
          metadata: {
            refundId: refund.id,
            processedBy: ctx.userId,
          },
        }).returning();

        // Update payment status
        const updatedStatus = refund.amount < payment.amount ? 'partially_refunded' : 'refunded';
        await db.update(payments)
          .set({ 
            status: updatedStatus as any,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, payment.id));

        return newRefund;
      } catch (error) {
        logger.error('Error creating refund:', error);
        
        if (error.code === 'charge_already_refunded') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'This payment has already been fully refunded',
          });
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create refund',
        });
      }
    }),

  // Get payment methods for the current user/organization
  getPaymentMethods: protectedProcedure
    .input(z.object({
      type: z.enum(['all', ...paymentMethodTypeEnum.enumValues]).default('all'),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const { type } = input;
        
        const whereClause = and(
          eq(paymentMethods.organizationId, ctx.organizationId),
          eq(paymentMethods.userId, ctx.userId),
          type !== 'all' ? eq(paymentMethods.type, type as any) : undefined
        );
        
        const methods = await db.query.paymentMethods.findMany({
          where: whereClause,
          orderBy: [
            desc(paymentMethods.isDefault),
            desc(paymentMethods.createdAt)
          ],
        });

        // For security, we don't return the full payment method details
        return methods.map(method => ({
          id: method.id,
          type: method.type,
          isDefault: method.isDefault,
          last4: method.details?.last4,
          brand: method.details?.brand,
          expMonth: method.details?.exp_month,
          expYear: method.details?.exp_year,
          createdAt: method.createdAt,
        }));
      } catch (error) {
        logger.error('Error fetching payment methods:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch payment methods',
        });
      }
    }),

  // Set default payment method
  setDefaultPaymentMethod: protectedProcedure
    .input(z.object({
      paymentMethodId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { paymentMethodId } = input;
        
        // Start a transaction
        await db.transaction(async (tx) => {
          // Reset all payment methods to non-default
          await tx.update(paymentMethods)
            .set({ isDefault: false })
            .where(and(
              eq(paymentMethods.organizationId, ctx.organizationId),
              eq(paymentMethods.userId, ctx.userId)
            ));
          
          // Set the specified payment method as default
          const result = await tx.update(paymentMethods)
            .set({ isDefault: true })
            .where(and(
              eq(paymentMethods.id, paymentMethodId),
              eq(paymentMethods.organizationId, ctx.organizationId),
              eq(paymentMethods.userId, ctx.userId)
            ))
            .returning();
          
          if (!result.length) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Payment method not found',
            });
          }
        });
        
        return { success: true };
      } catch (error) {
        logger.error('Error setting default payment method:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to set default payment method',
        });
      }
    }),

  // Remove a payment method
  removePaymentMethod: protectedProcedure
    .input(z.object({
      paymentMethodId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { paymentMethodId } = input;
        
        // Check if the payment method exists and belongs to the user
        const paymentMethod = await db.query.paymentMethods.findFirst({
          where: and(
            eq(paymentMethods.id, paymentMethodId),
            eq(paymentMethods.organizationId, ctx.organizationId),
            eq(paymentMethods.userId, ctx.userId)
          ),
        });
        
        if (!paymentMethod) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Payment method not found',
          });
        }
        
        // Check if the payment method is the default one
        if (paymentMethod.isDefault) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot remove default payment method. Set another one as default first.',
          });
        }
        
        // Delete the payment method from the database
        await db.delete(paymentMethods)
          .where(eq(paymentMethods.id, paymentMethodId));
        
        return { success: true };
      } catch (error) {
        logger.error('Error removing payment method:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove payment method',
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
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ['payment_method', 'invoice'],
        });
        
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

        // Create or update payment record
        const paymentData = {
          id: uuidv4(),
          organizationId: ctx.organizationId,
          userId: paymentIntent.metadata.userId || ctx.userId,
          invoiceId: paymentIntent.metadata.invoiceId || null,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status as any,
          paymentMethodId: typeof paymentIntent.payment_method === 'string' 
            ? paymentIntent.payment_method 
            : paymentIntent.payment_method?.id || null,
          paymentIntentId: paymentIntent.id,
          receiptUrl: paymentIntent.charges?.data[0]?.receipt_url || null,
          description: paymentIntent.description || undefined,
          metadata: {
            ...paymentIntent.metadata,
            paymentMethod: paymentIntent.payment_method && typeof paymentIntent.payment_method !== 'string'
              ? {
                  type: paymentIntent.payment_method.type,
                  card: paymentIntent.payment_method.card ? {
                    brand: paymentIntent.payment_method.card.brand,
                    last4: paymentIntent.payment_method.card.last4,
                    exp_month: paymentIntent.payment_method.card.exp_month,
                    exp_year: paymentIntent.payment_method.card.exp_year,
                  } : undefined,
                }
              : undefined,
          },
        };

        // Check if payment already exists
        const existingPayment = await db.query.payments.findFirst({
          where: and(
            eq(payments.paymentIntentId, paymentIntent.id),
            eq(payments.organizationId, ctx.organizationId)
          ),
        });

        let payment: Payment;
        if (existingPayment) {
          // Update existing payment
          [payment] = await db.update(payments)
            .set({
              ...paymentData,
              id: undefined, // Don't update the ID
              updatedAt: new Date(),
            })
            .where(eq(payments.id, existingPayment.id))
            .returning();
        } else {
          // Create new payment
          [payment] = await db.insert(payments)
            .values(paymentData)
            .returning();
        }

        // Update the invoice status if invoiceId is provided
        if (payment.invoiceId) {
          await db.update(invoices)
            .set({ 
              status: 'paid',
              paidAt: new Date(),
              updatedAt: new Date(),
            })
            .where(and(
              eq(invoices.id, payment.invoiceId),
              eq(invoices.organizationId, ctx.organizationId)
            ));
        }

        // Log the billing event
        await db.insert(billingEvents).values({
          organizationId: ctx.organizationId,
          eventType: 'payment_succeeded',
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          metadata: {
            paymentId: payment.id,
            paymentIntentId: paymentIntent.id,
            invoiceId: payment.invoiceId,
          },
        });

        return {
          success: true,
          payment,
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
