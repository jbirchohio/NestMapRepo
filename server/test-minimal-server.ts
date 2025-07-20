import express from 'express';
import http from 'http';

console.log('🚀 Starting minimal test server...');

const app = express();
const PORT = 3001;
const HOST = 'localhost';

// Basic middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Minimal test server is running'
  });
});

// Test API route
app.get('/api/test', (req, res) => {
  console.log('Test API requested');
  res.json({ 
    message: 'Test API working',
    timestamp: new Date().toISOString()
  });
});

// Create server
const server = http.createServer(app);

// Start server
server.listen(PORT, HOST, () => {
  console.log(`✅ Minimal test server running on http://${HOST}:${PORT}`);
  console.log(`📋 Health check: http://${HOST}:${PORT}/health`);
  console.log(`🧪 Test API: http://${HOST}:${PORT}/api/test`);
});

// Error handling
server.on('error', (error: any) => {
  console.error('❌ Server error:', error);
});

// Keep alive
process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

console.log('📝 Server setup complete, waiting for connections...');
