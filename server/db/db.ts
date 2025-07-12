import { drizzle } from 'drizzle-orm/node-postgres.js';
import { Pool } from 'pg.js';
import * as schema from './schema.js';
import * as invoiceSchema from './invoiceSchema.js';
import * as proposalSchema from './proposalSchema.js';
import * as superadminSchema from './superadminSchema.js';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Create the Drizzle instance with schema
export const db = drizzle(pool, { schema: { ...schema, ...invoiceSchema, ...proposalSchema, ...superadminSchema } });

// Export types
export type Database = typeof db;
export type Invoice = typeof invoiceSchema.invoices.$inferSelect;
export type NewInvoice = typeof invoiceSchema.invoices.$inferInsert;
export type Proposal = typeof proposalSchema.proposals.$inferSelect;
export type NewProposal = typeof proposalSchema.proposals.$inferInsert;
