const { Client } = require('pg');
require('dotenv').config();

async function checkLatestTrip() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // Get the latest trip
    const tripResult = await client.query(`
      SELECT id, title, city, country, created_at
      FROM trips 
      ORDER BY id DESC
      LIMIT 1
    `);
    
    if (tripResult.rows.length > 0) {
      const trip = tripResult.rows[0];
      console.log('\n=== Latest Trip ===');
      console.log('Trip ID:', trip.id);
      console.log('Title:', trip.title);
      console.log('City:', trip.city);
      console.log('Country:', trip.country);
      console.log('Created:', trip.created_at);
      
      // Get some activities
      const activitiesResult = await client.query(`
        SELECT title, location_name, latitude, longitude
        FROM activities 
        WHERE trip_id = $1
        ORDER BY date, time
        LIMIT 10
      `, [trip.id]);
      
      console.log(`\n=== First 10 Activities ===`);
      
      for (const activity of activitiesResult.rows) {
        console.log(`\n${activity.title}`);
        console.log(`  Location: ${activity.location_name || 'N/A'}`);
        console.log(`  Coords: ${activity.latitude || 'null'}, ${activity.longitude || 'null'}`);
      }
    } else {
      console.log('No trips found');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkLatestTrip();