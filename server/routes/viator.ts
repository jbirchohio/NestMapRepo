import { Router } from 'express';
import { viatorService } from '../services/viatorService';

const router = Router();

/**
 * Search for bookable activities based on location
 */
router.post('/search', async (req, res) => {
  try {
    console.log('Viator search request body:', req.body);
    
    const { latitude, longitude, activity_name, activityName, startDate, endDate } = req.body;
    
    // Handle both camelCase and snake_case
    const searchName = activityName || activity_name;

    if (!searchName) {
      console.log('Missing activity name. Body keys:', Object.keys(req.body));
      return res.status(400).json({ error: 'Activity name is required' });
    }

    const activities = await viatorService.searchByLocationAndActivity(
      latitude,
      longitude,
      searchName
    );

    res.json({ activities });
  } catch (error) {
    console.error('Viator search error:', error);
    res.status(500).json({ error: 'Failed to search activities' });
  }
});

/**
 * Get activity details
 */
router.get('/product/:productCode', async (req, res) => {
  try {
    const { productCode } = req.params;
    const details = await viatorService.getProductDetails(productCode);
    res.json(details);
  } catch (error) {
    console.error('Product details error:', error);
    res.status(500).json({ error: 'Failed to get product details' });
  }
});

/**
 * Generate affiliate link
 */
router.post('/affiliate-link', async (req, res) => {
  try {
    const { productCode } = req.body;
    const link = viatorService.generateAffiliateLink(productCode);
    res.json({ affiliateLink: link });
  } catch (error) {
    console.error('Affiliate link error:', error);
    res.status(500).json({ error: 'Failed to generate affiliate link' });
  }
});

export default router;