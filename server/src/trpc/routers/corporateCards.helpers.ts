import { db } from '../../db';
import { corporateCards, cardTransactions } from '../../db/schema';
import { and, eq, gte, lte, sql } from '../../utils/drizzle-shim';

export async function verifyCardAccess(cardId: string, organizationId: string) {
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

export async function getCardWithBalance(cardId: string, organizationId: string) {
  const [card] = await db
    .select({
      id: corporateCards.id,
      availableBalance: corporateCards.available_balance,
      status: corporateCards.status,
      spendingLimit: corporateCards.spending_limit,
      currency: corporateCards.currency,
    })
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
  return card;
}

export function buildTransactionWhereClause(
  cardId: string,
  startDate?: string,
  endDate?: string,
  status?: string
) {
  const conditions = [eq(cardTransactions.card_id, cardId)];
  
  if (startDate) {
    conditions.push(gte(cardTransactions.transaction_date, new Date(startDate)));
  }
  
  if (endDate) {
    conditions.push(lte(cardTransactions.transaction_date, new Date(endDate)));
  }
  
  if (status) {
    conditions.push(eq(cardTransactions.status, status));
  }
  
  return and(...conditions);
}

export function mapDbCardToResponse(card: any) {
  return {
    ...card,
    stripeCardId: card.stripe_card_id,
    organizationId: card.organization_id,
    userId: card.user_id,
    cardholderName: card.cardholder_name,
    cardNumberMasked: card.card_number_masked,
    cardType: card.card_type,
    spendingLimit: card.spending_limit,
    availableBalance: card.available_balance,
    createdAt: card.created_at,
    updatedAt: card.updated_at,
  };
}
