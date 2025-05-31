import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';

// Configure neon for WebSocket support
if (!globalThis.WebSocket) {
  globalThis.WebSocket = ws as any;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Initialize migration tracking for existing database
 * This script sets up the migration system for a database that was created using schema push
 */
async function initializeMigrationTracking(): Promise<void> {
  console.log('🔄 Initializing migration tracking for existing database...');
  
  try {
    // Create the migrations tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      );
    `);
    
    console.log('✅ Migration tracking table created');

    // Check if the initial migration is already recorded
    const existingMigrations = await pool.query(
      `SELECT * FROM "drizzle"."__drizzle_migrations" WHERE hash = $1`,
      ['m0000_familiar_sharon_ventura']
    );

    if (existingMigrations.rows.length === 0) {
      // Mark the initial migration as applied since tables already exist
      await pool.query(
        `INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`,
        ['m0000_familiar_sharon_ventura', Date.now()]
      );
      
      console.log('✅ Initial migration marked as applied');
    } else {
      console.log('ℹ️  Initial migration already recorded');
    }

    // Verify the setup
    const allMigrations = await pool.query(
      `SELECT * FROM "drizzle"."__drizzle_migrations" ORDER BY created_at`
    );
    
    console.log('📊 Migration tracking status:');
    console.log(`   - Total migrations recorded: ${allMigrations.rows.length}`);
    allMigrations.rows.forEach((row, index) => {
      const date = new Date(row.created_at).toISOString();
      console.log(`   ${index + 1}. ${row.hash} (applied: ${date})`);
    });

    console.log('✅ Migration tracking successfully initialized');
    console.log('💡 Future schema changes should use: npx drizzle-kit generate');
    
  } catch (error) {
    console.error('❌ Failed to initialize migration tracking:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run initialization if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeMigrationTracking().catch((error) => {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  });
}

export { initializeMigrationTracking };