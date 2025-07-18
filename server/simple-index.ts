import 'dotenv/config.js';
import express from 'express';
import cors from 'cors';
import { authenticate } from './middleware/secureAuth.js';
import authRoutes from './routes/auth-simple.js';
import flightRoutes from './routes/flights.js';
import organizationRoutes from './routes/organizations.js';
import tripRoutes from './routes/trips.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/flights', authenticate, flightRoutes);
app.use('/api/organizations', authenticate, organizationRoutes);
app.use('/api/trips', authenticate, tripRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
