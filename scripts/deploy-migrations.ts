#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
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

async function deployWithMigrations() {
  console.log('🚀 Starting database deployment with migrations...');
  
  try {
    // Check if we have migration files
    const migrationsDir = path.join(process.cwd(), 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('⚠️  No migrations directory found, creating initial migration...');
      // Generate initial migration if none exists
      const { execSync } = require('child_process');
      execSync('npx drizzle-kit generate', { stdio: 'inherit' });
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('⚠️  No migration files found, generating from current schema...');
      const { execSync } = require('child_process');
      execSync('npx drizzle-kit generate', { stdio: 'inherit' });
      
      // Re-read migration files after generation
      const newMigrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      if (newMigrationFiles.length === 0) {
        console.log('❌ Failed to generate migration files');
        process.exit(1);
      }
    }

    // Check current migration status
    let appliedMigrations = [];
    try {
      const result = await db.execute(sql`
        SELECT * FROM drizzle.__drizzle_migrations 
        ORDER BY created_at;
      `);
      appliedMigrations = result.rows;
    } catch (error) {
      console.log('📝 Migration table does not exist, will be created during first migration');
    }

    console.log(`📊 Found ${migrationFiles.length} migration files`);
    console.log(`📊 Applied ${appliedMigrations.length} migrations`);

    if (migrationFiles.length === appliedMigrations.length) {
      console.log('✅ Database is already up to date');
      return true;
    }

    // Run migrations
    console.log('🔄 Applying pending migrations...');
    await migrate(db, {
      migrationsFolder: './migrations',
    });

    console.log('✅ Database migrations completed successfully');
    console.log('🎉 Database deployment completed');
    
    return true;

  } catch (error) {
    console.error('❌ Migration deployment failed:', error);
    
    // Fallback to schema push for development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Falling back to schema push for development...');
      try {
        const { execSync } = require('child_process');
        execSync('npx drizzle-kit push', { stdio: 'inherit' });
        console.log('✅ Development schema push completed');
        return true;
      } catch (pushError) {
        console.error('❌ Schema push also failed:', pushError);
        return false;
      }
    }
    
    return false;
  } finally {
    await pool.end();
  }
}

// Run deployment if this script is executed directly
if (require.main === module) {
  deployWithMigrations().then((success) => {
    process.exit(success ? 0 : 1);
  }).catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

export { deployWithMigrations };