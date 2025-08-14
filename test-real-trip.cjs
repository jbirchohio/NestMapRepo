const fetch = require('node-fetch');
require('dotenv').config();

async function testRealTrip() {
  try {
    // First, login to get a token
    console.log('Logging in...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('Login failed, trying to register first...');
      
      // Try to register
      const registerResponse = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        })
      });
      
      if (!registerResponse.ok) {
        console.error('Registration failed');
        return;
      }
      
      // Login again
      const loginRetry = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });
      
      const loginData = await loginRetry.json();
      var token = loginData.token;
    } else {
      const loginData = await loginResponse.json();
      var token = loginData.token;
    }
    
    console.log('Logged in successfully');
    
    // Create a new test trip
    console.log('\nCreating a new trip...');
    const createTripResponse = await fetch('http://localhost:5000/api/trips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Test Trip with Real Places',
        city: 'Sigmaringen',
        country: 'Germany',
        start_date: '2025-09-01',
        end_date: '2025-09-03'
      })
    });
    
    const tripData = await createTripResponse.json();
    const tripId = tripData.id;
    console.log(`Created trip ID: ${tripId}`);
    
    // Generate weekend activities with real places
    console.log('\nGenerating weekend activities with REAL places from OpenStreetMap...');
    console.log('This will fetch real restaurants and attractions in Sigmaringen...\n');
    
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
    
    if (generateData.success) {
      console.log('✅ Successfully generated activities!');
      console.log(`Generated ${generateData.activitiesCreated} activities`);
      
      // Fetch the activities to see what was created
      const activitiesResponse = await fetch(`http://localhost:5000/api/trips/${tripId}/activities`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const activities = await activitiesResponse.json();
      
      console.log('\n=== Generated Activities with Real Places ===\n');
      
      activities.forEach((activity, i) => {
        console.log(`${i + 1}. ${activity.title}`);
        console.log(`   Location: ${activity.location_name || 'N/A'}`);
        console.log(`   Date: ${activity.date}`);
        console.log(`   Time: ${activity.time}`);
        console.log(`   Coordinates: ${activity.latitude || 'null'}, ${activity.longitude || 'null'}`);
        console.log('');
      });
      
      // Check how many have unique coordinates
      const uniqueCoords = new Set();
      activities.forEach(a => {
        if (a.latitude && a.longitude) {
          uniqueCoords.add(`${a.latitude},${a.longitude}`);
        }
      });
      
      console.log(`\n📍 Unique coordinate locations: ${uniqueCoords.size} out of ${activities.length} activities`);
      
      if (uniqueCoords.size < activities.length / 2) {
        console.log('⚠️  Warning: Many activities are using fallback coordinates');
      } else {
        console.log('✅ Good coordinate diversity - pins won\'t stack on the map!');
      }
      
    } else {
      console.error('Failed to generate activities:', generateData.error);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testRealTrip();