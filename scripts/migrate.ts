
#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_DB_PASSWORD) {
  console.error('❌ SUPABASE_URL and SUPABASE_DB_PASSWORD are required');
  process.exit(1);
}

// Extract database URL from Supabase
const supabaseUrl = new URL(process.env.SUPABASE_URL);
const databaseUrl = `postgresql://postgres.${supabaseUrl.hostname.split('.')[0]}:${process.env.SUPABASE_DB_PASSWORD}@${supabaseUrl.hostname}:5432/postgres`;

const client = postgres(databaseUrl, { prepare: false });
const db = drizzle(client);

async function runMigrations() {
  console.log('🔄 Running database migrations on Supabase...');
  
  try {
    await migrate(db, {
      migrationsFolder: './migrations',
    });
    
    console.log('✅ Supabase database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run migrations if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

export { runMigrations };
