
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "./db/schema";
// import * as superadminSchema from "@shared/src/schema";
// For now, use empty object to avoid import issues
const superadminSchema = {};

// Check if Supabase credentials are available (allow graceful degradation)
const hasSupabaseCredentials = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!hasSupabaseCredentials) {
  console.warn('⚠️  Supabase credentials not found in src/db.ts - database features will be limited');
}

// Create Supabase client for auth and realtime features (only if credentials are available)
export const supabase = hasSupabaseCredentials 
  ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  : null;

// Create database connection only if credentials are available
let db: any = null;
let client: any = null;

if (hasSupabaseCredentials && process.env.SUPABASE_DB_PASSWORD) {
  try {
    // Extract database URL from Supabase
    const supabaseUrl = new URL(process.env.SUPABASE_URL!);
    const databaseUrl = `postgresql://postgres.${supabaseUrl.hostname.split('.')[0]}:${process.env.SUPABASE_DB_PASSWORD}@${supabaseUrl.hostname}:5432/postgres`;
    
    // Create PostgreSQL connection for Drizzle
    client = postgres(databaseUrl, { prepare: false });
    db = drizzle(client, { schema: { ...schema, ...superadminSchema } });
  } catch (error) {
    console.error('❌ Error creating database connection in src/db.ts:', error);
  }
}

export { db };

// For backward compatibility
export const pool = {
  query: (text: string, params?: any[]) => client.unsafe(text, params || [])
};
