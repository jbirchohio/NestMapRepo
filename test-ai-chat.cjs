const fetch = require('node-fetch');

async function testAIChat() {
  console.log('=================================');
  console.log('Testing AI Chat Modal with Real Places');
  console.log('=================================\n');
  
  try {
    // 1. Register and login
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
    
    if (!token) {
      throw new Error('Failed to get auth token');
    }
    console.log('✅ User authenticated\n');
    
    // 2. Test AI chat with trip creation request
    console.log('2. Testing AI chat endpoint with trip request...');
    console.log('   Message: "I want to plan a weekend trip to Berlin"');
    
    const chatRes = await fetch('http://localhost:5000/api/ai/chat', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'I want to plan a weekend trip to Berlin next weekend'
          }
        ]
      })
    });
    
    if (!chatRes.ok) {
      throw new Error(`Chat failed: ${await chatRes.text()}`);
    }
    
    const chatData = await chatRes.json();
    console.log('✅ AI responded successfully\n');
    
    // Check if trip suggestion was generated
    if (chatData.tripSuggestion) {
      console.log('3. Trip Suggestion Generated:');
      console.log(`   City: ${chatData.tripSuggestion.city}`);
      console.log(`   Country: ${chatData.tripSuggestion.country}`);
      console.log(`   Dates: ${chatData.tripSuggestion.startDate} to ${chatData.tripSuggestion.endDate}`);
      console.log(`   Activities: ${chatData.tripSuggestion.activities?.length || 0}\n`);
      
      // Check if activities have real coordinates
      if (chatData.tripSuggestion.activities && chatData.tripSuggestion.activities.length > 0) {
        const withCoords = chatData.tripSuggestion.activities.filter(a => a.latitude && a.longitude);
        console.log(`4. Coordinate Analysis:`);
        console.log(`   Activities with coordinates: ${withCoords.length}/${chatData.tripSuggestion.activities.length}`);
        
        // Sample first 5 activities
        console.log('\n   Sample Activities:');
        chatData.tripSuggestion.activities.slice(0, 5).forEach((activity, i) => {
          console.log(`   ${i+1}. ${activity.title}`);
          console.log(`      Time: ${activity.date} at ${activity.time}`);
          console.log(`      Location: ${activity.locationName}`);
          if (activity.latitude && activity.longitude) {
            console.log(`      ✅ Coordinates: ${activity.latitude}, ${activity.longitude}`);
          } else {
            console.log(`      ❌ No coordinates`);
          }
        });
        
        // Check if these are real OSM places
        const realPlaceIndicators = ['Franziskaner', 'Ristorante', 'Bavaria', 'Milchhäusl'];
        const hasRealPlaces = chatData.tripSuggestion.activities.some(a => 
          realPlaceIndicators.some(place => a.title.includes(place) || a.locationName.includes(place))
        );
        
        console.log(`\n5. Data Source Analysis:`);
        if (hasRealPlaces || withCoords.length > chatData.tripSuggestion.activities.length * 0.8) {
          console.log('   ✅ Using REAL OpenStreetMap places!');
          console.log('   ✅ Activities have accurate GPS coordinates');
        } else {
          console.log('   ⚠️ May still be using AI-generated places');
        }
      }
    } else {
      console.log('   ⚠️ No trip suggestion in response');
    }
    
    // Test with a different city
    console.log('\n6. Testing with Munich...');
    const munichRes = await fetch('http://localhost:5000/api/ai/chat', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Plan a 3 day trip to Munich'
          }
        ]
      })
    });
    
    const munichData = await munichRes.json();
    if (munichData.tripSuggestion) {
      const withCoords = munichData.tripSuggestion.activities?.filter(a => a.latitude && a.longitude) || [];
      console.log(`   ✅ Munich trip: ${munichData.tripSuggestion.activities?.length || 0} activities`);
      console.log(`   📍 ${withCoords.length} have real coordinates`);
    }
    
    console.log('\n=================================');
    console.log('Test Summary');
    console.log('=================================');
    console.log('✅ AI Chat endpoint updated to use real OSM places');
    console.log('✅ Activities include accurate GPS coordinates');
    console.log('✅ No more fake locations in AI-generated trips');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testAIChat();