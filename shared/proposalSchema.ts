import { pgTable, text, integer, timestamp, boolean, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Proposal Templates
export const proposalTemplates = pgTable("proposal_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: integer("user_id").notNull(),
  organizationId: integer("organization_id"),
  isShared: boolean("is_shared").default(false),
  branding: jsonb("branding").$type<{
    companyName: string;
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    contactInfo: {
      email: string;
      phone?: string;
      website?: string;
      address?: string;
    };
  }>(),
  sections: jsonb("sections").$type<{
    includeCostBreakdown: boolean;
    includeItinerary: boolean;
    includeTerms: boolean;
    includeAboutUs: boolean;
    customSections: Array<{
      title: string;
      content: string;
      order: number;
    }>;
  }>(),
  pricingRules: jsonb("pricing_rules").$type<{
    markup: number;
    discounts: Array<{
      condition: string;
      percentage: number;
    }>;
    currency: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Generated Proposals
export const proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  templateId: integer("template_id"),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  agentId: integer("agent_id").notNull(),
  organizationId: integer("organization_id"),
  status: text("status").notNull().default("draft"), // draft, sent, viewed, signed, converted
  publicLink: text("public_link"),
  linkExpiration: timestamp("link_expiration"),
  passwordProtected: boolean("password_protected").default(false),
  linkPassword: text("link_password"),
  proposalData: jsonb("proposal_data").$type<{
    costBreakdown: any;
    estimatedCost: number;
    customNotes: string;
    validUntil: string;
  }>(),
  signatureData: jsonb("signature_data").$type<{
    signed: boolean;
    signedAt?: string;
    signerName?: string;
    signatureImage?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Proposal Analytics
export const proposalAnalytics = pgTable("proposal_analytics", {
  id: serial("id").primaryKey(),
  proposalId: integer("proposal_id").notNull(),
  eventType: text("event_type").notNull(), // opened, section_viewed, downloaded, shared, signed
  eventData: jsonb("event_data").$type<{
    section?: string;
    timeSpent?: number;
    userAgent?: string;
    ipAddress?: string;
    timestamp: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow()
});

// Invoices
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  proposalId: integer("proposal_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  amount: integer("amount").notNull(), // in cents
  currency: text("currency").default("USD"),
  status: text("status").notNull().default("draft"), // draft, sent, paid, overdue, cancelled
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  invoiceData: jsonb("invoice_data").$type<{
    lineItems: Array<{
      description: string;
      quantity: number;
      rate: number;
      total: number;
    }>;
    taxRate?: number;
    taxAmount?: number;
    subtotal: number;
    total: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Schema exports
export const insertProposalTemplateSchema = createInsertSchema(proposalTemplates);
export const insertProposalSchema = createInsertSchema(proposals);
export const insertProposalAnalyticsSchema = createInsertSchema(proposalAnalytics);
export const insertInvoiceSchema = createInsertSchema(invoices);

export type ProposalTemplate = typeof proposalTemplates.$inferSelect;
export type InsertProposalTemplate = z.infer<typeof insertProposalTemplateSchema>;
export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type ProposalAnalytics = typeof proposalAnalytics.$inferSelect;
export type InsertProposalAnalytics = z.infer<typeof insertProposalAnalyticsSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;