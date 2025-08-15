const fetch = require('node-fetch');

async function testTravelMode() {
  console.log('==========================================');
  console.log('Testing Travel Mode Update');
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
        title: 'Test Trip',
        city: 'Berlin',
        country: 'Germany',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      })
    });
    
    const trip = await tripRes.json();
    console.log(`✅ Trip created with ID: ${trip.id}\n`);
    
    // 3. Create an activity
    console.log('3. Creating an activity...');
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
        location_name: 'Test Location',
        travel_mode: 'walking'
      })
    });
    
    const activity = await activityRes.json();
    console.log(`✅ Activity created with ID: ${activity.id}`);
    console.log(`   Initial travel mode: ${activity.travelMode || 'not set'}\n`);
    
    // 4. Update travel mode to driving
    console.log('4. Updating travel mode to driving...');
    const updateRes = await fetch(`http://localhost:5000/api/activities/${activity.id}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        travelMode: 'driving'
      })
    });
    
    if (!updateRes.ok) {
      const error = await updateRes.text();
      console.log(`❌ Update failed: ${updateRes.status}`);
      console.log(`   Error: ${error}`);
      return;
    }
    
    const updatedActivity = await updateRes.json();
    console.log(`✅ Activity updated`);
    console.log(`   New travel mode: ${updatedActivity.travelMode || 'not set'}\n`);
    
    // 5. Fetch the activity to verify
    console.log('5. Fetching activity to verify...');
    const getRes = await fetch(`http://localhost:5000/api/activities/${activity.id}`, {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    
    const fetchedActivity = await getRes.json();
    console.log(`   Travel mode in database: ${fetchedActivity.travelMode || 'not set'}`);
    
    // Summary
    console.log('\n==========================================');
    console.log('Summary');
    console.log('==========================================');
    if (fetchedActivity.travelMode === 'driving') {
      console.log('✅ Travel mode update is working correctly');
    } else {
      console.log('❌ Travel mode update is not working');
      console.log('   Expected: driving');
      console.log(`   Got: ${fetchedActivity.travelMode}`);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testTravelMode();