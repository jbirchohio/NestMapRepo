import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getDatabaseUrl } from '../../config';
import * as schema from './schema';
import * as invoiceSchema from './invoiceSchema';
import * as proposalSchema from './proposalSchema';
import * as superadminSchema from './superadminSchema';

// Create a connection pool
const pool = new Pool({
  connectionString: getDatabaseUrl(),
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
