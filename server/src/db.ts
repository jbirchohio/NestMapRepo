
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres, { Sql } from 'postgres';
import * as schema from "./db/schema";
import { getDatabaseUrl } from '../config';
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

// Database connection variables
let db: any = null;
let client: Sql | null = null;

/**
 * Initialize database connection
 */
async function initializeDatabase() {
  try {
    // Use DATABASE_URL from environment if available, otherwise construct it
    let databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl && hasSupabaseCredentials && process.env.SUPABASE_DB_PASSWORD) {
      databaseUrl = getDatabaseUrl();
    }
    
    if (!databaseUrl) {
      console.warn('⚠️ No database URL found. Server will start without database.');
      return null;
    }
    
    console.log('🔌 Attempting to connect to database (non-blocking)...');
    
    // Create PostgreSQL connection with very aggressive timeouts
    client = postgres(databaseUrl, {
      ssl: {
        rejectUnauthorized: false, // Required for Supabase
      },
      max: 2, // Very small pool size
      idle_timeout: 5, // Very short idle timeout
      connect_timeout: 3, // Very short connection timeout (3 seconds)
      max_lifetime: 10 * 60, // 10 minutes max lifetime
      debug: false, // Disable debug to reduce noise
      prepare: false, // Disable prepared statements for pgbouncer compatibility
      transform: {
        // Convert column names to camelCase
        column: (name: string) => {
          return name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        }
      }
    });
    
    // Test the connection with very short timeout
    const testQuery = client`SELECT 1`;
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection test timeout after 2 seconds')), 2000)
    );
    
    await Promise.race([testQuery, timeout]);
    
    // Initialize Drizzle
    db = drizzle(client, { 
      schema: { ...schema, ...superadminSchema },
      logger: false // Disable logging to reduce noise
    });
    
    console.log('✅ Database connection established successfully');
    return db;
  } catch (error) {
    console.warn('⚠️ Database connection failed - continuing without database:');
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        console.warn('💡 Database connection timed out. Server starting in offline mode.');
      } else if (error.message.includes('ENOTFOUND')) {
        console.warn('💡 Database host not found. Server starting in offline mode.');
      } else if (error.message.includes('authentication')) {
        console.warn('💡 Database authentication failed. Server starting in offline mode.');
      } else {
        console.warn('💡 Database error:', error.message);
      }
    }
    
    // Clean up client if it was created
    if (client) {
      try {
        await client.end();
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      client = null;
    }
    
    console.log('🚀 Server will start without database connection. API endpoints will return mock data.');
    return null;
  }
}

// Initialize the database connection when this module is imported
let dbInitialization: Promise<any> | null = null;

// Export a function to get the database instance
export async function getDatabase() {
  if (!dbInitialization) {
    dbInitialization = initializeDatabase();
  }
  const result = await dbInitialization;
  if (!result) {
    console.warn('⚠️ Database not available - some features may be limited');
  }
  return result;
}


// For backward compatibility
export const pool = {
  query: async (text: string, params?: any[]) => {
    if (!client) {
      await getDatabase();
    }
    if (!client) {
      throw new Error('Database connection not available');
    }
    return client.unsafe(text, params || []);
  }
};

// Export the database instance
// Note: Prefer using getDatabase() for async initialization
export { db };

export default {
  getDatabase,
  db,
  pool,
  supabase
};
