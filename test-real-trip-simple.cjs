require('dotenv').config();
const { Client } = require('pg');

async function testWithExistingTrip() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // Use existing trip 121
    const tripId = 121;
    
    console.log('\nTesting real place generation for trip 121...');
    console.log('This would fetch from OpenStreetMap:');
    console.log('- Real restaurants in Sigmaringen');
    console.log('- Real tourist attractions');
    console.log('- Real cafes and bakeries\n');
    
    // First, let's see what the Overpass API would return
    const fetch = require('node-fetch');
    
    // Get Sigmaringen bounding box
    const nominatimResponse = await fetch(
      'https://nominatim.openstreetmap.org/search?q=Sigmaringen%2C%20Germany&format=json&limit=1',
      { headers: { 'User-Agent': 'Remvana Test' } }
    );
    
    const cityData = await nominatimResponse.json();
    
    if (cityData.length > 0) {
      const bbox = cityData[0].boundingbox;
      
      // Query for restaurants
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["amenity"="restaurant"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
        );
        out body;
      `;
      
      const overpassResponse = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery,
        headers: { 'Content-Type': 'text/plain' }
      });
      
      const restaurants = await overpassResponse.json();
      
      console.log(`Found ${restaurants.elements.length} REAL restaurants in Sigmaringen:\n`);
      
      // Show first 5
      restaurants.elements.slice(0, 5).forEach((r, i) => {
        if (r.tags && r.tags.name) {
          console.log(`${i+1}. ${r.tags.name}`);
          console.log(`   Cuisine: ${r.tags.cuisine || 'not specified'}`);
          console.log(`   Exact GPS: ${r.lat}, ${r.lon}`);
          console.log('');
        }
      });
      
      console.log('These are REAL places with EXACT coordinates!');
      console.log('No more made-up names or stacked pins!\n');
      
      // Show what the AI would receive
      console.log('=== What GPT-3.5 would see ===');
      console.log('REAL PLACES IN Sigmaringen (from OpenStreetMap):');
      console.log('\nRestaurants:');
      restaurants.elements.slice(0, 8).forEach(r => {
        if (r.tags && r.tags.name) {
          console.log(`- ${r.tags.name}${r.tags.cuisine ? ` (${r.tags.cuisine})` : ''}`);
        }
      });
      
      console.log('\nThe AI would then select from these REAL places for the itinerary.');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

testWithExistingTrip();
