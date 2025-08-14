const { Client } = require('pg');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
require('dotenv').config();

async function testRealPlaces() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // Get a user
    const userResult = await client.query(`
      SELECT id, email FROM users LIMIT 1
    `);
    
    if (userResult.rows.length === 0) {
      console.log('No users found');
      return;
    }
    
    const user = userResult.rows[0];
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Create a new trip
    console.log('\n1. Creating new trip for testing real places...');
    const createResponse = await fetch('http://localhost:5000/api/trips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Real OSM Places Test',
        city: 'Sigmaringen',
        country: 'Germany',
        start_date: '2025-09-15',
        end_date: '2025-09-17'
      })
    });
    
    const tripData = await createResponse.json();
    const tripId = tripData.id;
    console.log(`   Created trip ${tripId}`);
    
    // Generate weekend with REAL places
    console.log('\n2. Generating weekend activities with REAL OpenStreetMap places...');
    console.log('   This should fetch real restaurants like:');
    console.log('   - King\'s Garden (Chinese)');
    console.log('   - Gasthof Adler (real one at GPS 48.109, 9.143)');
    console.log('   - Restaurant Gutshof Käppeler\n');
    
    const generateResponse = await fetch('http://localhost:5000/api/ai/generate-weekend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        trip_id: tripId,
        destination: 'Sigmaringen, Germany',
        duration: 3
      })
    });
    
    const generateData = await generateResponse.json();
    
    if (!generateData.success) {
      console.error('Failed:', generateData.error);
      return;
    }
    
    console.log(`   ✅ Generated ${generateData.activities?.length || 0} activities`);
    
    // Check the activities
    console.log('\n3. Checking if we got REAL places with unique coordinates...\n');
    
    const activitiesResult = await client.query(`
      SELECT title, location_name, latitude, longitude
      FROM activities
      WHERE trip_id = $1
      ORDER BY id
    `, [tripId]);
    
    const uniqueCoords = new Set();
    const realPlaceNames = [
      'king', 'garden', 'gasthof', 'adler', 'gutshof', 'käppeler',
      'krone', 'mühle', 'sonne', 'donauperle', 'rockk', 'steakhouse',
      'alter fritz', 'donauhirsch', 'schloßblick', 'borrenfelsen'
    ];
    
    let realPlaceCount = 0;
    
    activitiesResult.rows.forEach((activity, i) => {
      const hasRealName = realPlaceNames.some(name => 
        activity.title?.toLowerCase().includes(name) || 
        activity.location_name?.toLowerCase().includes(name)
      );
      
      if (hasRealName) {
        console.log(`   ✅ ${activity.title} - REAL PLACE!`);
        realPlaceCount++;
      } else {
        console.log(`   ❓ ${activity.title} - might be made up`);
      }
      
      console.log(`      Location: ${activity.location_name || 'N/A'}`);
      console.log(`      GPS: ${activity.latitude}, ${activity.longitude}`);
      
      if (activity.latitude && activity.longitude) {
        uniqueCoords.add(`${activity.latitude},${activity.longitude}`);
      }
      console.log('');
    });
    
    console.log('\n=== RESULTS ===');
    console.log(`Real places used: ${realPlaceCount} out of ${activitiesResult.rows.length}`);
    console.log(`Unique coordinates: ${uniqueCoords.size} out of ${activitiesResult.rows.length}`);
    
    if (realPlaceCount >= activitiesResult.rows.length * 0.5) {
      console.log('\n✅ SUCCESS! Using real places from OpenStreetMap!');
    } else {
      console.log('\n❌ Still making up places - OpenStreetMap integration needs work');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

testRealPlaces();