
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";
import { DB_CONFIG } from './config';

// Check if Supabase credentials are provided
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_DB_PASSWORD) {
  throw new Error(
    "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_DB_PASSWORD must be set. Check your environment variables.",
  );
}

// Create Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Extract database URL from Supabase
const supabaseUrl = new URL(process.env.SUPABASE_URL);
const databaseUrl = `postgresql://postgres.${supabaseUrl.hostname.split('.')[0]}:${process.env.SUPABASE_DB_PASSWORD}@${supabaseUrl.hostname}:5432/postgres`;

// Create PostgreSQL connection for Drizzle ORM
const client = postgres(databaseUrl, { 
  prepare: false,
  max: DB_CONFIG.connectionPoolSize || 10
});

// Create Drizzle ORM instance
export const db = drizzle(client, { schema });

// Utility function to test database connection
export async function testConnection() {
  try {
    const result = await client`SELECT NOW()`;
    console.log('Supabase database connection successful');
    return true;
  } catch (error) {
    console.error('Supabase database connection failed:', error);
    return false;
  }
}

// For backward compatibility
export const pool = {
  query: (text: string, params?: any[]) => client.unsafe(text, params || [])
};

// Export database connection
export default db;
