
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "./db/schema.js";
import * as superadminSchema from "../../shared/src/schema.js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. Did you forget to configure Supabase?",
  );
}

// Create Supabase client for auth and realtime features
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Extract database URL from Supabase
const supabaseUrl = new URL(process.env.SUPABASE_URL);
const databaseUrl = `postgresql://postgres.${supabaseUrl.hostname.split('.')[0]}:${process.env.SUPABASE_DB_PASSWORD}@${supabaseUrl.hostname}:5432/postgres`;

// Create PostgreSQL connection for Drizzle
const client = postgres(databaseUrl, { prepare: false });
export const db = drizzle(client, { schema: { ...schema, ...superadminSchema } });

// For backward compatibility
export const pool = {
  query: (text: string, params?: any[]) => client.unsafe(text, params || [])
};
