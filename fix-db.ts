import { db } from './server/db-connection.js';
import { sql } from 'drizzle-orm';

async function fix() {
  try {
    // Add missing columns to templates table
    await db.execute(sql`
      ALTER TABLE templates 
      ADD COLUMN IF NOT EXISTS quality_score INTEGER,
      ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS auto_checks_passed BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
      ADD COLUMN IF NOT EXISTS moderation_notes TEXT
    `);
    console.log('✅ Added missing columns to templates table');
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

fix();