import { pgTable, uuid, text, timestamp, jsonb, integer, decimal, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { organizations } from '../organizations/organizations.js';
import { users } from '../users/users.js';
import { trips } from '../trips/trips.js';
import { corporateCards } from './corporate-cards.js';
import { withBaseColumns } from '../base.js';

// Card Transactions Table
export const cardTransactions = pgTable('card_transactions', {
  ...withBaseColumns,
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'set null' }), // User who made/is associated with the transaction
  corporateCardId: uuid('corporate_card_id')
    .references(() => corporateCards.id, { onDelete: 'set null' }),
  tripId: uuid('trip_id')
    .references(() => trips.id, { onDelete: 'set null' }),
  
  // Transaction details
  externalId: text('external_id'), // ID from the card issuer
  merchantName: text('merchant_name').notNull(),
  merchantCategory: text('merchant_category'),
  merchantLocation: text('merchant_location'),
  
  // Amount and currency
  amount: integer('amount').notNull(), // in cents
  currency: text('currency').notNull().default('USD'),
  originalAmount: integer('original_amount'), // in case of foreign transactions
  originalCurrency: text('original_currency'),
  exchangeRate: decimal('exchange_rate', { precision: 12, scale: 6 }),
  
  // Transaction metadata
  transactionDate: timestamp('transaction_date').notNull(),
  postedDate: timestamp('posted_date'),
  description: text('description'),
  referenceNumber: text('reference_number'),
  
  // Status
  status: text('status').notNull().default('pending'), // 'pending', 'posted', 'declined', 'refunded', 'disputed'
  isRecurring: boolean('is_recurring').default(false),
  isInternational: boolean('is_international').default(false),
  isOnline: boolean('is_online').default(false),
  
  // Categorization
  category: text('category'),
  subcategory: text('subcategory'),
  
  // Receipts and documentation
  receiptUrl: text('receipt_url'),
  receiptId: uuid('receipt_id'), // Reference to receipts table if implemented
  
  // Additional metadata
  metadata: jsonb('metadata').$type<{
    mccCode?: string;
    merchantAddress?: {
      line1?: string;
      city?: string;
      region?: string;
      postalCode?: string;
      country?: string;
      lat?: number;
      lng?: number;
    };
    tags?: string[];
    [key: string]: unknown;
  }>().default({}),
  
  // Additional context
  context: jsonb('context').$type<Record<string, unknown>>().default({}),
}, (table) => ({
  // Add indexes for common query patterns
  orgCardIdx: index('card_transactions_org_card_idx').on(table.organizationId, table.corporateCardId),
  orgUserIdx: index('card_transactions_org_user_idx').on(table.organizationId, table.userId),
  externalIdIdx: index('card_transactions_external_id_idx').on(table.externalId),
  transactionDateIdx: index('card_transactions_date_idx').on(table.transactionDate),
  statusIdx: index('card_transactions_status_idx').on(table.status),
}));

// Schema for creating/updating a card transaction
export const insertCardTransactionSchema = createInsertSchema(cardTransactions, {
  merchantName: (schema) => (schema as typeof cardTransactions.$inferInsert).merchantName.min(1).max(255),
  amount: (schema) => (schema as typeof cardTransactions.$inferInsert).amount.min(0),
  currency: (schema) => (schema as typeof cardTransactions.$inferInsert).currency.length(3),
  originalAmount: (schema) => (schema as typeof cardTransactions.$inferInsert).originalAmount.optional(),
  originalCurrency: (schema) => (schema as typeof cardTransactions.$inferInsert).originalCurrency.length(3).optional(),
  status: (schema) => (schema as typeof cardTransactions.$inferInsert).status.default('pending'),
  metadata: (schema) => (schema as typeof cardTransactions.$inferInsert).metadata.optional(),
  context: (schema) => (schema as typeof cardTransactions.$inferInsert).context.optional(),
});

// Schema for selecting a card transaction
export const selectCardTransactionSchema = createSelectSchema(cardTransactions);

// TypeScript types
export type CardTransaction = typeof cardTransactions.$inferSelect;
export type NewCardTransaction = typeof cardTransactions.$inferInsert;

// Export the schema with types
export const cardTransactionSchema = {
  insert: insertCardTransactionSchema,
  select: selectCardTransactionSchema,
} as const;
