import { Router } from 'express';
import { z } from 'zod';
import { jwtAuthMiddleware } from '../middleware/jwtAuth';
// Removed expediaService import
import { logger } from '../utils/logger';

const router = Router();

// Package URL generation schema
const packageUrlSchema = z.object({
  origin: z.string().min(1, 'Origin is required'),
  destination: z.string().min(1, 'Destination is required'),
  depart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Departure must be YYYY-MM-DD'),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Return must be YYYY-MM-DD'),
  adults: z.number().min(1).max(6).optional().default(2),
  rooms: z.number().min(1).max(3).optional().default(1),
  tripId: z.string().optional()
});

// Generate package search URL
router.post('/generate-url', jwtAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const params = packageUrlSchema.parse(req.body);
    
    logger.info('Package URL generation', { 
      userId, 
      origin: params.origin, 
      destination: params.destination 
    });

    // Convert city names to airport codes if needed
    let fromCode = params.origin;
    let toCode = params.destination;

    // If not already an airport code, convert it
    if (params.origin.length !== 3 || !/^[A-Z]{3}$/i.test(params.origin)) {
      try {
        const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/locations/airport-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cityName: params.origin })
        });
        const data = await response.json();
        fromCode = data.airportCode || 'LAX';
      } catch (error) {
        logger.error('Airport code conversion failed for origin', { error });
        fromCode = 'LAX'; // Default
      }
    }

    if (params.destination.length !== 3 || !/^[A-Z]{3}$/i.test(params.destination)) {
      try {
        const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/locations/airport-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cityName: params.destination })
        });
        const data = await response.json();
        toCode = data.airportCode || 'NYC';
      } catch (error) {
        logger.error('Airport code conversion failed for destination', { error });
        toCode = 'NYC'; // Default
      }
    }

    // Package search has been removed
    const packageUrl = '#';
    const trackedUrl = '#';

    res.json({ 
      url: trackedUrl,
      savings: { percentage: 0, savings: 0, total: 0 } // Removed calculation
    });
  } catch (error) {
    logger.error('Package URL generation error', { error });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid parameters',
        details: error.errors 
      });
    }
    
    // Fallback URL
    const fallbackUrl = `https://www.expedia.com/Packages?packageType=fh&ftla=${req.body.origin || ''}&ttla=${req.body.destination || ''}`;
    res.json({ url: fallbackUrl });
  }
});

// Get package deals for a destination
router.get('/deals/:destination', async (req, res) => {
  try {
    const { destination } = req.params;
    
    // In production, you might cache popular package deals
    const deals = [
      {
        id: '1',
        title: `${destination} Getaway Package`,
        description: 'Flight + 3 nights hotel',
        originalPrice: 850,
        packagePrice: 650,
        savings: 200,
        percentage: 24
      },
      {
        id: '2', 
        title: `${destination} Week Special`,
        description: 'Flight + 7 nights hotel',
        originalPrice: 1800,
        packagePrice: 1400,
        savings: 400,
        percentage: 22
      }
    ];

    res.json({ deals });
  } catch (error) {
    logger.error('Get package deals error', { error });
    res.status(500).json({ error: 'Failed to get deals' });
  }
});

export default router;