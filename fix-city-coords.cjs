const { Client } = require('pg');
require('dotenv').config();

async function fixCityCoords() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // Correct coordinates for Sigmaringen city center
    const sigmaringenLat = 48.08703;
    const sigmaringenLng = 9.216673;
    
    console.log(`Updating trip 120 city coordinates to: ${sigmaringenLat}, ${sigmaringenLng}`);
    
    await client.query(`
      UPDATE trips 
      SET city_latitude = $1, city_longitude = $2
      WHERE id = 120
    `, [sigmaringenLat, sigmaringenLng]);
    
    console.log('✓ City coordinates updated successfully');
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

fixCityCoords();
