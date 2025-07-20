import express from 'express';
import http from 'http';

console.log('🚀 Starting basic ES module server...');

const app = express();
const PORT = 3001;
const HOST = 'localhost';

app.use(express.json());

app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Basic ES module server is running'
  });
});

const server = http.createServer(app);

server.listen(PORT, HOST, () => {
  console.log(`✅ Basic ES module server running on http://${HOST}:${PORT}`);
  console.log(`📋 Health check: http://${HOST}:${PORT}/health`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

console.log('📝 Basic ES module server setup complete...');
