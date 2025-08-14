const { Client } = require('pg');
require('dotenv').config();

async function checkTripCoords() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // Get trip 121 details
    const tripResult = await client.query(`
      SELECT id, title, city, country, city_latitude, city_longitude
      FROM trips 
      WHERE id = 121
    `);
    
    console.log('\n=== Trip 121 Details ===');
    if (tripResult.rows.length > 0) {
      const trip = tripResult.rows[0];
      console.log('Trip:', trip.title);
      console.log('City:', trip.city);
      console.log('Country:', trip.country);
      console.log('City Coords:', trip.city_latitude, trip.city_longitude);
    } else {
      console.log('Trip 121 not found');
      return;
    }
    
    // Get all activities for trip 121
    const activitiesResult = await client.query(`
      SELECT id, title, location_name, latitude, longitude, date
      FROM activities 
      WHERE trip_id = 121
      ORDER BY date, time
      LIMIT 30
    `);
    
    console.log('\n=== Activities for Trip 121 ===');
    console.log(`Found ${activitiesResult.rows.length} activities\n`);
    
    for (const activity of activitiesResult.rows) {
      console.log(`\nActivity: ${activity.title}`);
      console.log(`  Location: ${activity.location_name}`);
      console.log(`  Coordinates: ${activity.latitude}, ${activity.longitude}`);
      
      // Check if coordinates make sense for Germany (roughly lat: 47-55, lon: 6-15)
      if (activity.latitude && activity.longitude) {
        const lat = parseFloat(activity.latitude);
        const lon = parseFloat(activity.longitude);
        
        if (lat < 47 || lat > 55 || lon < 6 || lon > 15) {
          console.log(`  ⚠️  WARNING: Coordinates appear to be outside Germany!`);
          
          // Try to identify where these coords actually are
          if (lat > 35 && lat < 45 && lon > -10 && lon < 5) {
            console.log(`  📍 Looks like: Southern Europe (Spain/France/Italy)`);
          } else if (lat > 50 && lat < 60 && lon > -10 && lon < 2) {
            console.log(`  📍 Looks like: UK/Ireland`);
          } else if (lat > 35 && lat < 50 && lon > -130 && lon < -70) {
            console.log(`  📍 Looks like: USA`);
          }
        } else {
          console.log(`  ✅ Coordinates appear to be in Germany region`);
        }
      } else {
        console.log(`  ❌ No coordinates`);
      }
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkTripCoords();