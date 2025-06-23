import { pgTable, uuid, text, timestamp, jsonb, index, decimal, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { organizations, users } from './schema.js';
import { corporateCards } from './corporateCardSchema.js';

// Enums
export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'completed', 'declined', 'refunded', 'disputed']);
export const transactionTypeEnum = pgEnum('transaction_type', ['purchase', 'refund', 'adjustment', 'fee', 'credit']);

export const cardTransactions = pgTable('card_transactions', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
        .references(() => organizations.id, { onDelete: 'cascade' })
        .notNull(),
    corporateCardId: uuid('corporate_card_id')
        .references(() => corporateCards.id, { onDelete: 'set null' }),
    userId: uuid('user_id')
        .references(() => users.id, { onDelete: 'set null' }),
    transactionId: text('transaction_id').notNull().unique(),
    merchantName: text('merchant_name').notNull(),
    merchantCategory: text('merchant_category'),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').default('USD'),
    status: transactionStatusEnum('status').notNull().default('pending'),
    type: transactionTypeEnum('type').notNull().default('purchase'),
    description: text('description'),
    notes: text('notes'),
    receiptUrl: text('receipt_url'),
    metadata: jsonb('metadata').default({}),
    isReimbursable: boolean('is_reimbursable').default(true),
    isBillable: boolean('is_billable').default(true),
    isPersonal: boolean('is_personal').default(false),
    isDisputed: boolean('is_disputed').default(false),
    isRecurring: boolean('is_recurring').default(false),
    transactionDate: timestamp('transaction_date').notNull(),
    postedDate: timestamp('posted_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    orgIdx: index('card_transactions_organization_id_idx').on(table.organizationId),
    cardIdx: index('card_transactions_corporate_card_id_idx').on(table.corporateCardId),
    userIdx: index('card_transactions_user_id_idx').on(table.userId),
    statusIdx: index('card_transactions_status_idx').on(table.status),
    typeIdx: index('card_transactions_type_idx').on(table.type),
    dateIdx: index('card_transactions_transaction_date_idx').on(table.transactionDate),
}));

// Zod schemas for validation
export const insertCardTransactionSchema = createInsertSchema(cardTransactions, {
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
    metadata: z.record(z.any()).optional(),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const selectCardTransactionSchema = createSelectSchema(cardTransactions);

export const updateCardTransactionSchema = insertCardTransactionSchema.partial();

// TypeScript types
export type CardTransaction = z.infer<typeof selectCardTransactionSchema>;
export type NewCardTransaction = z.infer<typeof insertCardTransactionSchema>;
export type UpdateCardTransaction = z.infer<typeof updateCardTransactionSchema>;
