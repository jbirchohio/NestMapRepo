const { Client } = require('pg');
require('dotenv').config();

async function checkTrip130() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT title, location_name, latitude, longitude
      FROM activities
      WHERE trip_id = 130
      ORDER BY id
    `);
    
    console.log('Activities for Trip 130:');
    console.log('========================\n');
    
    result.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.title}`);
      console.log(`   Location: ${row.location_name}`);
      console.log(`   GPS: ${row.latitude}, ${row.longitude}`);
      console.log('');
    });
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkTrip130();