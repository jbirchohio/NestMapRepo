const fetch = require('node-fetch');

async function testRegenerations() {
  console.log('==========================================');
  console.log('Testing Regeneration Feature Availability');
  console.log('==========================================\n');
  
  try {
    // 1. Setup
    console.log('1. Setting up test user...');
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
    
    const registerData = await registerRes.json();
    const token = registerData.token;
    console.log('✅ User authenticated\n');
    
    // 2. Create a trip
    console.log('2. Creating a test trip...');
    const tripRes = await fetch('http://localhost:5000/api/trips', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Test Trip for Regenerations',
        city: 'Berlin',
        country: 'Germany',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      })
    });
    
    const trip = await tripRes.json();
    console.log(`✅ Trip created with ID: ${trip.id}\n`);
    
    // Check regeneration fields
    console.log('3. Checking regeneration fields:');
    console.log(`   aiRegenerationsLimit: ${trip.aiRegenerationsLimit}`);
    console.log(`   aiRegenerationsUsed: ${trip.aiRegenerationsUsed}`);
    
    if (trip.aiRegenerationsLimit === undefined) {
      console.log('   ❌ aiRegenerationsLimit is undefined!');
    } else {
      console.log(`   ✅ Limit is set to ${trip.aiRegenerationsLimit}`);
    }
    
    if (trip.aiRegenerationsUsed === undefined) {
      console.log('   ❌ aiRegenerationsUsed is undefined!');
    } else {
      console.log(`   ✅ Used count is ${trip.aiRegenerationsUsed}`);
    }
    
    // 3. Get the trip to check if fields are returned
    console.log('\n4. Fetching trip details...');
    const getTripRes = await fetch(`http://localhost:5000/api/trips/${trip.id}`, {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    
    const fetchedTrip = await getTripRes.json();
    console.log(`   GET /trips/${trip.id} response:`);
    console.log(`   aiRegenerationsLimit: ${fetchedTrip.aiRegenerationsLimit}`);
    console.log(`   aiRegenerationsUsed: ${fetchedTrip.aiRegenerationsUsed}`);
    
    // 4. Create an activity and check regeneration
    console.log('\n5. Creating an activity...');
    const activityRes = await fetch('http://localhost:5000/api/activities', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        trip_id: trip.id,
        title: 'Test Activity',
        date: new Date().toISOString().split('T')[0],
        time: '14:00',
        location_name: 'Test Location'
      })
    });
    
    const activity = await activityRes.json();
    console.log(`✅ Activity created with ID: ${activity.id}`);
    
    // 5. Try to regenerate the activity
    console.log('\n6. Testing regenerate endpoint...');
    const regenerateRes = await fetch('http://localhost:5000/api/ai/regenerate-activity', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        activity_id: activity.id,
        trip_id: trip.id
      })
    });
    
    if (regenerateRes.ok) {
      const regenerateData = await regenerateRes.json();
      console.log('✅ Regeneration successful!');
      console.log(`   Remaining regenerations: ${regenerateData.regenerations_remaining}`);
    } else {
      const error = await regenerateRes.json();
      console.log('❌ Regeneration failed:', error.error);
    }
    
    // Summary
    console.log('\n==========================================');
    console.log('Summary');
    console.log('==========================================');
    
    if (trip.aiRegenerationsLimit !== undefined && trip.aiRegenerationsUsed !== undefined) {
      console.log('✅ Regeneration fields are present in trip data');
      console.log('✅ Regenerate button should be visible in UI');
    } else {
      console.log('❌ Regeneration fields are missing from trip data');
      console.log('❌ This is why the regenerate button is not showing');
      console.log('\nPossible causes:');
      console.log('1. Fields not being selected in SQL queries');
      console.log('2. Case conversion middleware stripping them out');
      console.log('3. Storage layer not returning these fields');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testRegenerations();