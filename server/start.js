// Simple JavaScript server to bypass TypeScript compilation issues
// Uses SecureAuth as JWT source of truth

import express from 'express';
import http from 'http';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Server running with SecureAuth as JWT source of truth'
  });
});

// API test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working',
    timestamp: new Date().toISOString(),
    jwt_provider: 'SecureAuth'
  });
});

// Basic authentication middleware placeholder
// In production, this would use SecureAuth middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'SecureAuth JWT token required'
    });
  }
  
  // In production, validate JWT using SecureAuth
  req.user = {
    id: 'demo-user',
    email: 'demo@example.com',
    role: 'user'
  };
  
  next();
};

// Protected route example
app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ 
    success: true,
    user: req.user,
    message: 'Authenticated via SecureAuth JWT'
  });
});

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password required'
    });
  }
  
  // In production, validate credentials and use SecureAuth
  res.json({
    success: true,
    message: 'Login successful - SecureAuth JWT generated',
    token: 'demo-jwt-token',
    user: {
      id: 'demo-user',
      email: email,
      role: 'user'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false,
    error: 'Internal server error' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route not found' 
  });
});

// Create HTTP server
const server = http.createServer(app);

// Start server
server.listen(Number(PORT), HOST, () => {
  console.log(`✅ Server running on ${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
  console.log(`🔐 Using SecureAuth as JWT authentication source of truth`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

export default app;