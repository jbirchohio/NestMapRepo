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

async function runMigration() {
  try {
    console.log('Adding risk_level to superadmin_audit_logs...');
    
    const sql = neon(DATABASE_URL!);
    
    // Read and execute the SQL
    const sqlPath = path.join(__dirname, 'add-audit-risk-level.sql');
    const migrationSQL = fs.readFileSync(sqlPath, 'utf-8');
    
    await sql(migrationSQL);
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();