// Test the health endpoint
const testHealth = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/health');
    const data = await response.text();
    console.log('Health check response:');
    console.log(`Status: ${response.status}`);
    console.log('Body:', data);
  } catch (err) {
    console.error('Error testing health endpoint:', err);
  }
};

// Test the templates endpoint
const testTemplates = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/templates');
    const data = await response.text();
    console.log('\nTemplates endpoint response:');
    console.log(`Status: ${response.status}`);
    console.log('Body:', data);
  } catch (err) {
    console.error('Error testing templates endpoint:', err);
  }
};

// Run tests
const runTests = async () => {
  console.log('Testing server endpoints...');
  await testHealth();
  await testTemplates();
  console.log('\nTests completed.');
};

runTests();
