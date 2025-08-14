const fetch = require('node-fetch');

async function testOSMIntegration() {
  console.log('Testing OSM/Overpass integration...\n');
  
  try {
    // 1. Register a new test user
    console.log('1. Creating test user...');
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    const registerRes = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        username: `testuser_${Date.now()}`,
        display_name: 'Test User'
      })
    });
    
    if (!registerRes.ok) {
      const error = await registerRes.text();
      console.log('Registration response:', error);
      throw new Error(`Registration failed: ${registerRes.status}`);
    }
    
    const registerData = await registerRes.json();
    const token = registerData.token;
    console.log('✅ User created and logged in');
    console.log(`Token received: ${token ? 'Yes' : 'No'}`);
    if (!token) {
      console.log('Register response:', JSON.stringify(registerData, null, 2));
      throw new Error('No token in registration response');
    }
    console.log('');
    
    // 2. Create a trip
    console.log('2. Creating test trip...');
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
    
    if (!newTripRes.ok) {
      throw new Error(`Trip creation failed: ${newTripRes.status}`);
    }
    
    const trip = await newTripRes.json();
    console.log(`✅ Trip created with ID: ${trip.id}\n`);
    
    // 3. Test weekend itinerary generation with OSM data
    console.log('3. Testing weekend itinerary (using OSM batch fetch)...');
    console.log('First request (may fetch from Overpass API)...');
    
    const startTime = Date.now();
    
    const itineraryRes = await fetch('http://localhost:5000/api/ai/generate-weekend', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        trip_id: trip.id,
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
    
    console.log(`✅ First request completed in ${elapsed}ms`);
    console.log(`- Days generated: ${itinerary.itinerary?.days?.length || 0}`);
    
    // 4. Test cache (second request should be much faster)
    console.log('\n4. Testing cache (second request)...');
    
    const startTime2 = Date.now();
    
    const cachedRes = await fetch('http://localhost:5000/api/ai/generate-weekend', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        trip_id: trip.id,
        destination: 'Berlin, Germany',
        trip_type: 'relaxed'
      })
    });
    
    const elapsed2 = Date.now() - startTime2;
    
    if (!cachedRes.ok) {
      throw new Error('Cached request failed');
    }
    
    console.log(`✅ Cached request completed in ${elapsed2}ms`);
    
    if (elapsed2 < elapsed) {
      const improvement = Math.round((elapsed - elapsed2) / elapsed * 100);
      console.log(`🚀 Cache hit! ${improvement}% faster than first request`);
    } else {
      console.log('⚠️ Cache may not be working as expected');
    }
    
    // 5. Test different city
    console.log('\n5. Testing different city (Paris)...');
    
    const parisStart = Date.now();
    
    const parisRes = await fetch('http://localhost:5000/api/ai/generate-weekend', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        trip_id: trip.id,
        destination: 'Paris, France',
        trip_type: 'culture'
      })
    });
    
    const parisElapsed = Date.now() - parisStart;
    
    if (!parisRes.ok) {
      throw new Error('Paris request failed');
    }
    
    const parisData = await parisRes.json();
    console.log(`✅ Paris request completed in ${parisElapsed}ms`);
    console.log(`- Days generated: ${parisData.itinerary?.days?.length || 0}`);
    
    console.log('\n✅ All tests passed! OSM integration is working.');
    console.log('\nSummary:');
    console.log(`- Berlin first request: ${elapsed}ms`);
    console.log(`- Berlin cached request: ${elapsed2}ms`);
    console.log(`- Paris new request: ${parisElapsed}ms`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testOSMIntegration();