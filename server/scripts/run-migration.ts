#!/usr/bin/env node
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'nestmap',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

// Create a migration client
const migrationClient = postgres({
  ...dbConfig,
  max: 1, // Single connection for migrations
  onnotice: () => {}, // Suppress notices
  transform: {
    ...postgres.camel,
    undefined: null,
  },
});

// Create a pool for running SQL files
const pool = new Pool(dbConfig);

async function runSqlFile(filePath: string): Promise<void> {
  try {
    const sql = await readFile(filePath, 'utf8');
    console.log(`Running migration: ${filePath}`);
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('Migration completed successfully');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error running migration:', err);
      process.exit(1);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(`Error reading migration file ${filePath}:`, err);
    process.exit(1);
  }
}

async function runDrizzleMigrations() {
  console.log('Running Drizzle migrations...');
  
  try {
    await migrate(drizzle(migrationClient), {
      migrationsFolder: join(__dirname, '../migrations'),
    });
    console.log('Drizzle migrations completed successfully');
  } catch (err) {
    console.error('Error running Drizzle migrations:', err);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Please specify a migration file to run');
    console.log('Example: pnpm run migrate -- ./migrations/003_add_payment_tables.sql');
    process.exit(1);
  }

  const migrationFile = args[0];
  
  try {
    // Run the SQL file migration
    await runSqlFile(migrationFile);
    
    // Run Drizzle migrations if any
    await runDrizzleMigrations();
    
    console.log('All migrations completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
main().catch(console.error);
