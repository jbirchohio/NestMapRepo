import { pgTable, uuid, text, timestamp, integer, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users, organizations, trips } from './schema.js';

// Proposal status enum
export const proposalStatusEnum = pgEnum('proposal_status', [
  'draft',      // Initial creation, not sent to client
  'sent',       // Sent to client for review
  'viewed',     // Client has viewed the proposal
  'signed',     // Client has approved/signed the proposal
  'rejected',   // Client has rejected the proposal
  'expired',    // Proposal has expired (past validUntil date)
  'invoiced',   // Proposal has been converted to invoice
  'cancelled'   // Proposal has been cancelled
]);

// Proposals Table
export const proposals = pgTable('proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  clientName: text('client_name').notNull(),
  clientEmail: text('client_email').notNull(),
  clientPhone: text('client_phone'),
  agentName: text('agent_name'),
  companyName: text('company_name').default('NestMap Travel Services'),
  status: proposalStatusEnum('status').default('draft'),
  estimatedCost: integer('estimated_cost').notNull(), // In cents
  costBreakdown: jsonb('cost_breakdown').$type<{
    flights: number;
    hotels: number;
    activities: number;
    meals: number;
    transportation: number;
    miscellaneous: number;
  }>(),
  proposalNotes: text('proposal_notes'),
  validUntil: timestamp('valid_until'), // When the proposal expires
  contactInfo: jsonb('contact_info').$type<{
    email: string;
    phone?: string;
    website?: string;
  }>(),
  signatureData: jsonb('signature_data').$type<{
    signedBy?: string;
    signatureImage?: string;
    signedAt?: string;
    ipAddress?: string;
  }>(),
  viewedAt: timestamp('viewed_at'),
  sentAt: timestamp('sent_at'),
  signedAt: timestamp('signed_at'),
  rejectedAt: timestamp('rejected_at'),
  invoicedAt: timestamp('invoiced_at'),
  invoiceId: uuid('invoice_id'), // Reference to the invoice if converted
  proposalUrl: text('proposal_url'), // URL to access the proposal
  proposalToken: text('proposal_token').unique(), // Unique token for secure access
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Indexes for common queries
  tripIdx: index('proposals_trip_idx').on(table.tripId),
  orgIdx: index('proposals_org_idx').on(table.organizationId),
  statusIdx: index('proposals_status_idx').on(table.status),
  clientEmailIdx: index('proposals_client_email_idx').on(table.clientEmail),
  validUntilIdx: index('proposals_valid_until_idx').on(table.validUntil),
  tokenIdx: index('proposals_token_idx').on(table.proposalToken),
}));

// Zod schemas for validation
export const insertProposalSchema = createInsertSchema(proposals, {
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Valid email required"),
  estimatedCost: z.number().int().min(0, "Cost must be positive"),
  costBreakdown: z.object({
    flights: z.number().int().min(0),
    hotels: z.number().int().min(0),
    activities: z.number().int().min(0),
    meals: z.number().int().min(0),
    transportation: z.number().int().min(0),
    miscellaneous: z.number().int().min(0)
  }).optional(),
  contactInfo: z.object({
    email: z.string().email("Valid email required"),
    phone: z.string().optional(),
    website: z.string().optional()
  }).optional(),
});

export const selectProposalSchema = createSelectSchema(proposals);

// Types
export type Proposal = typeof proposals.$inferSelect;
export type NewProposal = typeof proposals.$inferInsert;
