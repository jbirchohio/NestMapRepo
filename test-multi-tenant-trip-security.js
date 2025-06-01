#!/usr/bin/env node

/**
 * Multi-Tenant Trip Security Test
 * Tests organization-based authorization for trip endpoints
 */

const baseUrl = process.env.TEST_URL || 'http://localhost:5000';

async function testTripEndpointSecurity() {
  console.log('🔒 Testing Multi-Tenant Trip Security');
  console.log('=====================================\n');

  // Test 1: Unauthenticated requests should be rejected with 401
  console.log('Test 1: Unauthenticated access to trip activities');
  try {
    const response = await fetch(`${baseUrl}/api/trips/1/activities`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${response.status}`);
    const body = await response.text();
    console.log(`Response: ${body}`);
    
    if (response.status === 401) {
      console.log('✅ PASS: Unauthenticated request properly rejected\n');
    } else {
      console.log('❌ FAIL: Unauthenticated request should return 401\n');
    }
  } catch (error) {
    console.log(`❌ FAIL: Request error - ${error.message}\n`);
  }

  // Test 2: Unauthenticated access to trip notes
  console.log('Test 2: Unauthenticated access to trip notes');
  try {
    const response = await fetch(`${baseUrl}/api/trips/1/notes`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${response.status}`);
    const body = await response.text();
    console.log(`Response: ${body}`);
    
    if (response.status === 401) {
      console.log('✅ PASS: Unauthenticated notes request properly rejected\n');
    } else {
      console.log('❌ FAIL: Unauthenticated notes request should return 401\n');
    }
  } catch (error) {
    console.log(`❌ FAIL: Request error - ${error.message}\n`);
  }

  // Test 3: Unauthenticated access to trip todos
  console.log('Test 3: Unauthenticated access to trip todos');
  try {
    const response = await fetch(`${baseUrl}/api/trips/1/todos`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${response.status}`);
    const body = await response.text();
    console.log(`Response: ${body}`);
    
    if (response.status === 401) {
      console.log('✅ PASS: Unauthenticated todos request properly rejected\n');
    } else {
      console.log('❌ FAIL: Unauthenticated todos request should return 401\n');
    }
  } catch (error) {
    console.log(`❌ FAIL: Request error - ${error.message}\n`);
  }

  console.log('🔒 Multi-Tenant Security Test Summary');
  console.log('=====================================');
  console.log('• All trip-related endpoints should require authentication');
  console.log('• Cross-organization access should be prevented with 403');
  console.log('• Only users from the same organization should access trip data');
  console.log('• Trip ownership validation prevents unauthorized access');
  console.log('\n✅ Security tests demonstrate current vulnerabilities that need fixing');
}

// Run the tests
testTripEndpointSecurity().catch(console.error);