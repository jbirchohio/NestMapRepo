import { z } from 'zod';
import { router, protectedProcedure } from './_base.router';
import { db } from '../../db';
import { corporateCards, users } from '../../db/schema';
import { eq, and, desc } from '../../utils/drizzle-shim';
import { auditLogger } from '../../auditLogger';
import { mapDbCardToResponse } from './corporateCards.helpers';
import { TRPCError } from '@trpc/server';

// Types
type CardWithBalance = {
  id: string;
  organizationId: string;
  cardholderName: string;
  cardNumber: string;
  lastFour: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  spendingLimit: number | null;
  currency: string;
  status: string;
  purpose: string | null;
  department: string | null;
  userId: string | null;
  currentBalance: number;
  createdAt: Date;
  updatedAt: Date;
};

// Helper functions
const getCardType = (cardNumber: string): string => {
  const firstDigit = cardNumber[0];
  if (firstDigit === '4') return 'visa';
  if (firstDigit === '5') return 'mastercard';
  if (firstDigit === '3') return 'amex';
  return 'unknown';
};

const mapCardToResponse = (card: CardWithBalance, balance: number) => ({
  id: card.id,
  cardholderName: card.cardholderName,
  lastFour: card.lastFour,
  expiryMonth: card.expiryMonth,
  expiryYear: card.expiryYear,
  spendingLimit: card.spendingLimit,
  currentBalance: balance,
  currency: card.currency,
  status: card.status,
  purpose: card.purpose || '',
  department: card.department || '',
  userId: card.userId || '',
  createdAt: card.createdAt,
  updatedAt: card.updatedAt,
});

// Helper function to verify card access
async function verifyCardAccess(cardId: string, organizationId: string) {
  const [card] = await db
    .select({ id: corporateCards.id })
    .from(corporateCards)
    .where(
      and(
        eq(corporateCards.id, cardId),
        eq(corporateCards.organization_id, organizationId)
      )
    )
    .limit(1);

  if (!card) {
    throw new Error('Corporate card not found');
  }
  return true;
}

// Input validation schemas
const CreateCardInput = z.object({
  cardholderName: z.string().min(1, 'Cardholder name is required'),
  cardNumber: z.string().min(15, 'Invalid card number'),
  expiryMonth: z.number().min(1).max(12),
  expiryYear: z.number().min(new Date().getFullYear()),
  cvv: z.string().length(3, 'CVV must be 3 digits'),
  spendingLimit: z.number().min(0).optional(),
  currency: z.string().default('USD'),
  purpose: z.string().optional(),
  department: z.string().optional(),
  userId: z.string().uuid().optional(),
});

const UpdateCardInput = z.object({
  cardId: z.string().uuid(),
  status: z.enum(['active', 'suspended', 'cancelled']).optional(),
  spendingLimit: z.number().min(0).optional(),
  purpose: z.string().optional(),
  department: z.string().optional(),
  userId: z.string().uuid().optional(),
});

export const corporateCardsRouter = router({
  // Get all corporate cards for organization
  getCards: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const organizationId = ctx.user.organizationId;
      if (!organizationId) throw new Error('No organization found');

      const cards = await db
        .select({
          id: corporateCards.id,
          stripeCardId: corporateCards.stripe_card_id,
          organizationId: corporateCards.organization_id,
          userId: corporateCards.user_id,
          cardholderName: corporateCards.cardholder_name,
          cardNumberMasked: corporateCards.card_number_masked,
          cardType: corporateCards.card_type,
          status: corporateCards.status,
          spendingLimit: corporateCards.spending_limit,
          availableBalance: corporateCards.available_balance,
          currency: corporateCards.currency,
          purpose: corporateCards.purpose,
          department: corporateCards.department,
          createdAt: corporateCards.created_at,
          updatedAt: corporateCards.updated_at,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(corporateCards)
        .leftJoin(users, eq(corporateCards.user_id, users.id))
        .where(eq(corporateCards.organization_id, organizationId))
        .orderBy(desc(corporateCards.created_at));

      return { cards };
    }),

  // Get a single corporate card by ID
  getCard: protectedProcedure
    .input(z.object({ cardId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error('Unauthorized');
      const organizationId = ctx.user.organizationId;
      if (!organizationId) throw new Error('No organization found');

      const [card] = await db
        .select({
          id: corporateCards.id,
          stripeCardId: corporateCards.stripe_card_id,
          organizationId: corporateCards.organization_id,
          userId: corporateCards.user_id,
          cardholderName: corporateCards.cardholder_name,
          cardNumberMasked: corporateCards.card_number_masked,
          cardType: corporateCards.card_type,
          status: corporateCards.status,
          spendingLimit: corporateCards.spending_limit,
          availableBalance: corporateCards.available_balance,
          currency: corporateCards.currency,
          purpose: corporateCards.purpose,
          department: corporateCards.department,
          createdAt: corporateCards.created_at,
          updatedAt: corporateCards.updated_at,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(corporateCards)
        .leftJoin(users, eq(corporateCards.user_id, users.id))
        .where(
          and(
            eq(corporateCards.id, input.cardId),
            eq(corporateCards.organization_id, organizationId)
          )
        )
        .limit(1);

      if (!card) {
        throw new Error('Corporate card not found');
      }

      return { card };
    }),

  // Create a new corporate card
  createCard: protectedProcedure
    .input(CreateCardInput)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const organizationId = ctx.user.organizationId;
      if (!organizationId) throw new TRPCError({ 
        code: 'BAD_REQUEST', 
        message: 'No organization found' 
      });

      // In a real implementation, you would integrate with a payment processor like Stripe
      const stripeCardId = `card_${Math.random().toString(36).substring(2, 15)}`;
      
      // Mask the card number (last 4 digits only)
      const lastFour = input.cardNumber.slice(-4);
      const cardNumberMasked = `•••• •••• •••• ${lastFour}`;

      // Determine card type (simplified)
      const cardType = input.cardNumber.startsWith('4') ? 'visa' : 
                      input.cardNumber.startsWith('5') ? 'mastercard' :
                      input.cardNumber.startsWith('3') ? 'amex' : 'unknown';

      const [newCard] = await db
        .insert(corporateCards)
        .values({
          stripe_card_id: stripeCardId,
          organization_id: organizationId,
          user_id: input.userId || null,
          cardholder_name: input.cardholderName,
          card_number_masked: cardNumberMasked,
          card_type: cardType,
          status: 'active',
          spending_limit: input.spendingLimit || null,
          available_balance: input.spendingLimit || 10000, // Default limit
          currency: input.currency,
          purpose: input.purpose || null,
          department: input.department || null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      // Log audit event
      await auditLogger.log({
        userId: ctx.user.id,
        organizationId: ctx.user.organizationId,
        action: 'create_card',
        details: {
          cardId: newCard.id,
          lastFour: lastFour,
          cardType: cardType,
          limit: input.spendingLimit,
        },
        ipAddress: ctx.req?.ip,
        userAgent: ctx.req?.headers['user-agent'],
        logType: 'corporate_card'
      });

      return { 
        success: true, 
        message: 'Corporate card created successfully',
        card: mapDbCardToResponse(newCard)
      };
    }),

  // Update a corporate card
  updateCard: protectedProcedure
    .input(UpdateCardInput)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const organizationId = ctx.user.organizationId;
      if (!organizationId) throw new TRPCError({ 
        code: 'BAD_REQUEST', 
        message: 'No organization found' 
      });

      // Verify the card exists and belongs to the organization
      await verifyCardAccess(input.cardId, organizationId);

      const updateData: Record<string, any> = {
        updated_at: new Date(),
      };

      if (input.status) updateData.status = input.status;
      if (input.spendingLimit !== undefined) updateData.spending_limit = input.spendingLimit;
      if (input.purpose !== undefined) updateData.purpose = input.purpose;
      if (input.department !== undefined) updateData.department = input.department;
      if (input.userId !== undefined) updateData.user_id = input.userId;

      const [updatedCard] = await db
        .update(corporateCards)
        .set(updateData)
        .where(eq(corporateCards.id, input.cardId))
        .returning();

      // Log audit event
      await auditLogger.log({
        userId: ctx.user.id,
        organizationId: ctx.user.organizationId,
        action: 'update_card',
        details: {
          cardId: input.cardId,
          updates: Object.keys(updateData).filter(k => k !== 'updated_at'),
        },
        ipAddress: ctx.req?.ip,
        userAgent: ctx.req?.headers['user-agent'],
        logType: 'corporate_card'
      });

      return { 
        success: true, 
        message: 'Corporate card updated successfully',
        card: mapDbCardToResponse(updatedCard)
      };
    })
});

export type CorporateCardsRouter = typeof corporateCardsRouter;
