import { pgTable, uuid, text, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { organizations } from '../organizations/organizations.js';
import { users } from '../users/users.js';
import { trips } from '../trips/trips.js';
import { withBaseColumns } from '../base.js';

// Proposal status enum
export const proposalStatusEnum = [
  'draft',      // Initial creation, not sent to client
  'sent',       // Sent to client for review
  'viewed',     // Client has viewed the proposal
  'signed',     // Client has approved/signed the proposal
  'rejected',   // Client has rejected the proposal
  'expired',    // Proposal has expired (past validUntil date)
  'invoiced',  // Proposal has been converted to invoice
  'cancelled'  // Proposal has been cancelled
] as const;

export type ProposalStatus = typeof proposalStatusEnum[number];

// Type definitions for proposal cost breakdown
type ProposalCostBreakdown = {
  flights: number;
  hotels: number;
  activities: number;
  meals: number;
  transportation: number;
  miscellaneous: number;
};

// Type definitions for proposal contact info
type ProposalContactInfo = {
  email: string;
  phone?: string;
  website?: string;
};

// Type definitions for signature data
type SignatureData = {
  signedBy?: string;
  signatureImage?: string;
  signedAt?: string;
  ipAddress?: string;
};

// Proposals Table
export const proposals = pgTable('proposals', {
  ...withBaseColumns,
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  createdById: uuid('created_by_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tripId: uuid('trip_id')
    .references(() => trips.id, { onDelete: 'set null' }),
  
  // Proposal details
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').$type<ProposalStatus>().default('draft').notNull(),
  
  // Client information
  clientName: text('client_name').notNull(),
  clientEmail: text('client_email').notNull(),
  clientCompany: text('client_company'),
  clientContact: jsonb('client_contact').$type<ProposalContactInfo>(),
  
  // Dates
  sentAt: timestamp('sent_at', { withTimezone: true }),
  viewedAt: timestamp('viewed_at', { withTimezone: true }),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  
  // Financial
  subtotal: integer('subtotal'), // in cents
  taxAmount: integer('tax_amount'),
  discountAmount: integer('discount_amount'),
  totalAmount: integer('total_amount'),
  currency: text('currency').default('USD'),
  
  // Cost breakdown
  costBreakdown: jsonb('cost_breakdown').$type<ProposalCostBreakdown>(),
  
  // Content sections
  sections: jsonb('sections').$type<Array<{
    id: string;
    title: string;
    content: string;
    order: number;
  }>>(),
  
  // Terms and conditions
  termsAndConditions: text('terms_and_conditions'),
  
  // Signatures
  signatureData: jsonb('signature_data').$type<SignatureData>(),
  
  // Additional metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
}, (table) => ({
  // Indexes for common query patterns
  orgIdx: index('proposals_org_idx').on(table.organizationId),
  statusIdx: index('proposals_status_idx').on(table.status),
  clientEmailIdx: index('proposals_client_email_idx').on(table.clientEmail),
  tripIdx: index('proposals_trip_idx').on(table.tripId),
  createdByIdx: index('proposals_created_by_idx').on(table.createdById),
  validUntilIdx: index('proposals_valid_until_idx').on(table.validUntil),
}));

// Schema for creating/updating a proposal
export const insertProposalSchema = createInsertSchema(proposals, {
  title: (schema) => (schema as typeof proposals.$inferInsert).title.min(1).max(255),
  description: (schema) => (schema as typeof proposals.$inferInsert).description.optional(),
  status: (schema) => z.enum(proposalStatusEnum).default('draft'),
  clientName: (schema) => (schema as typeof proposals.$inferInsert).clientName.min(1).max(255),
  clientEmail: (schema) => (schema as typeof proposals.$inferInsert).clientEmail.email(),
  clientCompany: (schema) => (schema as typeof proposals.$inferInsert).clientCompany.optional(),
  subtotal: (schema) => (schema as typeof proposals.$inferInsert).subtotal.min(0).optional(),
  taxAmount: (schema) => (schema as typeof proposals.$inferInsert).taxAmount.min(0).optional(),
  discountAmount: (schema) => (schema as typeof proposals.$inferInsert).discountAmount.min(0).optional(),
  totalAmount: (schema) => (schema as typeof proposals.$inferInsert).totalAmount.min(0).optional(),
  currency: (schema) => (schema as typeof proposals.$inferInsert).currency.length(3).optional(),
  termsAndConditions: (schema) => (schema as typeof proposals.$inferInsert).termsAndConditions.optional(),
  metadata: (schema) => (schema as typeof proposals.$inferInsert).metadata.optional(),
});

// Schema for selecting a proposal
export const selectProposalSchema = createSelectSchema(proposals);

// TypeScript types
export type Proposal = typeof proposals.$inferSelect;
export type NewProposal = typeof proposals.$inferInsert;

// Export the schema with types
export const proposalSchema = {
  insert: insertProposalSchema,
  select: selectProposalSchema,
} as const;
