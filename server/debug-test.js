console.log('Starting debug test...');

try {
  console.log('Testing environment variables...');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('PORT:', process.env.PORT);
  
  console.log('Testing imports...');
  const express = require('express');
  console.log('Express imported successfully');
  
  const app = express();
  console.log('Express app created');
  
  app.get('/test', (req, res) => {
    res.json({ message: 'Test successful' });
  });
  
  const server = app.listen(3001, () => {
    console.log('Test server running on port 3001');
  });
  
  setTimeout(() => {
    server.close(() => {
      console.log('Test server closed');
      process.exit(0);
    });
  }, 2000);
  
} catch (error) {
  console.error('Error in debug test:', error);
  process.exit(1);
}
