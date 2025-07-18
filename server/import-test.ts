import 'dotenv/config.js';
import express from 'express';

// Test imports one by one
console.log('Testing imports...');

import { authenticate } from './middleware/secureAuth.js';
console.log('✓ authenticate imported');

import authRoutes from './routes/auth-simple.js';
console.log('✓ authRoutes imported');

import flightRoutes from './routes/flights.js';
console.log('✓ flightRoutes imported');

import organizationRoutes from './routes/organizations.js';
console.log('✓ organizationRoutes imported');

import tripRoutes from './routes/trips.js';
console.log('✓ tripRoutes imported');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('Creating server...');

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

console.log('Starting server...');

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
