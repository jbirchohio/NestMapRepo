const { Client } = require('pg');
require('dotenv').config();

async function checkTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // Check for our superadmin tables
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'superadmin_audit_logs',
        'active_sessions',
        'background_jobs',
        'superadmin_background_jobs',
        'superadmin_feature_flags',
        'system_activity_summary'
      )
      ORDER BY table_name;
    `;
    
    const result = await client.query(query);
    console.log('Existing superadmin tables:', result.rows);
    
    // Check all tables
    const allTablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    const allTables = await client.query(allTablesQuery);
    console.log('\nAll tables:', allTables.rows.map(r => r.table_name));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkTables();