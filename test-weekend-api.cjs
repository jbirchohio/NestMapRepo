const fetch = require('node-fetch');

async function testWeekendItinerary() {
  console.log('Testing weekend itinerary with OSM data...\n');
  
  try {
    // 1. Login to get token
    console.log('1. Logging in...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'jbirchohio@gmail.com',
        password: 'OopsieDoodle1!'
      })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status}`);
    }
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✅ Logged in successfully\n');
    
    // 2. Get user's trips
    console.log('2. Getting user trips...');
    const tripsRes = await fetch('http://localhost:5000/api/trips', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const trips = await tripsRes.json();
    console.log(`Found ${trips.length} trips`);
    
    let tripId;
    if (trips.length > 0) {
      tripId = trips[0].id;
      console.log(`Using existing trip ID: ${tripId}\n`);
    } else {
      // Create a new trip
      console.log('Creating new trip...');
      const newTripRes = await fetch('http://localhost:5000/api/trips', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Berlin Weekend Test',
          city: 'Berlin',
          country: 'Germany',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
        })
      });
      
      const newTrip = await newTripRes.json();
      tripId = newTrip.id;
      console.log(`Created new trip ID: ${tripId}\n`);
    }
    
    // 3. Test weekend itinerary generation
    console.log('3. Generating weekend itinerary for Berlin...');
    console.log('This will use the OSM batch fetch with caching...\n');
    
    const startTime = Date.now();
    
    const itineraryRes = await fetch('http://localhost:5000/api/ai/weekend-itinerary', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        trip_id: tripId,
        destination: 'Berlin, Germany',
        trip_type: 'adventure'
      })
    });
    
    const elapsed = Date.now() - startTime;
    
    if (!itineraryRes.ok) {
      const error = await itineraryRes.text();
      throw new Error(`Itinerary generation failed: ${error}`);
    }
    
    const itinerary = await itineraryRes.json();
    
    console.log(`✅ Itinerary generated in ${elapsed}ms\n`);
    console.log('Response summary:');
    console.log(`- Success: ${itinerary.success}`);
    console.log(`- Days generated: ${itinerary.itinerary?.days?.length || 0}`);
    
    if (itinerary.itinerary?.days?.[0]) {
      const day1 = itinerary.itinerary.days[0];
      console.log(`\nDay 1 (${day1.date}):`);
      day1.activities.forEach((activity, i) => {
        console.log(`  ${i + 1}. ${activity.time}: ${activity.title}`);
        if (activity.location) {
          console.log(`     📍 ${activity.location}`);
        }
      });
    }
    
    // 4. Test again to see if cache is working
    console.log('\n4. Testing cache (second request should be faster)...');
    
    const startTime2 = Date.now();
    
    const itineraryRes2 = await fetch('http://localhost:5000/api/ai/weekend-itinerary', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        trip_id: tripId,
        destination: 'Berlin, Germany',
        trip_type: 'adventure'
      })
    });
    
    const elapsed2 = Date.now() - startTime2;
    
    console.log(`✅ Second request completed in ${elapsed2}ms`);
    console.log(`Cache improvement: ${Math.round((elapsed - elapsed2) / elapsed * 100)}% faster\n`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testWeekendItinerary();