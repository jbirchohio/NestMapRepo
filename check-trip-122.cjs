const { Client } = require('pg');
require('dotenv').config();

async function checkTrip122() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // Get trip 122 details
    const tripResult = await client.query(`
      SELECT id, title, city, country, city_latitude, city_longitude, created_at
      FROM trips 
      WHERE id = 122
    `);
    
    if (tripResult.rows.length > 0) {
      const trip = tripResult.rows[0];
      console.log('\n=== Trip 122 Details ===');
      console.log('Title:', trip.title);
      console.log('City:', trip.city);
      console.log('Country:', trip.country);
      console.log('City Coords:', trip.city_latitude, trip.city_longitude);
      console.log('Created:', trip.created_at);
      
      // Get all activities
      const activitiesResult = await client.query(`
        SELECT title, location_name, latitude, longitude, date, time
        FROM activities 
        WHERE trip_id = 122
        ORDER BY date, time
      `);
      
      console.log(`\n=== Activities (${activitiesResult.rows.length} total) ===\n`);
      
      const uniqueCoords = new Set();
      const coordCounts = {};
      
      activitiesResult.rows.forEach((activity, i) => {
        console.log(`${i + 1}. ${activity.title}`);
        console.log(`   Date/Time: ${activity.date} at ${activity.time}`);
        console.log(`   Location: ${activity.location_name || 'N/A'}`);
        console.log(`   Coords: ${activity.latitude || 'null'}, ${activity.longitude || 'null'}`);
        
        // Check if coordinates make sense for the city
        if (activity.latitude && activity.longitude) {
          const coordKey = `${activity.latitude},${activity.longitude}`;
          uniqueCoords.add(coordKey);
          coordCounts[coordKey] = (coordCounts[coordKey] || 0) + 1;
          
          const lat = parseFloat(activity.latitude);
          const lon = parseFloat(activity.longitude);
          
          // Check if in Germany (roughly)
          if (lat < 47 || lat > 55 || lon < 5.8 || lon > 15.1) {
            console.log(`   ⚠️  WARNING: Coordinates appear to be outside Germany!`);
          }
        } else {
          console.log(`   ❌ No coordinates`);
        }
        console.log('');
      });
      
      console.log('\n=== Analysis ===');
      console.log(`Total activities: ${activitiesResult.rows.length}`);
      console.log(`Unique coordinate locations: ${uniqueCoords.size}`);
      console.log(`Activities per coordinate:`);
      
      Object.entries(coordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([coord, count]) => {
          if (count > 1) {
            console.log(`  ${coord}: ${count} activities (stacked!)`);
          }
        });
      
      if (uniqueCoords.size === activitiesResult.rows.length) {
        console.log('\n✅ PERFECT! Every activity has unique coordinates!');
      } else if (uniqueCoords.size >= activitiesResult.rows.length * 0.7) {
        console.log('\n✅ Good - Most activities have unique coordinates');
      } else if (uniqueCoords.size >= activitiesResult.rows.length * 0.5) {
        console.log('\n⚠️  Moderate - Half the activities share coordinates');
      } else {
        console.log('\n❌ Poor - Most activities are stacked on same coordinates');
      }
      
    } else {
      console.log('Trip 122 not found');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkTrip122();