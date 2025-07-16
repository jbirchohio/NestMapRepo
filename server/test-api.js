const testEndpoints = async () => {
  try {
    // Test health check endpoint
    console.log('Testing health check endpoint...');
    const healthRes = await fetch('http://localhost:3001/api/health');
    const healthData = await healthRes.json();
    console.log('Health check response:', healthData);

    // Test trip templates endpoint
    console.log('\nTesting trip templates endpoint...');
    const templatesRes = await fetch('http://localhost:3001/api/templates');
    const templatesData = await templatesRes.json();
    console.log('Templates response:', templatesData);

    // Test creating a trip from template
    console.log('\nTesting create trip from template...');
    const createTripRes = await fetch('http://localhost:3001/api/templates/beach-getaway/create-trip', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: '2025-08-01',
        userId: 'test-user-123'
      })
    });
    const createTripData = await createTripRes.json();
    console.log('Create trip response:', createTripData);

  } catch (error) {
    console.error('Error testing API:', error);
  }
};

testEndpoints();
