import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Import schemas from db directory
import * as schema from './db/schema.js';
import * as superadminSchema from './db/superadminSchema.js';

// Export database schema type
export type DatabaseSchema = typeof schema & typeof superadminSchema;

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_DB_PASSWORD'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Create Supabase client for auth and realtime features
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Extract database URL from Supabase
const supabaseUrl = new URL(process.env.SUPABASE_URL!);
const dbUser = `postgres.${supabaseUrl.hostname.split('.')[0]}`;
const dbPassword = process.env.SUPABASE_DB_PASSWORD!;
const dbHost = supabaseUrl.hostname;
const databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:5432/postgres`;

// Create PostgreSQL connection for Drizzle
const client = postgres(databaseUrl, { 
  prepare: false,
  max: 10, // Adjust based on your needs
  idle_timeout: 20,
  max_lifetime: 60 * 30, // 30 minutes
});

// Initialize Drizzle with all schemas
export const db = drizzle(client, { 
  schema: { 
    ...schema,
    ...superadminSchema 
  } 
});

// For backward compatibility
export const pool = {
  query: async (text: string, params?: any[]) => {
    const result = await client.unsafe(text, params || []);
    return { rows: result };
  }
};
