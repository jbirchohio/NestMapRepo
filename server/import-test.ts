import 'dotenv/config';
import express from 'express';

// Test imports one by one
console.log('Testing imports...');

import { authenticate } from './middleware/secureAuth';
console.log('✓ authenticate imported');

import authRoutes from './routes/auth-simple';
console.log('✓ authRoutes imported');

import flightRoutes from './routes/flights';
console.log('✓ flightRoutes imported');

import organizationRoutes from './routes/organizations';
console.log('✓ organizationRoutes imported');

import tripRoutes from './routes/trips';
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
