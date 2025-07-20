const express = require('express');
const http = require('http');

console.log('🚀 Starting basic JavaScript server...');

const app = express();
const PORT = 3001;
const HOST = 'localhost';

app.use(express.json());

app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Basic JavaScript server is running'
  });
});

const server = http.createServer(app);

server.listen(PORT, HOST, () => {
  console.log(`✅ Basic server running on http://${HOST}:${PORT}`);
  console.log(`📋 Health check: http://${HOST}:${PORT}/health`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

console.log('📝 Basic server setup complete...');
