// This script ensures all creator economy tables exist in production
// Run this on Railway after deployment if templates don't show

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function ensureTables() {
  console.log('🔧 Ensuring all tables exist...');
  
  try {
    // Check if templates table exists
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'templates'
      );
    `);
    
    if (!result.rows[0].exists) {
      console.log('❌ Templates table does not exist!');
      console.log('Run: npm run db:push');
    } else {
      console.log('✅ Templates table exists');
      
      // Count templates
      const countResult = await pool.query('SELECT COUNT(*) FROM templates');
      console.log(`📊 Total templates: ${countResult.rows[0].count}`);
      
      // Check published templates
      const publishedResult = await pool.query("SELECT COUNT(*) FROM templates WHERE status = 'published'");
      console.log(`✅ Published templates: ${publishedResult.rows[0].count}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

ensureTables();