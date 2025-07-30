import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getDatabaseUrl } from '../config';
import * as schema from './schema';
import * as invoiceSchema from './invoiceSchema';
import * as proposalSchema from './proposalSchema';
import * as superadminSchema from './superadminSchema';
import * as bookingSchema from './bookingSchema';
import * as paymentSchema from './paymentSchema';

// Create a connection pool
const pool = new Pool({
  connectionString: getDatabaseUrl(),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Create the Drizzle instance with schema
export const db = drizzle(pool, { 
  schema: { 
    ...schema, 
    ...invoiceSchema, 
    ...proposalSchema, 
    ...superadminSchema, 
    ...bookingSchema,
    ...paymentSchema 
  } 
});

// Export types
export type Database = typeof db;

export type Invoice = typeof invoiceSchema.invoices.$inferSelect;
export type NewInvoice = typeof invoiceSchema.invoices.$inferInsert;

export type Proposal = typeof proposalSchema.proposals.$inferSelect;
export type NewProposal = typeof proposalSchema.proposals.$inferInsert;

export type Payment = typeof paymentSchema.payments.$inferSelect;
export type NewPayment = typeof paymentSchema.payments.$inferInsert;

export type PaymentMethod = typeof paymentSchema.paymentMethods.$inferSelect;
export type NewPaymentMethod = typeof paymentSchema.paymentMethods.$inferInsert;

export type PaymentRefund = typeof paymentSchema.paymentRefunds.$inferSelect;
export type NewPaymentRefund = typeof paymentSchema.paymentRefunds.$inferInsert;

