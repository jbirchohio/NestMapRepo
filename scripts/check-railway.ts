import { Pool } from 'pg';

// Railway database URL directly
const RAILWAY_URL = "postgresql://postgres:VzwcdGSjRqKxBtrpMcdjBgQYjaGDqhWN@shuttle.proxy.rlwy.net:20957/railway";

async function checkRailwayTables() {
  const pool = new Pool({ connectionString: RAILWAY_URL });
  
  try {
    console.log('🔍 Checking Railway database tables...');
    
    // List all tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log(`\n📊 Tables in Railway database:`);
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check specifically for templates table
    const templateCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'templates'
      );
    `);
    
    if (templateCheck.rows[0].exists) {
      const countResult = await pool.query('SELECT COUNT(*) FROM templates');
      console.log(`\n✅ Templates table exists with ${countResult.rows[0].count} records`);
    } else {
      console.log('\n❌ Templates table DOES NOT exist in Railway database');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkRailwayTables();