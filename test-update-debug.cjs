const fetch = require('node-fetch');

async function testUpdateDebug() {
  console.log('==========================================');
  console.log('Debug Activity Update Error');
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
    console.log(`✅ Activity created with ID: ${activity.id}\n`);
    
    // 4. Try to update exactly like the frontend does
    console.log('4. Updating activity (mimicking frontend)...');
    
    // This mimics what the frontend sends (in camelCase before middleware)
    const updatePayload = {
      title: activity.title,
      date: activity.date,
      time: activity.time,
      locationName: activity.locationName,
      latitude: activity.latitude,
      longitude: activity.longitude,
      notes: activity.notes || '',
      tag: activity.tag || '',
      assignedTo: activity.assignedTo || '',
      tripId: trip.id, // Frontend sends this
      order: activity.order || 0,
      travelMode: 'driving' // The change we want to make
    };
    
    console.log('Sending update payload (camelCase):', JSON.stringify(updatePayload, null, 2));
    
    const updateRes = await fetch(`http://localhost:5000/api/activities/${activity.id}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });
    
    if (!updateRes.ok) {
      const error = await updateRes.json();
      console.log(`\n❌ Update failed with status ${updateRes.status}`);
      console.log('Error response:', JSON.stringify(error, null, 2));
      
      if (error.errors) {
        console.log('\nValidation errors:');
        error.errors.forEach(e => {
          console.log(`  - Field: ${e.path.join('.')}`);
          console.log(`    Message: ${e.message}`);
          console.log(`    Code: ${e.code}`);
        });
      }
    } else {
      const updatedActivity = await updateRes.json();
      console.log('✅ Activity updated successfully');
      console.log(`   New travel mode: ${updatedActivity.travelMode}`);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testUpdateDebug();