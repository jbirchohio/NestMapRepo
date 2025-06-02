// Comprehensive endpoint testing for field transformation
const testEndpoints = async () => {
  const baseUrl = 'http://localhost:5000';
  
  // Get auth token from browser storage (will need to be provided)
  const token = localStorage.getItem('supabase.auth.token') || 'test-token';
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const endpoints = [
    // Basic endpoints
    { method: 'GET', url: '/api/user/permissions', description: 'User permissions' },
    { method: 'GET', url: '/api/trips', description: 'User trips' },
    { method: 'GET', url: '/api/trips/corporate', description: 'Corporate trips' },
    
    // Test trip creation with camelCase input
    {
      method: 'POST',
      url: '/api/trips',
      description: 'Create trip (camelCase input)',
      body: {
        title: 'Test Field Transformation',
        startDate: new Date('2025-07-01').toISOString(),
        endDate: new Date('2025-07-05').toISOString(),
        userId: 2,
        organizationId: 1,
        isPublic: false,
        sharingEnabled: true,
        sharePermission: 'read-only',
        city: 'Test City'
      }
    }
  ];

  const results = [];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n--- Testing ${endpoint.description} ---`);
      
      const options = {
        method: endpoint.method,
        headers
      };
      
      if (endpoint.body) {
        options.body = JSON.stringify(endpoint.body);
        console.log('Request body:', JSON.stringify(endpoint.body, null, 2));
      }
      
      const response = await fetch(baseUrl + endpoint.url, options);
      const data = await response.text();
      
      console.log(`Status: ${response.status}`);
      console.log('Response:', data.substring(0, 500));
      
      results.push({
        endpoint: endpoint.url,
        method: endpoint.method,
        status: response.status,
        success: response.ok,
        data: data.substring(0, 200)
      });
      
    } catch (error) {
      console.error(`Error testing ${endpoint.url}:`, error.message);
      results.push({
        endpoint: endpoint.url,
        method: endpoint.method,
        error: error.message
      });
    }
  }
  
  console.log('\n=== SUMMARY ===');
  results.forEach(result => {
    console.log(`${result.method} ${result.endpoint}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.status || 'ERROR'})`);
  });
  
  return results;
};

// Run tests if in browser environment
if (typeof window !== 'undefined') {
  testEndpoints();
}

module.exports = { testEndpoints };