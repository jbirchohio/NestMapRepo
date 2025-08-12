import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { neon } from '@neondatabase/serverless';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

async function runMigration() {
  try {
    console.log('Running migration to add missing tables and columns...');
    
    // Create a direct connection (DATABASE_URL is already checked above)
    const sql = neon(DATABASE_URL!);
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-missing-tables.sql');
    const migrationSQL = fs.readFileSync(sqlPath, 'utf-8');
    
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');
    
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      await sql(statement);
    }
    
    console.log('Migration completed successfully!');
    console.log('Added:');
    console.log('- risk_level column to organizations table');
    console.log('- revenue_metrics table');
    console.log('- superadmin_background_jobs table');
    console.log('- deployments table');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();