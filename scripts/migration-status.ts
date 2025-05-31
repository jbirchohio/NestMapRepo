#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import ws from 'ws';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

interface MigrationFile {
  name: string;
  path: string;
  timestamp: string;
}

async function checkMigrationStatus() {
  console.log('🔍 Checking migration status...');
  
  try {
    // Check if migrations table exists
    const migrationTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'drizzle' 
        AND table_name = '__drizzle_migrations'
      );
    `);

    if (!migrationTableExists.rows[0]?.exists) {
      console.log('⚠️  Migration table does not exist - database needs initialization');
      return false;
    }

    // Get applied migrations
    const appliedMigrations = await db.execute(sql`
      SELECT * FROM drizzle.__drizzle_migrations 
      ORDER BY created_at;
    `);

    // Get available migration files
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const migrationFiles: MigrationFile[] = [];
    
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      for (const file of files) {
        migrationFiles.push({
          name: file,
          path: path.join(migrationsDir, file),
          timestamp: file.split('_')[0] || ''
        });
      }
    }

    console.log('\n📋 Migration Status:');
    console.log(`Applied migrations: ${appliedMigrations.rows.length}`);
    console.log(`Available migrations: ${migrationFiles.length}`);

    if (appliedMigrations.rows.length === 0) {
      console.log('⚠️  No migrations have been applied');
    } else {
      console.log('\n✅ Applied migrations:');
      appliedMigrations.rows.forEach((migration: any, index: number) => {
        console.log(`  ${index + 1}. ${migration.hash} (${migration.created_at})`);
      });
    }

    if (migrationFiles.length > appliedMigrations.rows.length) {
      console.log('\n🔄 Pending migrations:');
      migrationFiles.slice(appliedMigrations.rows.length).forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.name}`);
      });
    }

    if (migrationFiles.length === appliedMigrations.rows.length) {
      console.log('\n✅ Database is up to date');
    }

    return true;

  } catch (error) {
    console.error('❌ Failed to check migration status:', error);
    return false;
  } finally {
    await pool.end();
  }
}

// Run status check if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkMigrationStatus().catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

export { checkMigrationStatus };