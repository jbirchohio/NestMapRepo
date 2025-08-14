const { Client } = require('pg');
require('dotenv').config();

async function checkLatestActivities() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // Get the latest activities
    const result = await client.query(`
      SELECT a.id, a.title, a.location_name, a.latitude, a.longitude, a.created_at
      FROM activities a
      WHERE a.trip_id = 121
      ORDER BY a.id DESC
      LIMIT 10
    `);
    
    console.log('\n=== Latest Activities for Trip 121 ===\n');
    
    const uniqueCoords = new Set();
    
    result.rows.forEach((activity, i) => {
      console.log(`${i + 1}. ${activity.title}`);
      console.log(`   Location: ${activity.location_name || 'N/A'}`);
      console.log(`   Coords: ${activity.latitude}, ${activity.longitude}`);
      console.log(`   Created: ${activity.created_at}`);
      console.log('');
      
      if (activity.latitude && activity.longitude) {
        uniqueCoords.add(`${activity.latitude},${activity.longitude}`);
      }
    });
    
    console.log(`\n📍 Unique locations: ${uniqueCoords.size} out of ${result.rows.length} activities`);
    
    if (uniqueCoords.size === result.rows.length) {
      console.log('✅ Perfect! Every activity has unique coordinates!');
    } else if (uniqueCoords.size >= result.rows.length * 0.7) {
      console.log('✅ Good! Most activities have unique coordinates');
    } else {
      console.log('⚠️  Many activities share the same coordinates');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkLatestActivities();