import { Router } from 'express';
import authRoutes from './auth';
import usersRoutes from './users';
import tripRoutes from './trips';
import activityRoutes from './activities';
import todosRoutes from './todos';
import notesRoutes from './notes';
import aiRoutes from './ai';
import healthRoutes from './health';
import weatherRoutes from './weather';
import viatorRoutes from './viator';
import sitemapRoutes from './sitemap';
import destinationRoutes from './destinations';
import templateRoutes from './templates';
import creatorRoutes from './creators';
import adminRoutes from './admin';
import checkoutRoutes from './checkout';
import uploadRoutes from './upload';
import webhookRoutes from './webhooks';
// import analyticsRoutes from './analytics'; // Enterprise feature
import monitoringRoutes from './monitoring';
import geocodeRoutes from './geocode';
import budgetRoutes from './budget';

const router = Router();

// Mount consumer route modules
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/trips', tripRoutes);
router.use('/activities', activityRoutes);
router.use('/todos', todosRoutes);
router.use('/notes', notesRoutes);
router.use('/ai', aiRoutes);
router.use('/health', healthRoutes);
router.use('/weather', weatherRoutes);
router.use('/viator', viatorRoutes);
router.use('/destinations', destinationRoutes);
router.use('/templates', templateRoutes);
router.use('/creators', creatorRoutes);
router.use('/admin', adminRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/upload', uploadRoutes);
router.use('/webhooks', webhookRoutes);
// router.use('/analytics', analyticsRoutes); // Enterprise feature
router.use('/monitoring', monitoringRoutes);
router.use('/geocode', geocodeRoutes);
router.use('/budget', budgetRoutes);

// User permissions endpoint - simplified for consumer app
router.get('/user/permissions', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Simple consumer permissions
    const permissions = ['manage_trips', 'view_trips', 'create_activities'];

    res.json({
      permissions,
      role: 'user',
      userId: req.user.id
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get permissions' });
  }
});

// Dashboard stats endpoint - simplified for consumers
router.get('/dashboard-stats', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Return consumer dashboard statistics
  const stats = {
    activeTrips: 0,
    completedTrips: 0,
    upcomingTrips: 0,
    totalActivities: 0
  };

  res.json(stats);
});

// Airport code conversion endpoint with AI
router.post('/locations/airport-code', async (req, res) => {
  try {
    const { cityName } = req.body;

    if (!cityName) {
      return res.status(400).json({ error: 'City name is required' });
    }

    // Check if it's already an airport code
    if (cityName.length === 3 && /^[A-Z]{3}$/i.test(cityName)) {
      return res.json({ airportCode: cityName.toUpperCase() });
    }

    // Use AI to find the nearest major airport
    try {
      const { callOpenAI } = await import('../openai');

      const prompt = `Find the closest major commercial airport to ${cityName}. Consider:
1. If it's a major city with multiple airports, return the main international airport
2. If it's a smaller city, return the nearest major airport with good flight connections
3. Consider practical travel distance - the airport people would actually use

City: ${cityName}

Return ONLY the 3-letter IATA airport code (e.g., LAX, JFK, ORD). Nothing else.`;

      const aiResponse = await callOpenAI(prompt, { temperature: 0.1, max_tokens: 10 });
      const airportCode = aiResponse.trim().toUpperCase().replace(/[^A-Z]/g, '');

      // Validate it's a 3-letter code
      if (/^[A-Z]{3}$/.test(airportCode)) {
        return res.json({ airportCode });
      } else {
        }
    } catch (aiError) {
      }

    // Fallback
    res.json({ airportCode: 'LAX' }); // Default to LAX
  } catch (error) {
    res.status(500).json({ error: 'Failed to convert city to airport code' });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'remvana-api'
  });
});

export default router;