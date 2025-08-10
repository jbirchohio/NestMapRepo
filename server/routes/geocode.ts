import { Router } from 'express';
import { geocodingService } from '../services/geocodingService';

const router = Router();

/**
 * Geocode a location
 */
router.get('/', async (req, res) => {
  try {
    const { location, city } = req.query;
    
    if (!location) {
      return res.status(400).json({ error: 'Location parameter is required' });
    }
    
    const result = await geocodingService.geocodeLocation(
      location as string,
      city as string | undefined
    );
    
    if (!result) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ error: 'Failed to geocode location' });
  }
});

export default router;