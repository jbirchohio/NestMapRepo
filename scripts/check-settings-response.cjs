const http = require('http');

// Replace with your actual JWT token
const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE';

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/superadmin/settings',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    console.log('\nResponse:');
    
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed.slice(0, 3), null, 2)); // Show first 3 settings
      
      if (parsed.length > 0) {
        console.log('\nFirst setting structure:');
        const first = parsed[0];
        console.log('Keys:', Object.keys(first));
        console.log('Has camelCase:', 'settingKey' in first);
        console.log('Has snake_case:', 'setting_key' in first);
      }
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();