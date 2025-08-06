import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RAILWAY_URL = "postgresql://postgres:VzwcdGSjRqKxBtrpMcdjBgQYjaGDqhWN@shuttle.proxy.rlwy.net:20957/railway";

async function resetDatabase() {
  const pool = new Pool({ connectionString: RAILWAY_URL });
  
  try {
    console.log('🗑️ WIPING RAILWAY DATABASE CLEAN...');
    
    // Drop all tables in correct order (respecting foreign keys)
    const dropTablesSQL = `
      -- Drop all tables cascade to remove dependencies
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `;
    
    await pool.query(dropTablesSQL);
    console.log('✅ Database wiped clean!');
    
    // Verify it's empty
    const result = await pool.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log(`📊 Tables remaining: ${result.rows[0].table_count}`);
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
  } finally {
    await pool.end();
  }
}

resetDatabase();