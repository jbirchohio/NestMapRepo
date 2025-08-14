const { Client } = require('pg');
require('dotenv').config();

async function checkColumns() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // Check if the columns exist
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'trips' 
      AND column_name IN ('ai_regenerations_used', 'ai_regenerations_limit', 'city_latitude', 'city_longitude')
      ORDER BY column_name;
    `);
    
    console.log('Existing columns in trips table:');
    result.rows.forEach(row => {
      console.log('  -', row.column_name);
    });
    
    if (result.rows.length === 0) {
      console.log('  (none of the checked columns exist)');
    }
    
    // Try to add the missing columns
    const columnsToAdd = [
      { name: 'ai_regenerations_used', definition: 'INTEGER DEFAULT 0' },
      { name: 'ai_regenerations_limit', definition: 'INTEGER DEFAULT 5' }
    ];
    
    for (const col of columnsToAdd) {
      const exists = result.rows.find(r => r.column_name === col.name);
      if (!exists) {
        try {
          await client.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS ${col.name} ${col.definition}`);
          console.log(`✅ Added column: ${col.name}`);
        } catch (err) {
          console.log(`❌ Failed to add ${col.name}: ${err.message}`);
        }
      }
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkColumns();