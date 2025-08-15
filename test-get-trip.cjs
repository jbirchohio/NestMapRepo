const fetch = require('node-fetch');

async function testGetTrip() {
  console.log('==========================================');
  console.log('Testing GET /trips/:id Response');
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
        title: 'Debug Trip',
        city: 'Berlin',
        country: 'Germany',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      })
    });
    
    const trip = await tripRes.json();
    console.log(`✅ Trip created with ID: ${trip.id}\n`);
    
    console.log('3. Fields in POST response:');
    const postFields = Object.keys(trip).sort();
    postFields.forEach(field => {
      if (field.toLowerCase().includes('regenerat')) {
        console.log(`   ✅ ${field}: ${trip[field]}`);
      }
    });
    
    // 3. Get the trip
    console.log('\n4. Fetching trip with GET /trips/:id...');
    const getTripRes = await fetch(`http://localhost:5000/api/trips/${trip.id}`, {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    
    const fetchedTrip = await getTripRes.json();
    
    console.log('\n5. Fields in GET response:');
    const getFields = Object.keys(fetchedTrip).sort();
    getFields.forEach(field => {
      if (field.toLowerCase().includes('regenerat')) {
        console.log(`   ✅ ${field}: ${fetchedTrip[field]}`);
      }
    });
    
    // Compare fields
    console.log('\n6. Field comparison:');
    console.log(`   POST response has ${postFields.length} fields`);
    console.log(`   GET response has ${getFields.length} fields`);
    
    const missingInGet = postFields.filter(f => !getFields.includes(f));
    if (missingInGet.length > 0) {
      console.log('\n   ❌ Fields missing in GET response:');
      missingInGet.forEach(field => {
        console.log(`      - ${field}`);
      });
    }
    
    // List all fields for debugging
    console.log('\n7. All fields in GET response:');
    getFields.forEach(field => {
      console.log(`   - ${field}`);
    });
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testGetTrip();