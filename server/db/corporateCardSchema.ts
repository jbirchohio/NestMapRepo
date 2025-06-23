import { pgTable, uuid, text, timestamp, jsonb, index, boolean, decimal, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { organizations, users } from './schema.js';

// Enums
export const cardStatusEnum = pgEnum('card_status', ['active', 'suspended', 'cancelled', 'expired', 'lost', 'stolen']);
export const cardTypeEnum = pgEnum('card_type', ['physical', 'virtual']);

export const corporateCards = pgTable('corporate_cards', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
        .references(() => organizations.id, { onDelete: 'cascade' })
        .notNull(),
    cardholderId: uuid('cardholder_id')
        .references(() => users.id, { onDelete: 'set null' }),
    cardNumber: text('card_number').notNull(),
    lastFour: text('last_four').notNull(),
    cardType: cardTypeEnum('card_type').notNull(),
    status: cardStatusEnum('status').notNull().default('active'),
    expirationDate: timestamp('expiration_date').notNull(),
    cvv: text('cvv'),
    spendingLimit: decimal('spending_limit', { precision: 12, scale: 2 }),
    monthlyLimit: decimal('monthly_limit', { precision: 12, scale: 2 }),
    currency: text('currency').default('USD'),
    metadata: jsonb('metadata').default({}),
    isDefault: boolean('is_default').default(false),
    lastUsed: timestamp('last_used'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
}, (table) => ({
    orgIdx: index('corporate_cards_organization_id_idx').on(table.organizationId),
    cardholderIdx: index('corporate_cards_cardholder_id_idx').on(table.cardholderId),
    statusIdx: index('corporate_cards_status_idx').on(table.status),
    cardNumberIdx: index('corporate_cards_card_number_idx').on(table.cardNumber),
}));

// Zod schemas for validation
export const insertCorporateCardSchema = createInsertSchema(corporateCards, {
    spendingLimit: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    monthlyLimit: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    metadata: z.record(z.any()).optional(),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
});

export const selectCorporateCardSchema = createSelectSchema(corporateCards);

export const updateCorporateCardSchema = insertCorporateCardSchema.partial();

// TypeScript types
export type CorporateCard = z.infer<typeof selectCorporateCardSchema>;
export type NewCorporateCard = z.infer<typeof insertCorporateCardSchema>;
export type UpdateCorporateCard = z.infer<typeof updateCorporateCardSchema>;
