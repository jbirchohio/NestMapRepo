import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RAILWAY_URL = "postgresql://postgres:VzwcdGSjRqKxBtrpMcdjBgQYjaGDqhWN@shuttle.proxy.rlwy.net:20957/railway";

async function fixTables() {
  const pool = new Pool({ connectionString: RAILWAY_URL });
  
  try {
    console.log('🔧 Fixing creator tables in Railway database...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix-creator-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    await pool.query(sql);
    
    console.log('✅ Tables recreated with correct schema!');
    
    // Verify tables
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'creator_profiles'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📊 Creator profiles columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to fix tables:', error);
  } finally {
    await pool.end();
  }
}

fixTables();