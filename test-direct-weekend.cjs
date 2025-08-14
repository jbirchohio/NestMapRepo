const { Client } = require('pg');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
require('dotenv').config();

async function testDirectWeekend() {
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
    console.log('\n1. Creating new trip for testing...');
    const createResponse = await fetch('http://localhost:5000/api/trips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Direct Weekend Test',
        city: 'Sigmaringen',
        country: 'Germany',
        start_date: '2025-09-20',
        end_date: '2025-09-22'
      })
    });
    
    const tripData = await createResponse.json();
    const tripId = tripData.id;
    console.log(`   Created trip ${tripId}`);
    
    // Generate weekend
    console.log('\n2. Calling generate-weekend endpoint...');
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
    console.log('\n3. Activities created:\n');
    
    const activitiesResult = await client.query(`
      SELECT title, location_name, latitude, longitude
      FROM activities
      WHERE trip_id = $1
      ORDER BY date, "order"
    `, [tripId]);
    
    activitiesResult.rows.forEach((activity, i) => {
      console.log(`${i+1}. ${activity.title}`);
      console.log(`   Location: ${activity.location_name}`);
      console.log(`   GPS: ${activity.latitude}, ${activity.longitude}`);
      console.log('');
    });
    
    // Check for unique coordinates
    const coords = new Set();
    activitiesResult.rows.forEach(a => {
      if (a.latitude && a.longitude) {
        coords.add(`${a.latitude},${a.longitude}`);
      }
    });
    
    console.log(`\n=== RESULTS ===`);
    console.log(`Total activities: ${activitiesResult.rows.length}`);
    console.log(`Unique coordinates: ${coords.size}`);
    
    if (coords.size === activitiesResult.rows.length) {
      console.log('\n✅ SUCCESS! All activities have unique, real coordinates!');
    } else {
      console.log('\n⚠️  Some activities share coordinates');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

// Wait a bit for server to start
setTimeout(() => {
  testDirectWeekend();
}, 3000);