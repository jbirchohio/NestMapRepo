#!/usr/bin/env node
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables from the root .env file
dotenv.config({ path: join(process.cwd(), '..', '.env') });

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

async function runMigration() {
  console.log('🚀 Starting database initialization...');
  
  // Create a connection pool
  const pool = new Pool(dbConfig);
  const client = await pool.connect();

  try {
    // Start a transaction
    await client.query('BEGIN');
    
    console.log('📝 Running payment schema migration...');
    
    // Read and execute the migration file
    const migrationPath = join(__dirname, '../../migrations/003_add_payment_tables.sql');
    const sql = await readFile(migrationPath, 'utf8');
    await client.query(sql);
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('✅ Database initialized successfully!');
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    // Release the client back to the pool
    client.release();
    pool.end();
  }
}

// Run the initialization
runMigration().catch(console.error);
