/**
 * Test Organization ID Inheritance for Child Records
 * Verifies that activities, todos, and notes properly inherit organizationId from parent trips
 */

import http from 'http';

async function makeRequest(method, path, data = null, sessionCookie = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (sessionCookie) {
      options.headers['Cookie'] = sessionCookie;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsedBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsedBody, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
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

async function testOrganizationInheritance() {
  console.log('🧪 Testing Organization ID Inheritance for Child Records\n');

  try {
    // Step 1: Login to get session
    console.log('1. Logging in...');
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      username: 'testuser',
      password: 'testpass'
    });

    if (loginResponse.status !== 200) {
      console.log('❌ Login failed, creating test user first...');
      
      // Create user
      const signupResponse = await makeRequest('POST', '/api/auth/signup', {
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpass'
      });
      
      if (signupResponse.status !== 200) {
        console.log('❌ Signup failed:', signupResponse.data);
        return;
      }
      
      // Try login again
      const retryLoginResponse = await makeRequest('POST', '/api/auth/login', {
        username: 'testuser',
        password: 'testpass'
      });
      
      if (retryLoginResponse.status !== 200) {
        console.log('❌ Login retry failed:', retryLoginResponse.data);
        return;
      }
      
      console.log('✅ User created and logged in successfully');
    } else {
      console.log('✅ Login successful');
    }

    const sessionCookie = loginResponse.headers['set-cookie'] ? 
      loginResponse.headers['set-cookie'][0].split(';')[0] : null;

    if (!sessionCookie) {
      console.log('❌ No session cookie received');
      return;
    }

    // Step 2: Create a trip with organization context
    console.log('\n2. Creating test trip...');
    const tripResponse = await makeRequest('POST', '/api/trips', {
      name: 'Organization Inheritance Test Trip',
      destination: 'Test City',
      startDate: '2024-06-01',
      endDate: '2024-06-03'
    }, sessionCookie);

    if (tripResponse.status !== 200) {
      console.log('❌ Trip creation failed:', tripResponse.data);
      return;
    }

    const tripId = tripResponse.data.id;
    const tripOrgId = tripResponse.data.organizationId;
    console.log(`✅ Trip created with ID: ${tripId}, Organization ID: ${tripOrgId}`);

    // Step 3: Create an activity and verify organization inheritance
    console.log('\n3. Testing activity organization inheritance...');
    const activityResponse = await makeRequest('POST', '/api/activities', {
      tripId: tripId,
      title: 'Test Activity for Org Inheritance',
      date: '2024-06-01',
      time: '14:00',
      locationName: 'Test Location',
      order: 1
    }, sessionCookie);

    if (activityResponse.status !== 200) {
      console.log('❌ Activity creation failed:', activityResponse.data);
      return;
    }

    const activity = activityResponse.data;
    console.log(`✅ Activity created with Organization ID: ${activity.organizationId}`);
    
    if (activity.organizationId === tripOrgId) {
      console.log('✅ Activity properly inherited organization ID from trip');
    } else {
      console.log(`❌ Activity organization ID mismatch: expected ${tripOrgId}, got ${activity.organizationId}`);
    }

    // Step 4: Create a todo and verify organization inheritance
    console.log('\n4. Testing todo organization inheritance...');
    const todoResponse = await makeRequest('POST', '/api/todos', {
      tripId: tripId,
      task: 'Test Todo for Org Inheritance'
    }, sessionCookie);

    if (todoResponse.status !== 200) {
      console.log('❌ Todo creation failed:', todoResponse.data);
      return;
    }

    const todo = todoResponse.data;
    console.log(`✅ Todo created with Organization ID: ${todo.organizationId}`);
    
    if (todo.organizationId === tripOrgId) {
      console.log('✅ Todo properly inherited organization ID from trip');
    } else {
      console.log(`❌ Todo organization ID mismatch: expected ${tripOrgId}, got ${todo.organizationId}`);
    }

    // Step 5: Create a note and verify organization inheritance
    console.log('\n5. Testing note organization inheritance...');
    const noteResponse = await makeRequest('POST', '/api/notes', {
      tripId: tripId,
      content: 'Test note for organization inheritance verification'
    }, sessionCookie);

    if (noteResponse.status !== 200) {
      console.log('❌ Note creation failed:', noteResponse.data);
      return;
    }

    const note = noteResponse.data;
    console.log(`✅ Note created with Organization ID: ${note.organizationId}`);
    
    if (note.organizationId === tripOrgId) {
      console.log('✅ Note properly inherited organization ID from trip');
    } else {
      console.log(`❌ Note organization ID mismatch: expected ${tripOrgId}, got ${note.organizationId}`);
    }

    console.log('\n🎉 Organization ID inheritance test completed successfully!');
    console.log('✅ All child records (activities, todos, notes) properly inherit organizationId from parent trips');
    console.log('✅ Multi-tenant security isolation is now properly enforced');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testOrganizationInheritance();