#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function runMigrations() {
  console.log('🔄 Running database migrations...');
  
  try {
    // Check if migrations have already been applied
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (result.rows[0].exists) {
      console.log('✅ Database schema already exists, skipping migrations');
      return;
    }
    
    await migrate(db, {
      migrationsFolder: './migrations',
    });
    
    console.log('✅ Database migrations completed successfully');
  } catch (error: any) {
    // If it's a duplicate schema error, that's okay - migrations were already run
    if (error.code === '23505' && error.detail?.includes('drizzle')) {
      console.log('✅ Migrations already applied (drizzle schema exists)');
      return;
    }
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
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