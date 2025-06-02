// Run this in browser console to test field transformations
const testFieldTransformations = async () => {
  console.log('=== TESTING FIELD TRANSFORMATIONS ===');
  
  // Test 1: Create trip with camelCase input
  console.log('\n1. Testing trip creation with camelCase input...');
  try {
    const response = await fetch('/api/trips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': localStorage.getItem('sb-auth-token') ? `Bearer ${JSON.parse(localStorage.getItem('sb-auth-token')).access_token}` : ''
      },
      body: JSON.stringify({
        title: 'Field Transform Test Trip',
        startDate: '2025-07-01T00:00:00.000Z',
        endDate: '2025-07-05T00:00:00.000Z',
        isPublic: false,
        sharingEnabled: true,
        sharePermission: 'read-only',
        city: 'Test City'
      })
    });
    
    const result = await response.json();
    console.log('Trip creation status:', response.status);
    console.log('Trip creation result:', result);
    
    if (response.ok && result.id) {
      // Test 2: Verify the created trip has snake_case fields in database but camelCase in response
      console.log('\n2. Testing trip retrieval field format...');
      const getResponse = await fetch(`/api/trips/${result.id}`, {
        headers: {
          'Authorization': localStorage.getItem('sb-auth-token') ? `Bearer ${JSON.parse(localStorage.getItem('sb-auth-token')).access_token}` : ''
        }
      });
      const tripData = await getResponse.json();
      console.log('Retrieved trip data:', tripData);
      
      // Test 3: Create activity for the trip
      console.log('\n3. Testing activity creation with camelCase input...');
      const activityResponse = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('sb-auth-token') ? `Bearer ${JSON.parse(localStorage.getItem('sb-auth-token')).access_token}` : ''
        },
        body: JSON.stringify({
          title: 'Test Activity',
          date: '2025-07-02T00:00:00.000Z',
          time: '10:00',
          tripId: result.id,
          locationName: 'Test Location',
          assignedTo: 'Test User',
          travelMode: 'car'
        })
      });
      
      const activityResult = await activityResponse.json();
      console.log('Activity creation status:', activityResponse.status);
      console.log('Activity creation result:', activityResult);
      
      // Test 4: Update trip with camelCase input
      console.log('\n4. Testing trip update with camelCase input...');
      const updateResponse = await fetch(`/api/trips/${result.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('sb-auth-token') ? `Bearer ${JSON.parse(localStorage.getItem('sb-auth-token')).access_token}` : ''
        },
        body: JSON.stringify({
          title: 'Updated Field Transform Test Trip',
          isPublic: true,
          budget: 5000
        })
      });
      
      const updateResult = await updateResponse.json();
      console.log('Trip update status:', updateResponse.status);
      console.log('Trip update result:', updateResult);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
  
  // Test 5: Corporate trips endpoint
  console.log('\n5. Testing corporate trips endpoint...');
  try {
    const corpResponse = await fetch('/api/trips/corporate', {
      headers: {
        'Authorization': localStorage.getItem('sb-auth-token') ? `Bearer ${JSON.parse(localStorage.getItem('sb-auth-token')).access_token}` : ''
      }
    });
    const corpTrips = await corpResponse.json();
    console.log('Corporate trips status:', corpResponse.status);
    console.log('Corporate trips sample:', corpTrips.slice(0, 2));
  } catch (error) {
    console.error('Corporate trips test error:', error);
  }
  
  console.log('\n=== FIELD TRANSFORMATION TESTS COMPLETE ===');
};

// Instructions for running
console.log('To test field transformations, run: testFieldTransformations()');