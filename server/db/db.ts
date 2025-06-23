import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';
import * as invoiceSchema from './invoiceSchema.js';
import * as proposalSchema from './proposalSchema.js';
import * as superadminSchema from './superadminSchema.js';
import * as bookingSchema from './bookingSchema.js';
// Create a connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
// Create the Drizzle instance with schema
export const db = drizzle(pool, { 
  schema: { 
    ...schema, 
    ...invoiceSchema, 
    ...proposalSchema, 
    ...superadminSchema,
    ...bookingSchema 
  } 
});
// Export types
export type Database = typeof db;
export type Invoice = typeof invoiceSchema.invoices.$inferSelect;
export type NewInvoice = typeof invoiceSchema.invoices.$inferInsert;
export type Proposal = typeof proposalSchema.proposals.$inferSelect;
export type NewProposal = typeof proposalSchema.proposals.$inferInsert;

export type Booking = typeof bookingSchema.bookings.$inferSelect;
export type NewBooking = typeof bookingSchema.bookings.$inferInsert;
