import { Router } from 'express';
import { z } from 'zod';
import { jwtAuthMiddleware } from '../middleware/jwtAuth';
import { expediaService } from '../services/expediaIntegration';
import { logger } from '../utils/logger';

const router = Router();

// Hotel search schema
const hotelSearchSchema = z.object({
  destination: z.string().min(1, 'Destination is required'),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Check-in must be YYYY-MM-DD'),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Check-out must be YYYY-MM-DD'),
  guests: z.number().min(1).max(10).optional().default(2),
  rooms: z.number().min(1).max(5).optional().default(1),
  tripId: z.string().optional()
});

// Search hotels
router.post('/search', jwtAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const params = hotelSearchSchema.parse(req.body);
    
    logger.info('Hotel search request', { userId, destination: params.destination });

    // For now, use mock data with real Expedia URLs
    // In production, you'd use Amadeus or another API here
    const hotels = await expediaService.searchHotels({
      destination: params.destination,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      adults: params.guests,
      rooms: params.rooms
    });

    // Hotel search has been removed
    const hotelsWithTracking = [];

    res.json({ hotels: hotelsWithTracking });
  } catch (error) {
    logger.error('Hotel search error', { error });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid search parameters',
        details: error.errors 
      });
    }
    
    res.status(500).json({ 
      error: 'Hotel search failed',
      fallbackUrl: '#'
    });
  }
});

// Save hotel to trip
router.post('/save', jwtAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { tripId, hotelId, hotelData } = req.body;
    
    // Here you would save the hotel to the trip in your database
    // For now, just acknowledge
    logger.info('Hotel saved to trip', { userId, tripId, hotelId });
    
    res.json({ 
      success: true,
      message: 'Hotel saved to trip' 
    });
  } catch (error) {
    logger.error('Save hotel error', { error });
    res.status(500).json({ error: 'Failed to save hotel' });
  }
});

// Get saved hotels for a trip
router.get('/trip/:tripId', jwtAuthMiddleware, async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user?.id;
    
    // Here you would fetch saved hotels from your database
    // For now, return empty array
    res.json({ hotels: [] });
  } catch (error) {
    logger.error('Get trip hotels error', { error });
    res.status(500).json({ error: 'Failed to get hotels' });
  }
});

export default router;