import { pgTable, uuid, text, timestamp, boolean, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { organizations } from '../organizations/organizations.js';
import { users } from '../users/users.js';
import { withBaseColumns } from '../base.js';

// Corporate Cards Table
export const corporateCards = pgTable('corporate_cards', {
  ...withBaseColumns,
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'set null' }), // Cardholder
  
  // Card details
  lastFourDigits: text('last_four_digits').notNull(),
  expiryMonth: integer('expiry_month').notNull(),
  expiryYear: integer('expiry_year').notNull(),
  cardholderName: text('cardholder_name').notNull(),
  cardType: text('card_type'), // 'visa', 'mastercard', 'amex', etc.
  
  // Status
  status: text('status').notNull().default('active'), // 'active', 'suspended', 'cancelled', 'expired'
  isVirtual: boolean('is_virtual').default(false),
  is_default: boolean('is_default').default(false),
  
  // Limits and balances
  spendingLimit: integer('spending_limit'), // in cents
  currentBalance: integer('current_balance').default(0), // in cents
  availableBalance: integer('available_balance').default(0), // in cents
  
  // Issuer information
  issuer: text('issuer'),
  issuerCardId: text('issuer_card_id'),
  
  // Metadata
  metadata: jsonb('metadata').$type<{
    billingAddress?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
    tags?: string[];
    [key: string]: unknown;
  }>().default({}),
  
  // Additional context
  context: jsonb('context').$type<Record<string, unknown>>().default({}),
}, (table) => ({
  // Add indexes for common query patterns
  orgUserIdx: index('corporate_cards_org_user_idx').on(table.organizationId, table.userId),
  statusIdx: index('corporate_cards_status_idx').on(table.status),
  issuerCardIdIdx: index('corporate_cards_issuer_card_id_idx').on(table.issuerCardId),
}));

// Schema for creating/updating a corporate card
export const insertCorporateCardSchema = createInsertSchema(corporateCards, {
  lastFourDigits: (schema) => (schema as typeof corporateCards.$inferInsert).lastFourDigits.length(4),
  expiryMonth: (schema) => (schema as typeof corporateCards.$inferInsert).expiryMonth.min(1).max(12),
  expiryYear: (schema) => (schema as typeof corporateCards.$inferInsert).expiryYear.min(2000).max(2100),
  cardholderName: (schema) => (schema as typeof corporateCards.$inferInsert).cardholderName.min(1).max(255),
  cardType: (schema) => (schema as typeof corporateCards.$inferInsert).cardType.optional(),
  status: (schema) => (schema as typeof corporateCards.$inferInsert).status.default('active'),
  isVirtual: (schema) => (schema as typeof corporateCards.$inferInsert).isVirtual.default(false),
  is_default: (schema) => (schema as typeof corporateCards.$inferInsert).is_default.default(false),
  spendingLimit: (schema) => (schema as typeof corporateCards.$inferInsert).spendingLimit.optional(),
  currentBalance: (schema) => (schema as typeof corporateCards.$inferInsert).currentBalance.default(0),
  availableBalance: (schema) => (schema as typeof corporateCards.$inferInsert).availableBalance.default(0),
  metadata: (schema) => (schema as typeof corporateCards.$inferInsert).metadata.optional(),
  context: (schema) => (schema as typeof corporateCards.$inferInsert).context.optional(),
});

// Schema for selecting a corporate card
export const selectCorporateCardSchema = createSelectSchema(corporateCards);

// TypeScript types
export type CorporateCard = typeof corporateCards.$inferSelect;
export type NewCorporateCard = typeof corporateCards.$inferInsert;

// Export the schema with types
export const corporateCardSchema = {
  insert: insertCorporateCardSchema,
  select: selectCorporateCardSchema,
} as const;
