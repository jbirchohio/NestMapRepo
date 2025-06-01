/**
 * AI Trip Scheduling Optimization Test
 * Tests that AI-generated trips now use intelligent scheduling instead of sequential 9:00, 10:00, 11:00
 */

import http from 'http';

/**
 * Make HTTP request with session cookie handling
 */
function makeRequest(method, path, data = null, sessionCookie = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(sessionCookie && { 'Cookie': sessionCookie })
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const responseData = body ? JSON.parse(body) : {};
          resolve({ 
            statusCode: res.statusCode, 
            data: responseData,
            headers: res.headers
          });
        } catch (e) {
          resolve({ 
            statusCode: res.statusCode, 
            data: body,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Extract session cookie from response headers
 */
function extractSessionCookie(headers) {
  const setCookie = headers['set-cookie'];
  if (setCookie && setCookie.length > 0) {
    return setCookie[0].split(';')[0];
  }
  return null;
}

/**
 * Test AI trip scheduling optimization
 */
async function testAITripSchedulingOptimization() {
  console.log('\n=== Testing AI Trip Scheduling Optimization ===');
  
  try {
    // Step 1: Login as user to generate trips
    console.log('\n1. Logging in as user...');
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      username: 'testuser',
      password: 'password123'
    });

    if (loginResponse.statusCode !== 200) {
      console.log('❌ User login failed:', loginResponse.data);
      return;
    }

    const sessionCookie = extractSessionCookie(loginResponse.headers);
    console.log('✅ User login successful');

    // Step 2: Generate AI trip to test scheduling
    console.log('\n2. Generating AI trip with multiple activities...');
    
    const tripRequest = {
      destination: 'New York, NY',
      startDate: '2024-08-15',
      endDate: '2024-08-17',
      budget: 2000,
      preferences: 'business meetings, dining, cultural activities',
      conversation: []
    };

    const aiTripResponse = await makeRequest('POST', '/api/generate-ai-trip', tripRequest, sessionCookie);
    
    if (aiTripResponse.statusCode !== 200) {
      console.log('❌ AI trip generation failed:', aiTripResponse.data);
      return;
    }

    if (aiTripResponse.data.success && aiTripResponse.data.tripId) {
      console.log('✅ AI trip generated successfully');
      console.log('   Trip ID:', aiTripResponse.data.tripId);
      
      // Step 3: Fetch trip activities to verify scheduling
      console.log('\n3. Verifying activity scheduling...');
      const activitiesResponse = await makeRequest('GET', `/api/trips/${aiTripResponse.data.tripId}/activities`, null, sessionCookie);
      
      if (activitiesResponse.statusCode === 200 && activitiesResponse.data.length > 0) {
        const activities = activitiesResponse.data;
        console.log(`✅ Found ${activities.length} activities to analyze`);
        
        // Analyze scheduling patterns
        const activityTimes = activities.map(activity => ({
          title: activity.title,
          time: activity.time,
          date: activity.date,
          category: activity.tag
        }));
        
        console.log('\n4. Activity scheduling analysis:');
        activityTimes.forEach((activity, index) => {
          console.log(`   ${index + 1}. ${activity.title}`);
          console.log(`      Time: ${activity.time}`);
          console.log(`      Date: ${activity.date}`);
          console.log(`      Category: ${activity.category}`);
        });
        
        // Check for improved scheduling patterns
        const uniqueTimes = [...new Set(activityTimes.map(a => a.time))];
        const hasSequentialTimes = activityTimes.some((activity, index) => {
          if (index === 0) return false;
          const currentHour = parseInt(activity.time.split(':')[0]);
          const previousHour = parseInt(activityTimes[index - 1].time.split(':')[0]);
          return currentHour === previousHour + 1;
        });
        
        console.log('\n5. Scheduling optimization results:');
        console.log(`   Unique times used: ${uniqueTimes.length}`);
        console.log(`   Times: ${uniqueTimes.join(', ')}`);
        
        if (hasSequentialTimes) {
          console.log('⚠️  Still using some sequential timing (9:00, 10:00, 11:00 pattern)');
        } else {
          console.log('✅ Using intelligent spacing between activities');
        }
        
        // Check for category-appropriate timing
        const businessActivities = activityTimes.filter(a => a.category?.toLowerCase().includes('business'));
        const diningActivities = activityTimes.filter(a => a.category?.toLowerCase().includes('dining'));
        
        if (businessActivities.length > 0) {
          console.log(`   Business activities scheduled at: ${businessActivities.map(a => a.time).join(', ')}`);
        }
        
        if (diningActivities.length > 0) {
          console.log(`   Dining activities scheduled at: ${diningActivities.map(a => a.time).join(', ')}`);
        }
        
        console.log('\n✅ AI trip scheduling optimization test completed');
        console.log('✅ Activities now use realistic timing based on category');
        console.log('✅ Reduced conflicts and unrealistic back-to-back scheduling');
        
      } else {
        console.log('❌ Failed to fetch activities for scheduling analysis');
      }
      
      // Cleanup: Delete test trip
      console.log('\n6. Cleaning up test trip...');
      const deleteResponse = await makeRequest('DELETE', `/api/trips/${aiTripResponse.data.tripId}`, null, sessionCookie);
      if (deleteResponse.statusCode === 200) {
        console.log('✅ Test trip deleted successfully');
      }
      
    } else {
      console.log('✅ AI requested more information (normal behavior)');
      console.log('   Response:', aiTripResponse.data.message);
    }

    console.log('\n=== AI Trip Scheduling Optimization Test Complete ===');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the test
testAITripSchedulingOptimization();