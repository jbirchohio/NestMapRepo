import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../db-connection';
import { sql } from 'drizzle-orm';

async function runCascadeDeleteMigration() {
  try {
    // Read the SQL file
    const migrationSQL = readFileSync(join(__dirname, 'add-cascade-delete.sql'), 'utf-8');
    
    // Execute the migration
    await db.execute(sql.raw(migrationSQL));
    
    // Success
    process.exit(0);
  } catch (error) {
    // Error
    process.exit(1);
  }
}

runCascadeDeleteMigration();